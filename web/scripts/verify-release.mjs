import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve, basename } from "node:path";
import { parseCollection, collectionMetrics } from "../src/data/collection.ts";

const root = resolve(import.meta.dirname, "..");
const flag = process.argv.indexOf("--dir");
const dir = resolve(root, flag < 0 ? "public/release" : process.argv[flag + 1]);
const sha = (bytes) => createHash("sha256").update(bytes).digest("hex");
const fail = (message) => {
  throw new Error(`Release verification failed: ${message}`);
};
try {
  const manifest = JSON.parse(
    await readFile(resolve(dir, "manifest.json"), "utf8"),
  );
  if (
    manifest.schemaVersion !== 1 ||
    !manifest.releaseId ||
    !manifest.modelVersion ||
    !manifest.dataVersion ||
    !Array.isArray(manifest.detailChunks) ||
    !manifest.detailChunks.length ||
    !manifest.index ||
    !manifest.preview ||
    !manifest.split ||
    !manifest.contexts
  )
    fail("manifest is incomplete");
  for (const field of ["collectionSha256", "datasetSha256", "modelSha256"])
    if (!/^[a-f0-9]{64}$/.test(manifest[field])) fail(`${field} is invalid`);
  const asset = async (ref) => {
    if (
      !ref ||
      !/^\/release\/assets\/[a-z0-9-]+\.[a-f0-9]{16}\.json$/.test(ref.url)
    )
      fail("invalid asset path");
    const bytes = await readFile(resolve(dir, "assets", basename(ref.url)));
    if (
      bytes.length !== ref.bytes ||
      sha(bytes) !== ref.sha256 ||
      !basename(ref.url).endsWith(`.${ref.sha256.slice(0, 16)}.json`)
    )
      fail(`asset checksum mismatch: ${ref.url}`);
    return JSON.parse(bytes.toString("utf8"));
  };
  const index = await asset(manifest.index);
  const preview = await asset(manifest.preview);
  const split = await asset(manifest.split);
  const details = (await Promise.all(manifest.detailChunks.map(asset))).flat();
  const collection = parseCollection({ ...index, wines: details });
  if (
    collection.source !== "test" ||
    collection.modelName !== manifest.modelName ||
    collection.wines.length !== manifest.testCount ||
    index.wines.length !== details.length
  )
    fail("test collection or count mismatch");
  if (
    !Array.isArray(split.trainSourceRows) ||
    split.trainSourceRows.length !== manifest.trainCount ||
    !Array.isArray(split.testSourceRows) ||
    split.testSourceRows.length !== manifest.testCount ||
    !Array.isArray(split.testIds) ||
    split.testIds.length !== manifest.testCount
  )
    fail("split coverage mismatch");
  if (
    !Number.isSafeInteger(manifest.eligibleRowCount) ||
    manifest.trainCount + manifest.testCount !== manifest.eligibleRowCount ||
    !Number.isSafeInteger(manifest.sourceRowCount) ||
    manifest.sourceRowCount < manifest.eligibleRowCount ||
    [...split.trainSourceRows, ...split.testSourceRows].some(
      (row) =>
        !Number.isSafeInteger(row) || row < 0 || row >= manifest.sourceRowCount,
    )
  )
    fail("eligible row coverage or source row bounds mismatch");
  const trainRows = new Set(split.trainSourceRows);
  const testRows = new Set(split.testSourceRows);
  if (
    trainRows.size !== manifest.trainCount ||
    testRows.size !== manifest.testCount ||
    split.testSourceRows.some((row) => trainRows.has(row))
  )
    fail("split rows overlap or repeat");
  if (
    sha(
      Buffer.from(
        JSON.stringify({
          train: split.trainSourceRows,
          test: split.testSourceRows,
        }),
      ),
    ) !== manifest.splitSha256
  )
    fail("split checksum mismatch");
  for (let i = 0; i < details.length; i++) {
    if (
      index.wines[i].id !== details[i].id ||
      index.wines[i].detailChunk !== Math.floor(i / 64)
    )
      fail(`catalogue/detail mismatch at wine ${i + 1}`);
    const { detailChunk: _chunk, ...summary } = index.wines[i];
    const { shap: _shap, ...actual } = details[i];
    if (JSON.stringify(summary) !== JSON.stringify(actual))
      fail(`catalogue metadata mismatch at wine ${i + 1}`);
    if (
      split.testIds[i] !== details[i].id ||
      !details[i].id.endsWith(`-row-${split.testSourceRows[i]}`)
    )
      fail(`split ID/source-row mismatch at wine ${i + 1}`);
  }
  const metrics = collectionMetrics(details);
  for (const key of ["mae", "bias", "within"])
    if (
      !Number.isFinite(index.metrics?.[key]) ||
      Math.abs(index.metrics[key] - metrics[key]) > 1e-12
    )
      fail(`metric mismatch: ${key}`);
  const plotIds = details
    .filter((_, i) => i % Math.max(1, Math.ceil(details.length / 400)) === 0)
    .map((wine) => wine.id);
  if (JSON.stringify(index.plotIds) !== JSON.stringify(plotIds))
    fail("rating plot sample mismatch");
  const expectedPreview = {
    ...index,
    plotIds: [],
    wines: [...index.wines]
      .sort(
        (a, b) =>
          b.predictedRating - a.predictedRating || a.id.localeCompare(b.id),
      )
      .slice(0, 12),
  };
  if (JSON.stringify(preview) !== JSON.stringify(expectedPreview))
    fail("first-page preview differs from the full catalogue");
  const expectedContexts = new Map();
  for (const wine of details)
    for (const item of wine.shap) {
      if (typeof item.value !== "number") continue;
      if (!expectedContexts.has(item.feature))
        expectedContexts.set(item.feature, []);
      expectedContexts.get(item.feature).push({
        id: wine.id,
        name: wine.name,
        x: item.value,
        y: item.contribution,
      });
    }
  if (Object.keys(manifest.contexts).length !== expectedContexts.size)
    fail("numeric feature context coverage mismatch");
  for (const [feature, points] of expectedContexts) {
    const ref = manifest.contexts[feature];
    const stride = Math.max(1, Math.ceil(points.length / 400));
    const sampled = points.filter((_, index) => index % stride === 0);
    if (!ref || JSON.stringify(await asset(ref)) !== JSON.stringify(sampled))
      fail(`feature context mismatch: ${feature}`);
  }
  console.log(
    `Verified release ${manifest.releaseId}: ${details.length} complete held-out wines.`,
  );
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
