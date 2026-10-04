"""Rebuild the raw public-rating CatBoost experiment from the prepared CSV.

The CSV is a historical, already prepared input. This module never modifies it.
Newly learned multilabel vocabularies are fitted after the train/test split.
"""

from __future__ import annotations

import argparse
import ast
import hashlib
import json
from pathlib import Path
import platform

import numpy as np
import pandas as pd
from catboost import CatBoostRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import train_test_split

from .web_export import export_test_collection


FEATURES = [
    "type", "year", "country", "region_name", "winery_name", "intensity",
    "sweetness", "acidity", "tannin", "fizziness", "alcohol",
    "drinking_window", "food_filt", "grapes_merged", "price",
]
CATEGORICAL = ["type", "country", "region_name", "winery_name"]
MULTILABEL = ["food_filt", "grapes_merged"]
NUMERIC = [c for c in FEATURES if c not in CATEGORICAL + MULTILABEL]
TYPE_LABELS = {
    "red": "Red", "white": "White", "rose": "Rosé", "rosé": "Rosé",
    "spark": "Sparkling", "sparkling": "Sparkling", "orange": "Orange",
    "dessert": "Dessert", "fortif": "Fortified", "fortified": "Fortified",
}


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def parse_labels(value: object) -> list[str]:
    if isinstance(value, str):
        if not value.strip() or value.strip().lower() in {"nan", "none"}:
            return []
        try:
            value = ast.literal_eval(value)
        except (ValueError, SyntaxError) as exc:
            raise ValueError(f"Invalid list literal: {value[:100]}") from exc
    if value is None or (isinstance(value, float) and np.isnan(value)):
        return []
    if not isinstance(value, (list, tuple, set)):
        raise ValueError(f"Expected a list of labels, got {type(value).__name__}")
    return sorted({str(item).strip() for item in value if str(item).strip()})


class RatingPreprocessor:
    """Deterministic train-fitted one-hot labels and fixed CatBoost input order."""

    def __init__(self) -> None:
        self.vocabularies: dict[str, list[str]] = {}
        self.feature_names: list[str] = []

    def fit(self, frame: pd.DataFrame) -> "RatingPreprocessor":
        for column in MULTILABEL:
            self.vocabularies[column] = sorted({
                label for labels in frame[column] for label in parse_labels(labels)
            })
        self.feature_names = [
            *(f"food::{label}" for label in self.vocabularies["food_filt"]),
            *(f"grape::{label}" for label in self.vocabularies["grapes_merged"]),
            *(column for column in FEATURES if column not in MULTILABEL),
        ]
        if len(set(self.feature_names)) != len(self.feature_names):
            raise ValueError("Model feature names are not unique.")
        return self

    def transform(self, frame: pd.DataFrame) -> tuple[pd.DataFrame, pd.DataFrame]:
        if not self.feature_names:
            raise ValueError("Fit preprocessing on the training rows first.")
        transformed_columns: dict[str, pd.Series | np.ndarray] = {}
        imputed_columns: dict[str, pd.Series | bool] = {}
        for column, prefix in (("food_filt", "food"), ("grapes_merged", "grape")):
            labels = frame[column].map(lambda value: set(parse_labels(value)))
            for label in self.vocabularies[column]:
                name = f"{prefix}::{label}"
                transformed_columns[name] = np.fromiter((int(label in row) for row in labels), dtype=np.int8)
                imputed_columns[name] = False
        for column in FEATURES:
            if column in MULTILABEL:
                continue
            if column in CATEGORICAL:
                missing = frame[column].isna() | frame[column].astype(str).str.strip().eq("")
                transformed_columns[column] = frame[column].fillna("Unknown").astype(str).replace("", "Unknown")
                imputed_columns[column] = missing.astype(bool)
            else:
                numeric = pd.to_numeric(frame[column], errors="raise")
                if np.isinf(numeric.to_numpy(dtype=float)).any():
                    raise ValueError(f"Infinite values in {column}.")
                transformed_columns[column] = numeric.astype(float)
                # CatBoost consumes numeric NaN directly; no value was imputed.
                imputed_columns[column] = False
        transformed = pd.DataFrame(transformed_columns, index=frame.index)[self.feature_names]
        imputed = pd.DataFrame(imputed_columns, index=frame.index)[self.feature_names]
        return transformed, imputed

    def manifest(self) -> dict:
        return {
            "rawFeatures": FEATURES,
            "categoricalFeatures": CATEGORICAL,
            "numericFeatures": NUMERIC,
            "vocabularies": self.vocabularies,
            "featureNames": self.feature_names,
            "missingCategoricalValue": "Unknown",
            "numericMissingHandling": "CatBoost native NaN",
            "upstreamImputation": "Prepared CSV may already contain globally inferred values; original missingness is not fully recoverable.",
        }


