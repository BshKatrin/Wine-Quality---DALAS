import { afterEach, describe, expect, it, vi } from "vitest";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { demoCollection } from "./src/data/demo";
import { ReleaseStore } from "./src/data/release";

const root = resolve(import.meta.dirname);
const hash = (bytes: Buffer | string) =>
  createHash("sha256").update(bytes).digest("hex");
const makeFixture = async (count: number) => {
  const dir = await mkdtemp(join(tmpdir(), "wine-release-test-"));
  const collection = {
    ...demoCollection,
    source: "test",
    name: "Artificial capacity fixture",
    modelName: "Artificial test model",
    wines: Array.from({ length: count }, (_, i) => ({
      ...structuredClone(demoCollection.wines[i % demoCollection.wines.length]),
      id: `wine-fixture-row-${i}`,
    })),
  };
  const bytes = Buffer.from(JSON.stringify(collection));
  const provenance = {
    schemaVersion: 1,
    collectionSha256: hash(bytes),
    datasetSha256: "a".repeat(64),
    modelSha256: "b".repeat(64),
    modelName: collection.modelName,
    modelVersion: "fixture-only",
    dataVersion: "fixture-only",
    sourceRowCount: count * 5,
    eligibleRowCount: count * 5,
    trainCount: count * 4,
    testCount: count,
    testIds: collection.wines.map((wine) => wine.id),
    trainSourceRows: Array.from({ length: count * 4 }, (_, i) => count + i),
    testSourceRows: Array.from({ length: count }, (_, i) => i),
  };
  const collectionPath = join(dir, "collection.json");
  const provenancePath = join(dir, "provenance.json");
  const output = join(dir, "release");
  await writeFile(collectionPath, bytes);
  await writeFile(provenancePath, JSON.stringify(provenance));
  const prepare = () =>
    execFileSync(
      process.execPath,
      [
        "--import",
        "tsx",
        "scripts/prepare-release.mjs",
        "--collection",
        collectionPath,
        "--provenance",
        provenancePath,
        "--output",
        output,
      ],
      { cwd: root, encoding: "utf8" },
    );
  const verify = () =>
    execFileSync(
      process.execPath,
      ["--import", "tsx", "scripts/verify-release.mjs", "--dir", output],
      { cwd: root, encoding: "utf8" },
    );
  return {
    dir,
    collection,
    provenance,
    collectionPath,
    provenancePath,
    output,
    prepare,
    verify,
  };
};
const folders: string[] = [];
afterEach(async () => {
  vi.unstubAllGlobals();
  await Promise.all(
    folders.splice(0).map((dir) => rm(dir, { recursive: true, force: true })),
  );
});

describe("static release", () => {
  it("opens a small first page and carries its explanation cache into the full store", async () => {
    const f = await makeFixture(65);
    folders.push(f.dir);
    f.prepare();
    f.verify();
    let finish!: () => void;
    const gate = new Promise<void>((resolve) => {
      finish = resolve;
    });
    let previewReady!: (store: ReleaseStore) => void;
    const ready = new Promise<ReleaseStore>((resolve) => {
      previewReady = resolve;
    });
    const requested: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        requested.push(url);
        if (url.includes("/catalogue.")) await gate;
        const file =
          url === "/release/manifest.json"
            ? join(f.output, "manifest.json")
            : join(f.output, "assets", url.split("/").at(-1)!);
        return new Response(await readFile(file), {
          headers: { "content-type": "application/json" },
        });
      }),
    );
    const complete = ReleaseStore.open(previewReady);
    const preview = await ready;
    expect(preview.complete).toBe(false);
    expect(preview.collection.wines).toHaveLength(12);
    const id = preview.collection.wines[0].id;
    await preview.wine(id);
    finish();
    const store = await complete;
    expect(store.complete).toBe(true);
    expect(store.collection.wines).toHaveLength(65);
    await store.wine(id);
    expect(requested.filter((url) => url.includes("/details-"))).toHaveLength(
      1,
    );
  });
  it("packages and verifies a complete 9,329-wine fixture with lazy bounded requests", async () => {
    const f = await makeFixture(9329);
    folders.push(f.dir);
    expect(f.prepare()).toContain("9329 held-out wines");
    expect(f.verify()).toContain("9329 complete held-out wines");
    const manifest = JSON.parse(
      await readFile(join(f.output, "manifest.json"), "utf8"),
    );
    expect(manifest.detailChunks).toHaveLength(Math.ceil(9329 / 64));
    expect(manifest.index.bytes).toBeLessThan(8 * 1024 * 1024);
    const requested: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        requested.push(url);
        const file =
          url === "/release/manifest.json"
            ? join(f.output, "manifest.json")
            : join(f.output, "assets", url.split("/").at(-1)!);
        return new Response(await readFile(file), {
          headers: { "content-type": "application/json" },
        });
      }),
    );
    const store = await ReleaseStore.open();
    expect(store.collection.wines).toHaveLength(9329);
    expect(requested).toHaveLength(2);
    expect(requested.some((url) => url.includes("details"))).toBe(false);
    await store.wine("wine-fixture-row-0");
    expect(requested).toHaveLength(3);
    await store.wine("wine-fixture-row-1");
    expect(requested).toHaveLength(3);
    await store.context("Alcohol");
    expect(requested).toHaveLength(4);
    for (const i of [64, 128, 192, 256])
      await store.wine(`wine-fixture-row-${i}`);
    await store.wine("wine-fixture-row-0");
    expect(requested.filter((url) => url.includes("details-000"))).toHaveLength(
      2,
    );
  }, 30000);
  it("rejects a demo, an incomplete ID list, and a changed export checksum", async () => {
    const f = await makeFixture(3);
    folders.push(f.dir);
    const demo = { ...f.collection, source: "demo" };
    const demoBytes = Buffer.from(JSON.stringify(demo));
    await writeFile(f.collectionPath, demoBytes);
    await writeFile(
      f.provenancePath,
      JSON.stringify({ ...f.provenance, collectionSha256: hash(demoBytes) }),
    );
    expect(f.prepare).toThrow(/demonstration data cannot be published/);
    await writeFile(f.collectionPath, JSON.stringify(f.collection));
    await writeFile(
      f.provenancePath,
      JSON.stringify({
        ...f.provenance,
        testIds: f.provenance.testIds.slice(1),
      }),
    );
    expect(f.prepare).toThrow(/testIds must cover every test wine/);
    await writeFile(
      f.provenancePath,
      JSON.stringify({ ...f.provenance, collectionSha256: "c".repeat(64) }),
    );
    expect(f.prepare).toThrow(/collection checksum/);
  });
});
