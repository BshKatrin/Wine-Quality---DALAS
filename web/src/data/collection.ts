import { WINE_TYPES } from "./types";
import type { Collection, Filters, SortKey, Wine } from "./types";

const isObject = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === "object" && !Array.isArray(v);
const isNumber = (v: unknown): v is number =>
  typeof v === "number" && Number.isFinite(v);
const isText = (v: unknown): v is string =>
  typeof v === "string" && v.trim().length > 0 && v.length <= 1000;
export function parseCollection(input: unknown): Collection {
  if (
    !isObject(input) ||
    input.schemaVersion !== 1 ||
    !["demo", "test"].includes(String(input.source)) ||
    !isText(input.name) ||
    !isText(input.modelName) ||
    typeof input.description !== "string"
  )
    throw new Error(
      "This file is not a wine collection. Use the downloadable JSON example as a guide.",
    );
  if (
    !Array.isArray(input.wines) ||
    !input.wines.length ||
    input.wines.length > 100000
  )
    throw new Error("A collection must contain between 1 and 100,000 wines.");
  const ids = new Set<string>();
  for (const [i, value] of input.wines.entries()) {
    const label = `Wine ${i + 1}`;
    if (!isObject(value)) throw new Error(`${label} must be an object.`);
    for (const key of ["id", "name", "producer", "country", "region"])
      if (!isText(value[key])) throw new Error(`${label}: ${key} is required.`);
    if (ids.has(String(value.id)))
      throw new Error(`${label}: duplicate ID ${value.id}.`);
    ids.add(String(value.id));
    if (!WINE_TYPES.includes(value.type as Wine["type"]))
      throw new Error(`${label}: unsupported wine type.`);
    if (
      value.year !== null &&
      (!isNumber(value.year) ||
        !Number.isInteger(value.year) ||
        value.year < 1800 ||
        value.year > 2100)
    )
      throw new Error(`${label}: vintage must be a year or null.`);
    if (!Array.isArray(value.grapes) || !value.grapes.every(isText))
      throw new Error(`${label}: grapes must be a list of names.`);
    if (!isNumber(value.priceUsd) || value.priceUsd < 0 || value.priceUsd > 1e7)
      throw new Error(`${label}: priceUsd must be a nonnegative number.`);
    if (
      value.alcohol !== null &&
      (!isNumber(value.alcohol) || value.alcohol < 0 || value.alcohol > 100)
    )
      throw new Error(`${label}: alcohol must be a percentage or null.`);
    for (const key of ["actualRating", "predictedRating", "baseValue"])
      if (!isNumber(value[key]))
        throw new Error(`${label}: ${key} must be a finite number.`);
    if (
      (value.actualRating as number) < 1 ||
      (value.actualRating as number) > 5
    )
      throw new Error(`${label}: actualRating must be on the 1–5 scale.`);
    if (
      (value.predictedRating as number) < 0 ||
      (value.predictedRating as number) > 6 ||
      (value.baseValue as number) < 0 ||
      (value.baseValue as number) > 6
    )
      throw new Error(
        `${label}: this browser expects predictions in rating units, not probabilities or adjusted ratings.`,
      );
    if (
      !Array.isArray(value.shap) ||
      !value.shap.length ||
      value.shap.length > 2000
    )
      throw new Error(
        `${label}: supply 1 to 2,000 SHAP feature contributions.`,
      );
    const features = new Set<string>();
    for (const s of value.shap) {
      if (
        !isObject(s) ||
        !isText(s.feature) ||
        !isText(s.group) ||
        !isNumber(s.contribution) ||
        !(isText(s.value) || isNumber(s.value))
      )
        throw new Error(
          `${label}: each contribution needs feature, value, group, and a numeric contribution.`,
        );
      if (s.imputed !== undefined && typeof s.imputed !== "boolean")
        throw new Error(`${label}: imputed must be a boolean when supplied.`);
      if (features.has(s.feature))
        throw new Error(`${label}: duplicate SHAP feature ${s.feature}.`);
      features.add(s.feature);
    }
    const sum = (value.shap as Wine["shap"]).reduce(
      (n, s) => n + s.contribution,
      value.baseValue as number,
    );
    if (
      !Number.isFinite(sum) ||
      Math.abs(sum - (value.predictedRating as number)) > 0.002
    )
      throw new Error(
        `${label}: the SHAP base value plus contributions must equal its prediction (within 0.002 stars).`,
      );
  }
  return input as unknown as Collection;
}
export function filterWines(
  wines: Wine[],
  filters: Filters,
  sort: SortKey,
  saved: string[],
) {
  const searchable = (value: string) =>
    value
      .replaceAll("_", " ")
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .toLocaleLowerCase();
  const q = searchable(filters.query).trim();
  const filtered = wines.filter(
    (w) =>
      (!q ||
        searchable(
          [w.name, w.producer, w.country, w.region, ...w.grapes].join(" "),
        ).includes(q)) &&
      (!filters.types.length || filters.types.includes(w.type)) &&
      (!filters.country || w.country === filters.country) &&
      w.priceUsd <= filters.maxPrice &&
      (!filters.savedOnly || saved.includes(w.id)) &&
      (filters.error === "all" ||
        (filters.error === "close"
          ? Math.abs(w.predictedRating - w.actualRating) <= 0.2 + 1e-9
          : Math.abs(w.predictedRating - w.actualRating) > 0.2 + 1e-9)),
  );
  const comparators: Record<SortKey, (a: Wine, b: Wine) => number> = {
    predicted: (a, b) => b.predictedRating - a.predictedRating,
    actual: (a, b) => b.actualRating - a.actualRating,
    "price-low": (a, b) => a.priceUsd - b.priceUsd,
    "price-high": (a, b) => b.priceUsd - a.priceUsd,
    "error-low": (a, b) =>
      Math.abs(a.predictedRating - a.actualRating) -
      Math.abs(b.predictedRating - b.actualRating),
    "error-high": (a, b) =>
      Math.abs(b.predictedRating - b.actualRating) -
      Math.abs(a.predictedRating - a.actualRating),
    name: (a, b) => a.name.localeCompare(b.name),
  };
  const compare = comparators[sort];
  return filtered.sort((a, b) => compare(a, b) || a.id.localeCompare(b.id));
}
export function collectionMetrics(wines: Wine[]) {
  if (!wines.length) return { mae: 0, bias: 0, within: 0 };
  return {
    mae:
      wines.reduce(
        (s, w) => s + Math.abs(w.predictedRating - w.actualRating),
        0,
      ) / wines.length,
    bias:
      wines.reduce((s, w) => s + w.predictedRating - w.actualRating, 0) /
      wines.length,
    within:
      wines.filter(
        (w) => Math.abs(w.predictedRating - w.actualRating) <= 0.2 + 1e-9,
      ).length / wines.length,
  };
}
export function downloadJson(value: unknown, filename: string) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(value, null, 2)], { type: "application/json" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
