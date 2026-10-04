export const WINE_TYPES = [
  "Red",
  "White",
  "Rosé",
  "Sparkling",
  "Orange",
  "Dessert",
  "Fortified",
] as const;
export type WineType = (typeof WINE_TYPES)[number];
export interface Contribution {
  feature: string;
  value: string | number;
  contribution: number;
  group: string;
  imputed?: boolean;
}
export interface Wine {
  id: string;
  name: string;
  producer: string;
  country: string;
  region: string;
  type: WineType;
  year: number | null;
  grapes: string[];
  priceUsd: number;
  alcohol: number | null;
  actualRating: number;
  predictedRating: number;
  baseValue: number;
  shap: Contribution[];
}
export interface Collection {
  schemaVersion: 1;
  name: string;
  source: "demo" | "test";
  modelName: string;
  description: string;
  wines: Wine[];
}
export interface Filters {
  query: string;
  types: WineType[];
  country: string;
  maxPrice: number;
  error: string;
  savedOnly: boolean;
}
export type SortKey =
  | "predicted"
  | "actual"
  | "price-low"
  | "price-high"
  | "error-low"
  | "error-high"
  | "name";
export const signed = (value: number, digits = 2) =>
  `${value > 0 ? "+" : value < 0 ? "−" : ""}${Math.abs(value).toFixed(digits)}`;
export const money = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: value % 1 ? 2 : 0,
  }).format(value);

// Human-readable display of prepared labels; model inputs stay unchanged.
export const displayLabel = (value: string) => value.replaceAll("_", " ");
