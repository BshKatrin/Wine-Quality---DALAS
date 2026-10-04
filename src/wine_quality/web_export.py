"""Export a fitted CatBoost rating model's held-out predictions for the local UI.

No fitting, splitting, or imputation happens here. Pass the same processed columns
used by the fitted rating regressor, along with aligned display metadata.
"""

from collections.abc import Iterable, Mapping
import json
from pathlib import Path

import numpy as np
import pandas as pd


DISPLAY_COLUMNS = (
    "id", "name", "producer", "country", "region", "type", "year",
    "grapes", "priceUsd", "alcohol",
)
WINE_TYPES = {"Red", "White", "Rosé", "Sparkling", "Orange", "Dessert", "Fortified"}


def export_test_collection(
    model,
    x_test: pd.DataFrame,
    y_test: pd.Series,
    metadata: pd.DataFrame,
    *,
    training_index: Iterable,
    output: str | Path,
    name: str,
    model_name: str,
    feature_groups: Mapping[str, str] | None = None,
    imputed: pd.DataFrame | None = None,
) -> Path:
    """Write rating-unit predictions and native CatBoost SHAP contributions.

    All three tables must have the same unique index in the same order. Indices
    must retain their original IDs across the train/test split, not reset to 0.
    ``training_index`` must contain the full index actually used to fit the model.
    This detects an accidental overlap, not an untruthful provenance declaration.

    ``imputed`` is an optional boolean mask with exactly x_test's axes. It records
    input provenance; it does not fill missing values. The caller must ensure
    preprocessing was fitted only on training data and the model targets raw
    public ratings, not the separate price-relative task.
    """
    from catboost import CatBoostRegressor, Pool

    if not isinstance(model, CatBoostRegressor) or not model.is_fitted():
        raise ValueError("Supply a fitted CatBoostRegressor for raw public ratings.")
    if not 1 <= len(x_test) <= 100000 or not 1 <= len(x_test.columns) <= 2000:
        raise ValueError("Export 1–100,000 wines and 1–2,000 features.")
    if not x_test.index.is_unique or not x_test.columns.is_unique:
        raise ValueError("Test row indices and feature names must be unique.")
    if not x_test.index.equals(y_test.index) or not x_test.index.equals(metadata.index):
        raise ValueError("Features, targets, and metadata must have identical ordered indices.")
    train_index = pd.Index(training_index)
    if len(train_index) == 0 or not x_test.index.intersection(train_index).empty:
        raise ValueError("Supply nonempty training indices disjoint from the test indices.")
    if list(x_test.columns) != model.feature_names_:
        raise ValueError("Test columns must match the fitted model's feature names and order.")
    if imputed is not None and (
        not imputed.index.equals(x_test.index)
        or not imputed.columns.equals(x_test.columns)
        or not all(dtype == bool for dtype in imputed.dtypes)
    ):
        raise ValueError("The imputation mask must be boolean and match the test frame axes.")
    missing = set(DISPLAY_COLUMNS) - set(metadata.columns)
    if missing:
        raise ValueError(f"Missing display columns: {sorted(missing)}")
    if not metadata["id"].is_unique:
        raise ValueError("Display wine IDs must be unique.")
    actual = np.asarray(y_test, dtype=float)
    if not np.isfinite(actual).all() or not ((1 <= actual) & (actual <= 5)).all():
        raise ValueError("Actual ratings must be finite numbers on the 1–5 scale.")
    if not name.strip() or not model_name.strip():
        raise ValueError("Name the collection and fitted model version.")

    pool = Pool(x_test, cat_features=model.get_cat_feature_indices())
    predicted = np.asarray(model.predict(pool), dtype=float)
    shap = np.asarray(model.get_feature_importance(pool, type="ShapValues"), dtype=float)
    if predicted.shape != (len(x_test),) or shap.shape != (len(x_test), len(x_test.columns) + 1):
        raise ValueError("Only single-output rating regression is supported.")
    if not np.isfinite(shap).all() or not np.isfinite(predicted).all():
        raise ValueError("Model predictions and explanations must be finite.")
    if not np.allclose(shap.sum(axis=1), predicted, atol=1e-6, rtol=0):
        raise ValueError("SHAP baseline plus contributions must reconstruct the prediction.")
    if not ((0 <= predicted) & (predicted <= 6)).all() or not ((0 <= shap[:, -1]) & (shap[:, -1] <= 6)).all():
        raise ValueError("This explorer expects predictions in rating units.")

    groups = feature_groups or {}
    wines = []
    for i, (_, row) in enumerate(metadata.iterrows()):
        wine = {key: row[key] for key in DISPLAY_COLUMNS}
        for key in ("id", "name", "producer", "country", "region"):
            if not isinstance(wine[key], str) or not 0 < len(wine[key].strip()) <= 1000:
                raise ValueError(f"Wine {i + 1}: {key} must be nonempty text.")
        if wine["type"] not in WINE_TYPES:
            raise ValueError(f"Wine {i + 1}: unsupported wine type.")
        if not isinstance(wine["grapes"], list) or not all(isinstance(g, str) and g.strip() for g in wine["grapes"]):
            raise ValueError("Grapes must be lists of names.")
        for key in ("year", "alcohol"):
            wine[key] = None if pd.isna(wine[key]) else float(wine[key])
        if wine["year"] is not None:
            if not 1800 <= wine["year"] <= 2100 or not wine["year"].is_integer():
                raise ValueError("Vintage must be a year or null.")
            wine["year"] = int(wine["year"])
        wine["priceUsd"] = float(wine["priceUsd"])
        if not 0 <= wine["priceUsd"] <= 1e7 or (wine["alcohol"] is not None and not 0 <= wine["alcohol"] <= 100):
            raise ValueError("Price or alcohol is outside the accepted range.")
        contributions = []
        for j, feature in enumerate(x_test.columns):
            value = x_test.iloc[i, j]
            if pd.isna(value):
                value = "Missing"
            elif isinstance(value, (int, float, np.number)):
                value = float(value)
            else:
                value = str(value)
            group = groups.get(feature, "Other")
            if not isinstance(group, str) or not group.strip():
                raise ValueError("Feature group labels must be nonempty text.")
            contributions.append({
                "feature": feature, "value": value, "group": group,
                "contribution": float(shap[i, j]),
                **({"imputed": bool(imputed.iloc[i, j])} if imputed is not None else {}),
            })
        wine.update(actualRating=float(actual[i]), predictedRating=float(predicted[i]),
                    baseValue=float(shap[i, -1]), shap=contributions)
        wines.append(wine)

    payload = {"schemaVersion": 1, "source": "test", "name": name,
               "modelName": model_name,
               "description": "Held-out rating predictions with native CatBoost SHAP explanations.",
               "wines": wines}
    # Compact encoding keeps the complete held-out set practical to load locally.
    encoded = json.dumps(payload, ensure_ascii=False, allow_nan=False, separators=(",", ":"))
    if len(encoded.encode("utf-8")) > 512 * 1024 * 1024:
        raise ValueError("Export exceeds 512 MB; the local browser may not load it reliably.")
    destination = Path(output)
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_text(encoded + "\n", encoding="utf-8")
    return destination
