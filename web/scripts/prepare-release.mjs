import { createHash } from "node:crypto";
import { readFile, mkdir, rm, writeFile } from "node:fs/promises";
import { resolve, join } from "node:path";
import { parseCollection, collectionMetrics } from "../src/data/collection.ts";

const root = resolve(import.meta.dirname, "..");
const sha = (bytes) => createHash("sha256").update(bytes).digest("hex");
const isHash = (value) =>
  typeof value === "string" && /^[a-f0-9]{64}$/i.test(value);
const fail = (message) => {
  throw new Error(`Release rejected: ${message}`);
};
const flags = Object.fromEntries(
  process.argv
    .slice(2)
    .flatMap((value, index, args) =>
      value.startsWith("--") ? [[value.slice(2), args[index + 1]]] : [],
    ),
);
const collectionPath = resolve(
  root,
  flags.collection ??
    process.env.WINE_COLLECTION ??
    "../artifacts/web/test-wines.json",
);
const provenancePath = resolve(
  root,
  flags.provenance ??
    process.env.WINE_PROVENANCE ??
    "../artifacts/web/provenance.json",
);
const output = resolve(root, flags.output ?? "public/release");
const writeAsset = async (dir, stem, data) => {
  const bytes = Buffer.from(JSON.stringify(data));
  const hash = sha(bytes).slice(0, 16);
  const name = `${stem}.${hash}.json`;
  await writeFile(join(dir, name), bytes);
  return {
    url: `/release/assets/${name}`,
    bytes: bytes.length,
    sha256: sha(bytes),
  };
};

