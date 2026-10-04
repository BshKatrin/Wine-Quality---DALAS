import { afterEach, expect, test } from "vitest";
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve, join, basename } from "node:path";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { demoCollection } from "./src/data/demo";

const folders: string[] = [];
afterEach(() =>
  folders
    .splice(0)
    .forEach((folder) => rmSync(folder, { recursive: true, force: true })),
);
const hash = (data: string) => createHash("sha256").update(data).digest("hex");
function fixture() {
  const folder = mkdtempSync(join(tmpdir(), "wine-release-"));
  folders.push(folder);
  const collection = {
    ...demoCollection,
    source: "test",
    wines: demoCollection.wines
      .slice(0, 2)
      .map((wine, i) => ({ ...wine, id: `fixture-row-${i + 2}` })),
  };
  const raw = JSON.stringify(collection);
  const provenance = {
    schemaVersion: 1,
    collectionSha256: hash(raw),
    datasetSha256: "a".repeat(64),
    modelSha256: "b".repeat(64),
    modelName: collection.modelName,
    modelVersion: "test-fixture",
    dataVersion: "test-fixture",
    sourceRowCount: 4,
    eligibleRowCount: 4,
    trainCount: 2,
    testCount: 2,
    trainSourceRows: [0, 1],
    testSourceRows: [2, 3],
    testIds: collection.wines.map((wine) => wine.id),
  };
  const input = join(folder, "collection.json"),
    metadata = join(folder, "provenance.json"),
    output = join(folder, "release");
  writeFileSync(input, raw);
  writeFileSync(metadata, JSON.stringify(provenance));
  return { input, metadata, output, collection, provenance };
}
function run(script: string, args: string[]) {
  return spawnSync(
    process.execPath,
    ["--import", "tsx", resolve("scripts", script), ...args],
    { encoding: "utf8" },
  );
}
function prepare(f: ReturnType<typeof fixture>) {
  return run("prepare-release.mjs", [
    "--collection",
    f.input,
    "--provenance",
    f.metadata,
    "--output",
    f.output,
  ]);
}

test("static release verifies without original export or training files; stale summaries fail", () => {
  const f = fixture();
  expect(prepare(f).status).toBe(0);
  rmSync(f.input);
  rmSync(f.metadata);
  expect(run("verify-release.mjs", ["--dir", f.output]).status).toBe(0);
  const manifestPath = join(f.output, "manifest.json");
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  const index = JSON.parse(
    readFileSync(
      join(f.output, "assets", basename(manifest.index.url)),
      "utf8",
    ),
  );
  index.wines[0].predictedRating += 0.1;
  const changed = JSON.stringify(index),
    digest = hash(changed),
    name = `catalogue.${digest.slice(0, 16)}.json`;
  writeFileSync(join(f.output, "assets", name), changed);
  manifest.index = {
    url: `/release/assets/${name}`,
    sha256: digest,
    bytes: Buffer.byteLength(changed),
  };
  writeFileSync(manifestPath, JSON.stringify(manifest));
  const result = run("verify-release.mjs", ["--dir", f.output]);
  expect(result.status).not.toBe(0);
  expect(result.stderr).toContain("catalogue metadata mismatch");
});
test("release packaging rejects overlapping training rows and incomplete coverage", () => {
  const f = fixture();
  f.provenance.trainSourceRows = [0, 2];
  writeFileSync(f.metadata, JSON.stringify(f.provenance));
  expect(prepare(f).stderr).toContain("overlap");
  f.provenance.trainSourceRows = [0, 1];
  f.provenance.eligibleRowCount = 5;
  writeFileSync(f.metadata, JSON.stringify(f.provenance));
  expect(prepare(f).stderr).toContain("every eligible row");
});
test("a self-consistent preview checksum cannot hide stale first-page metadata", () => {
  const f = fixture();
  expect(prepare(f).status).toBe(0);
  const manifestPath = join(f.output, "manifest.json");
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  const preview = JSON.parse(
    readFileSync(
      join(f.output, "assets", basename(manifest.preview.url)),
      "utf8",
    ),
  );
  preview.wines[0].name = "Changed first-page metadata";
  const changed = JSON.stringify(preview);
  const digest = hash(changed);
  const name = `preview.${digest.slice(0, 16)}.json`;
  writeFileSync(join(f.output, "assets", name), changed);
  manifest.preview = {
    url: `/release/assets/${name}`,
    sha256: digest,
    bytes: Buffer.byteLength(changed),
  };
  writeFileSync(manifestPath, JSON.stringify(manifest));
  const result = run("verify-release.mjs", ["--dir", f.output]);
  expect(result.status).not.toBe(0);
  expect(result.stderr).toContain("first-page preview differs");
});
test("production refuses missing releases and demo data", () => {
  const f = fixture();
  expect(run("verify-release.mjs", ["--dir", f.output]).status).not.toBe(0);
  writeFileSync(f.input, JSON.stringify({ ...f.collection, source: "demo" }));
  expect(prepare(f).stderr).toContain("demonstration data cannot be published");
});
