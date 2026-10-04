import { describe, expect, it } from "vitest";
import { collectionMetrics, filterWines, parseCollection } from "./collection";
import { demoCollection } from "./demo";
import type { Filters } from "./types";
const filters: Filters = {
  query: "",
  types: [],
  country: "",
  maxPrice: 1000,
  error: "all",
  savedOnly: false,
};
const copy = () => structuredClone(demoCollection);
describe("collection integrity", () => {
  it("accepts all demo examples only as explicitly labeled fixtures", () => {
    const result = parseCollection(copy());
    expect(result.source).toBe("demo");
    for (const wine of result.wines)
      expect(
        wine.baseValue + wine.shap.reduce((sum, s) => sum + s.contribution, 0),
      ).toBeCloseTo(wine.predictedRating, 8);
  });
  it("rejects mismatched SHAP explanations, duplicate IDs and missing metadata", () => {
    const badSum = copy();
    badSum.wines[0].shap[0].contribution += 0.1;
    expect(() => parseCollection(badSum)).toThrow("must equal its prediction");
    const duplicate = copy();
    duplicate.wines[1].id = duplicate.wines[0].id;
    expect(() => parseCollection(duplicate)).toThrow("duplicate ID");
    const missing = copy();
    missing.wines[0].country = "";
    expect(() => parseCollection(missing)).toThrow("country is required");
  });
  it("rejects nonfinite values, target-scale mismatches and duplicate features", () => {
    const nan = copy();
    nan.wines[0].shap[0].contribution = NaN;
    expect(() => parseCollection(nan)).toThrow("numeric contribution");
    const wrong = copy();
    wrong.wines[0].actualRating = 99;
    expect(() => parseCollection(wrong)).toThrow("1–5 scale");
    const duplicate = copy();
    duplicate.wines[0].shap[1].feature = duplicate.wines[0].shap[0].feature;
    expect(() => parseCollection(duplicate)).toThrow("duplicate SHAP feature");
    expect(() => parseCollection({ ...demoCollection, wines: [] })).toThrow(
      "between 1 and 100,000",
    );
  });
});
describe("exploration", () => {
  it("combines text, type, country, price and saved filters", () => {
    const result = filterWines(
      demoCollection.wines,
      {
        ...filters,
        query: " CUvee ",
        types: ["Sparkling"],
        country: "France",
        maxPrice: 100,
        savedOnly: true,
      },
      "predicted",
      ["demo-004", "demo-017"],
    );
    expect(result.map((w) => w.id)).toEqual(["demo-004"]);
  });
  it("sorts by absolute prediction error without mutating source order", () => {
    const before = demoCollection.wines.map((w) => w.id);
    const result = filterWines(demoCollection.wines, filters, "error-high", []);
    const errors = result.map((w) =>
      Math.abs(w.predictedRating - w.actualRating),
    );
    expect(errors).toEqual([...errors].sort((a, b) => b - a));
    expect(demoCollection.wines.map((w) => w.id)).toEqual(before);
  });
  it("handles an inclusive 0.20-star boundary and computes MAE and signed bias", () => {
    const wines = [
      { ...demoCollection.wines[0], actualRating: 4, predictedRating: 4.2 },
      { ...demoCollection.wines[1], actualRating: 4, predictedRating: 3.6 },
    ];
    expect(
      filterWines(wines, { ...filters, error: "close" }, "name", []),
    ).toHaveLength(1);
    const metrics = collectionMetrics(wines);
    expect(metrics.mae).toBeCloseTo(0.3);
    expect(metrics.bias).toBeCloseTo(-0.1);
    expect(metrics.within).toBe(0.5);
  });
});
