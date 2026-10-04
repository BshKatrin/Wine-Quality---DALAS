import type { Collection, Wine } from "./types";

export interface AssetRef {
  url: string;
  bytes: number;
  sha256: string;
}
export interface ContextPoint {
  id: string;
  name: string;
  x: number;
  y: number;
}
export interface ReleaseManifest {
  schemaVersion: 1;
  releaseId: string;
  modelName: string;
  modelVersion: string;
  dataVersion: string;
  testCount: number;
  index: AssetRef;
  preview: AssetRef;
  detailChunks: AssetRef[];
  contexts: Record<string, AssetRef>;
}
interface IndexedWine extends Omit<Wine, "shap"> {
  detailChunk: number;
}
export interface CatalogueIndex extends Omit<Collection, "wines"> {
  wines: IndexedWine[];
  metrics: { mae: number; bias: number; within: number };
  plotIds: string[];
}
const getJson = async <T>(url: string, options?: RequestInit): Promise<T> => {
  const response = await fetch(url, options);
  if (!response.ok)
    throw new Error(
      `Could not load data (${response.status}). Please try again.`,
    );
  const type = response.headers.get("content-type") ?? "";
  if (!type.includes("json"))
    throw new Error("The data file was unavailable. Please try again.");
  return response.json() as Promise<T>;
};
const checkRef = (asset: AssetRef) => {
  if (
    !asset ||
    !/^\/release\/assets\/[a-z0-9-]+\.[a-f0-9]{16}\.json$/.test(asset.url)
  )
    throw new Error("This release points to an invalid data file.");
};
export class ReleaseStore {
  readonly manifest: ReleaseManifest;
  readonly collection: Collection;
  readonly metrics: CatalogueIndex["metrics"];
  readonly plotWines: Wine[];
  readonly complete: boolean;
  private chunks: Map<number, Wine[]> = new Map();
  private contexts: Map<string, ContextPoint[]> = new Map();
  private indexed: Map<string, IndexedWine>;

  private constructor(
    manifest: ReleaseManifest,
    index: CatalogueIndex,
    complete = true,
  ) {
    this.manifest = manifest;
    this.complete = complete;
    this.collection = {
      ...index,
      wines: index.wines.map(({ detailChunk: _chunk, ...wine }) => ({
        ...wine,
        shap: [],
      })),
    };
    this.metrics = index.metrics;
    this.indexed = new Map(index.wines.map((wine) => [wine.id, wine]));
    const byId = new Map(this.collection.wines.map((wine) => [wine.id, wine]));
    this.plotWines = index.plotIds.flatMap((id) =>
      byId.get(id) ? [byId.get(id)!] : [],
    );
  }
  static async open(
    onPreview?: (store: ReleaseStore) => void,
    signal?: AbortSignal,
    initial?: ReleaseStore | null,
  ): Promise<ReleaseStore> {
    const manifest = await getJson<ReleaseManifest>("/release/manifest.json", {
      signal,
    });
    if (
      manifest.schemaVersion !== 1 ||
      !Array.isArray(manifest.detailChunks) ||
      !manifest.index ||
      !manifest.preview ||
      !manifest.contexts
    )
      throw new Error("The published collection is incomplete.");
    checkRef(manifest.index);
    const validateIndex = (index: CatalogueIndex, count: number) => {
      if (
        index.schemaVersion !== 1 ||
        index.source !== "test" ||
        index.modelName !== manifest.modelName ||
        !Array.isArray(index.wines) ||
        index.wines.length !== count ||
        !index.metrics ||
        !Array.isArray(index.plotIds)
      )
        throw new Error("The published collection is incomplete.");
      if (
        new Set(index.wines.map((wine) => wine.id)).size !== index.wines.length
      )
        throw new Error("The published collection has duplicate wines.");
    };
    let preview =
      initial?.manifest.releaseId === manifest.releaseId &&
      initial.manifest.preview.sha256 === manifest.preview.sha256
        ? initial
        : undefined;
    if (onPreview && !preview) {
      checkRef(manifest.preview);
      const firstPage = await getJson<CatalogueIndex>(manifest.preview.url, {
        signal,
      });
      validateIndex(firstPage, Math.min(12, manifest.testCount));
      preview = new ReleaseStore(manifest, firstPage, false);
      onPreview(preview);
    }
    const index = await getJson<CatalogueIndex>(manifest.index.url, {
      signal,
      priority: "low",
    });
    validateIndex(index, manifest.testCount);
    const store = new ReleaseStore(manifest, index);
    if (preview) {
      // Preserve explanations opened while the catalogue was downloading.
      store.chunks = preview.chunks;
      store.contexts = preview.contexts;
    }
    return store;
  }
  static fromPreview(
    manifest: ReleaseManifest,
    index: CatalogueIndex,
  ): ReleaseStore {
    return new ReleaseStore(manifest, index, false);
  }
  async wine(id: string): Promise<Wine> {
    const meta = this.indexed.get(id);
    if (!meta) throw new Error("This wine is not in the collection.");
    const chunk = meta.detailChunk;
    if (
      !Number.isSafeInteger(chunk) ||
      chunk < 0 ||
      chunk >= this.manifest.detailChunks.length
    )
      throw new Error("This wine’s explanation is unavailable.");
    let wines = this.chunks.get(chunk);
    if (!wines) {
      const asset = this.manifest.detailChunks[chunk];
      checkRef(asset);
      wines = await getJson<Wine[]>(asset.url);
      if (!Array.isArray(wines) || !wines.some((wine) => wine.id === id))
        throw new Error("This wine’s explanation is unavailable.");
      this.chunks.set(chunk, wines);
      if (this.chunks.size > 4)
        this.chunks.delete(this.chunks.keys().next().value!);
    } else {
      this.chunks.delete(chunk);
      this.chunks.set(chunk, wines);
    }
    return wines.find((wine) => wine.id === id)!;
  }
  async context(feature: string): Promise<ContextPoint[]> {
    const cached = this.contexts.get(feature);
    if (cached) {
      this.contexts.delete(feature);
      this.contexts.set(feature, cached);
      return cached;
    }
    const asset = this.manifest.contexts[feature];
    if (!asset) return [];
    checkRef(asset);
    const points = await getJson<ContextPoint[]>(asset.url);
    if (!Array.isArray(points))
      throw new Error("Feature comparison is unavailable.");
    this.contexts.set(feature, points);
    if (this.contexts.size > 2)
      this.contexts.delete(this.contexts.keys().next().value!);
    return points;
  }
}