try {
  const raw = await readFile(collectionPath);
  const collection = parseCollection(JSON.parse(raw.toString("utf8")));
  if (collection.source !== "test")
    fail("source must be test; demonstration data cannot be published");
  const provenance = JSON.parse(await readFile(provenancePath, "utf8"));
  if (provenance.schemaVersion !== 1)
    fail("provenance schemaVersion must be 1");
  for (const field of ["collectionSha256", "datasetSha256", "modelSha256"]) {
    if (!isHash(provenance[field])) fail(`${field} must be a SHA-256 hash`);
  }
  if (sha(raw) !== provenance.collectionSha256.toLowerCase())
    fail("collection checksum does not match provenance");
  for (const field of ["modelVersion", "dataVersion"]) {
    if (typeof provenance[field] !== "string" || !provenance[field].trim())
      fail(`${field} is required`);
  }
  if (provenance.modelName !== collection.modelName)
    fail("modelName differs from collection");
  if (!Number.isSafeInteger(provenance.trainCount) || provenance.trainCount < 1)
    fail("trainCount must be positive");
  if (
    !Number.isSafeInteger(provenance.testCount) ||
    provenance.testCount !== collection.wines.length
  )
    fail("testCount differs from collection size");
  if (
    !Array.isArray(provenance.testIds) ||
    provenance.testIds.length !== collection.wines.length
  )
    fail("testIds must cover every test wine");
  for (const [field, count] of [
    ["trainSourceRows", provenance.trainCount],
    ["testSourceRows", provenance.testCount],
  ]) {
    if (
      !Array.isArray(provenance[field]) ||
      provenance[field].length !== count ||
      !provenance[field].every(
        (row) => Number.isSafeInteger(row) && row >= 0,
      ) ||
      new Set(provenance[field]).size !== count
    )
      fail(
        `${field} must contain distinct source row numbers for the full split`,
      );
  }
  const trainingRows = new Set(provenance.trainSourceRows);
  for (const row of provenance.testSourceRows)
    if (trainingRows.has(row)) fail(`train/test source-row overlap: ${row}`);
  const splitIds = new Set(provenance.testIds);
  if (splitIds.size !== provenance.testIds.length)
    fail("duplicate IDs in testIds");
  collection.wines.forEach((wine, index) => {
    if (wine.id !== provenance.testIds[index])
      fail(`testIds differ at row ${index + 1}`);
    if (!wine.id.endsWith(`-row-${provenance.testSourceRows[index]}`))
      fail(`wine ID/source-row mismatch at row ${index + 1}`);
  });
  if (provenance.trainIds) {
    if (
      !Array.isArray(provenance.trainIds) ||
      provenance.trainIds.length !== provenance.trainCount
    )
      fail("trainIds count mismatch");
    for (const id of provenance.trainIds)
      if (splitIds.has(id)) fail(`train/test overlap: ${id}`);
  }
  if (
    !Number.isSafeInteger(provenance.eligibleRowCount) ||
    provenance.trainCount + provenance.testCount !== provenance.eligibleRowCount
  )
    fail("train/test counts must cover every eligible row");
  if (
    !Number.isSafeInteger(provenance.sourceRowCount) ||
    provenance.sourceRowCount < provenance.eligibleRowCount ||
    [...provenance.trainSourceRows, ...provenance.testSourceRows].some(
      (row) => row >= provenance.sourceRowCount,
    )
  )
    fail("source row count or bounds mismatch");
  // Model and data versions are carried into every release manifest alongside verified checksums.
  const assetDir = join(output, "assets");
  await rm(output, { recursive: true, force: true });
  await mkdir(assetDir, { recursive: true });
  const wines = collection.wines;
  const chunks = [];
  const split = await writeAsset(assetDir, "split", {
    trainSourceRows: provenance.trainSourceRows,
    testSourceRows: provenance.testSourceRows,
    testIds: provenance.testIds,
  });
  const chunkSize = 64;
  for (let start = 0; start < wines.length; start += chunkSize) {
    chunks.push(
      await writeAsset(
        assetDir,
        `details-${String(start / chunkSize).padStart(3, "0")}`,
        wines.slice(start, start + chunkSize),
      ),
    );
  }
  const features = new Map();
  for (const wine of wines) {
    for (const item of wine.shap) {
      if (typeof item.value !== "number") continue;
      if (!features.has(item.feature)) features.set(item.feature, []);
      features.get(item.feature).push({
        id: wine.id,
        name: wine.name,
        x: item.value,
        y: item.contribution,
      });
    }
  }
  const contexts = {};
  for (const [feature, points] of features) {
    const name = `context-${sha(Buffer.from(feature)).slice(0, 12)}`;
    const stride = Math.max(1, Math.ceil(points.length / 400));
    contexts[feature] = await writeAsset(
      assetDir,
      name,
      points.filter((_, index) => index % stride === 0),
    );
  }
  const index = {
    schemaVersion: 1,
    name: collection.name,
    source: collection.source,
    modelName: collection.modelName,
    description: collection.description,
    metrics: collectionMetrics(wines),
    // Fixed stride is stable across builds; every record remains in the catalogue for browsing.
    plotIds: wines
      .filter((_, i) => i % Math.max(1, Math.ceil(wines.length / 400)) === 0)
      .map((w) => w.id),
    wines: wines.map(({ shap: _shap, ...wine }, index) => ({
      ...wine,
      detailChunk: Math.floor(index / chunkSize),
    })),
  };
  const indexAsset = await writeAsset(assetDir, "catalogue", index);
  // Match the default catalogue order so the first cards stay in place when
  // the full index arrives. Exact numeric values remain unchanged.
  const previewAsset = await writeAsset(assetDir, "preview", {
    ...index,
    plotIds: [],
    wines: [...index.wines]
      .sort(
        (a, b) =>
          b.predictedRating - a.predictedRating || a.id.localeCompare(b.id),
      )
      .slice(0, 12),
  });
  const manifest = {
    schemaVersion: 1,
    releaseId: sha(
      Buffer.from(
        JSON.stringify({
          collection: provenance.collectionSha256,
          model: provenance.modelSha256,
          data: provenance.datasetSha256,
          split: provenance.testSourceRows,
        }),
      ),
    ).slice(0, 20),
    splitSha256: sha(
      Buffer.from(
        JSON.stringify({
          train: provenance.trainSourceRows,
          test: provenance.testSourceRows,
        }),
      ),
    ),
    collectionSha256: provenance.collectionSha256,
    datasetSha256: provenance.datasetSha256,
    modelSha256: provenance.modelSha256,
    modelName: provenance.modelName,
    modelVersion: provenance.modelVersion,
    dataVersion: provenance.dataVersion,
    sourceRowCount: provenance.sourceRowCount,
    eligibleRowCount: provenance.eligibleRowCount,
    featureCount: provenance.featureCount,
    testMetrics: provenance.testMetrics,
    limitations: provenance.limitations,
    trainCount: provenance.trainCount,
    testCount: provenance.testCount,
    split,
    index: indexAsset,
    preview: previewAsset,
    detailChunks: chunks,
    contexts,
  };
  await writeFile(join(output, "manifest.json"), JSON.stringify(manifest));
  console.log(
    `Prepared release ${manifest.releaseId}: ${wines.length} held-out wines, ${chunks.length} detail chunks, ${features.size} numeric contexts; catalogue ${Math.round(indexAsset.bytes / 1024)} KiB.`,
  );
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