def load_modeling_table(path: Path) -> pd.DataFrame:
    wines = pd.read_csv(path)
    # The recovered archived table predates the final modeling CSV. Its `food`
    # column already contains the prepared food labels; the final `food_filt`
    # transformation cannot be recovered, so this rerun uses those labels.
    if "food_filt" not in wines and "food" in wines:
        wines["food_filt"] = wines["food"]
    required = set(FEATURES) | {"id", "mean_rating"}
    missing = sorted(required - set(wines.columns))
    if missing:
        raise ValueError(f"Prepared CSV lacks required columns: {missing}")
    wines.index = pd.RangeIndex(len(wines), name="source_row")
    # Keep the notebook's two recorded exclusions and rating/price filters.
    wines = wines.loc[~wines["id"].isin([142522005, 144353810])].copy()
    wines["mean_rating"] = pd.to_numeric(wines["mean_rating"], errors="raise")
    wines["price"] = pd.to_numeric(wines["price"], errors="raise")
    wines = wines.loc[(wines["mean_rating"] > 0) & wines["price"].notna()].copy()
    if wines.empty or wines["country"].isna().any():
        raise ValueError("No eligible rows or missing countries prevent the country-stratified split.")
    if not wines["mean_rating"].between(1, 5).all():
        raise ValueError("Public rating targets must be in [1, 5].")
    if not np.isfinite(wines["price"]).all() or (wines["price"] < 0).any():
        raise ValueError("Prices must be finite, nonnegative historical USD/750 ml values.")
    for column in MULTILABEL:
        wines[column] = wines[column].map(parse_labels)
    return wines


def display_metadata(wines: pd.DataFrame) -> pd.DataFrame:
    def display_text(column: str, fallback: str = "Not available") -> pd.Series:
        if column not in wines:
            return pd.Series(fallback, index=wines.index)
        return wines[column].fillna(fallback).astype(str).str.strip().replace("", fallback)

    names = display_text("name")
    if "name" not in wines and "seo_name" in wines:
        names = display_text("seo_name").str.replace("-", " ", regex=False).str.title()
    types = display_text("type").str.lower().map(TYPE_LABELS)
    if types.isna().any():
        raise ValueError(f"Unsupported wine types: {sorted(wines.loc[types.isna(), 'type'].astype(str).unique())}")
    years = pd.to_numeric(wines["year"].replace("N.V.", np.nan), errors="coerce")
    return pd.DataFrame({
        "id": [f"wine-{wine_id}-row-{row}" for row, wine_id in zip(wines.index, wines["id"])],
        "name": names,
        "producer": display_text("winery_name"),
        "country": display_text("country"),
        "region": display_text("region_name"),
        "type": types,
        "year": years,
        "grapes": wines["grapes_merged"].map(list),
        "priceUsd": wines["price"].astype(float),
        "alcohol": pd.to_numeric(wines["alcohol"], errors="coerce"),
    }, index=wines.index)


def metrics(actual: pd.Series, predicted: np.ndarray) -> dict[str, float]:
    return {
        "mae": float(mean_absolute_error(actual, predicted)),
        "mse": float(mean_squared_error(actual, predicted)),
        "rmse": float(np.sqrt(mean_squared_error(actual, predicted))),
        "r2": float(r2_score(actual, predicted)),
    }


def write_json(path: Path, value: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, allow_nan=False, indent=2) + "\n", encoding="utf-8")


def retrain(input_csv: Path, output_root: Path) -> dict:
    import catboost
    import sklearn

    input_csv = input_csv.resolve(strict=True)
    dataset_sha = sha256_file(input_csv)
    wines = load_modeling_table(input_csv)
    train_idx, test_idx = train_test_split(
        wines.index.to_numpy(), test_size=0.2, random_state=42,
        stratify=wines["country"],
    )
    train = wines.loc[train_idx]
    test = wines.loc[test_idx]
    prep = RatingPreprocessor().fit(train)
    x_train, _ = prep.transform(train)
    x_test, imputed_test = prep.transform(test)
    y_train = train["mean_rating"]
    y_test = test["mean_rating"]
    model = CatBoostRegressor(
        iterations=500, learning_rate=0.05, depth=6,
        loss_function="RMSE", cat_features=CATEGORICAL,
        verbose=100, random_state=0, allow_writing_files=False,
    )
    model.fit(x_train, y_train)
    predictions = model.predict(x_test)
    version = f"rating-cb500-{dataset_sha[:12]}"
    model_name = f"CatBoost raw public rating / {version}"
    data_version = f"prepared-csv-sha256-{dataset_sha[:12]}"

    model_dir = output_root / "models"
    web_dir = output_root / "web"
    model_dir.mkdir(parents=True, exist_ok=True)
    model_path = model_dir / f"{version}.cbm"
    model.save_model(str(model_path))
    model_sha = sha256_file(model_path)
    write_json(model_dir / f"{version}-preprocessing.json", prep.manifest())
    write_json(model_dir / f"{version}-split.json", {
        "datasetSha256": dataset_sha,
        "split": {"testSize": 0.2, "randomState": 42, "stratify": "country"},
        "trainSourceRows": [int(i) for i in train_idx],
        "testSourceRows": [int(i) for i in test_idx],
        "testIds": display_metadata(test)["id"].tolist(),
    })
    results = {
        "modelVersion": version, "modelName": model_name, "dataVersion": data_version,
        "datasetSha256": dataset_sha, "modelSha256": model_sha,
        "inputCsv": str(input_csv), "modelPath": str(model_path),
        "sourceRowCount": int(len(pd.read_csv(input_csv, usecols=["id"]))),
        "eligibleRowCount": len(wines), "trainCount": len(train), "testCount": len(test),
        "featureCount": len(x_train.columns),
        "target": "mean_rating: raw public rating in stars",
        "parameters": model.get_params(),
        "trainMetrics": metrics(y_train, model.predict(x_train)),
        "testMetrics": metrics(y_test, predictions),
        "versions": {
            "python": platform.python_version(), "numpy": np.__version__,
            "pandas": pd.__version__, "scikitLearn": sklearn.__version__,
            "catboost": catboost.__version__,
        },
        "limitations": [
            "The prepared CSV may already contain full-dataset taste, alcohol or drinking-window imputation; its original missing values and fit scope are not recoverable here.",
            "The recovered wines_inferred.csv has food but lacks the later food_filt column; this run uses its food labels directly.",
            "This is a new country-stratified row split and retraining, not a reproduction of historical saved scores.",
            "The row split can include related wines or producers in both sets and does not measure unseen-producer generalization.",
        ],
    }
    write_json(model_dir / f"{version}-metrics.json", results)

    groups = {column: "Food" for column in x_test if column.startswith("food::")}
    groups.update({column: "Grapes" for column in x_test if column.startswith("grape::")})
    groups.update({"price": "Price", "year": "Vintage", "alcohol": "Alcohol",
                   "country": "Origin", "region_name": "Origin", "winery_name": "Origin",
                   "type": "Style", "drinking_window": "Vintage"})
    groups.update({column: "Taste" for column in ("intensity", "sweetness", "acidity", "tannin", "fizziness")})
    collection_path = export_test_collection(
        model, x_test, y_test, display_metadata(test),
        training_index=x_train.index, output=web_dir / "test-wines.json",
        name=f"DALAS held-out rating test set / {version}", model_name=model_name,
        feature_groups=groups, imputed=imputed_test,
    )
    provenance = {
        "schemaVersion": 1, "collectionSha256": sha256_file(collection_path),
        "datasetSha256": dataset_sha, "modelSha256": model_sha,
        "modelName": model_name, "modelVersion": version, "dataVersion": data_version,
        "sourceRowCount": results["sourceRowCount"],
        "eligibleRowCount": results["eligibleRowCount"],
        "trainCount": len(train), "testCount": len(test),
        "featureCount": results["featureCount"],
        "testMetrics": results["testMetrics"],
        "limitations": results["limitations"],
        "trainSourceRows": [int(i) for i in train_idx],
        "testSourceRows": [int(i) for i in test_idx],
        "testIds": display_metadata(test)["id"].tolist(),
    }
    write_json(web_dir / "provenance.json", provenance)
    return results


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("input_csv", type=Path, help="Recovered wines_inferred_food_grapes.csv")
    parser.add_argument("--output-root", type=Path, default=Path("artifacts"))
    args = parser.parse_args()
    results = retrain(args.input_csv, args.output_root)
    print(json.dumps({key: results[key] for key in ("modelVersion", "sourceRowCount", "eligibleRowCount", "trainCount", "testCount", "featureCount", "testMetrics")}, indent=2))


if __name__ == "__main__":
    main()
