# Test-wine export contract

The explorer displays precomputed predictions, not live inference. A valid export combines **the same held-out rows** across display metadata, the fitted rating model's inputs, actual ratings, predictions, and SHAP explanations.

## Recovered source and new retraining

The archived source `/Volumes/HDD1TB/dalas/Wine-Quality---DALAS/db_cleaned/wines_inferred.csv` was recovered read-only and copied to the ignored local path `data/processed/wines_inferred.csv`. It has 50,141 rows and 25 columns. Its SHA-256 is `c535c4151eff6a6615daf70e1bf9a99f88bfea89613e2a98cc098e3f04b713ea`. Applying the notebook's two recorded ID exclusions, positive-rating condition and nonmissing-price condition yields exactly 46,644 rows. This recovers the historical modeling **row count**, not the exact later modeling CSV or historical fitted model.

The later `wines_inferred_food_grapes.csv` is absent from the inspected archive. The recovered source has prepared `food` list labels but no `food_filt` column; this rerun uses those labels directly. Its historical price field is already standardized USD per 750 ml, as described in the [data layout](../data/README.md). The archived table already has inferred alcohol, taste and drinking-window values. Their original missingness and whether upstream imputation saw all rows cannot be established, so the held-out metrics may benefit from preparation leakage. New food/grape vocabularies are fitted on training rows only. Numeric missing values remain native CatBoost NaN; a missing categorical value is replaced with `Unknown` and marked in the export.

Run the complete raw-rating retraining and export with:

```sh
uv sync --extra analysis
cp -p /Volumes/HDD1TB/dalas/Wine-Quality---DALAS/db_cleaned/wines_inferred.csv data/processed/wines_inferred.csv
.venv/bin/python -m wine_quality.retrain_rating data/processed/wines_inferred.csv --output-root artifacts
```

The command writes the fitted `.cbm`, preprocessing vocabulary and ordered feature list, exact train/test source-row indices, dependency versions and fresh metrics under `artifacts/models/`. It writes all 9,329 held-out wines with predictions and native SHAP values to `artifacts/web/test-wines.json`, plus `artifacts/web/provenance.json` with dataset, model and collection SHA-256 hashes and ordered train/test source rows and test IDs. The split is country-stratified with `test_size=0.2`, `random_state=42`; the raw-rating CatBoost uses 500 iterations, learning rate 0.05, depth 6, RMSE loss, and random state 0. The test set has 9,329 rows, 103 model features, MAE 0.162445, RMSE 0.243121, and R² 0.553889. These are **new-run results**, not historical report scores.

Use the **raw public-rating regressor with price included**. The price-relative model has different target units and is not suitable for this interface. Do not claim the historical report scores for a newly retrained model; record its version and evaluation separately. The historical split was at the row level; a wine or producer appearing across splits can make generalization to unseen wines or producers look stronger than it is. The exporter checks declared row-index separation, not group-level leakage.

## Export from Python

For a separate fitted regressor and its own split:

```python
from wine_quality.web_export import export_test_collection

# X_test: processed model inputs with the original unique row index.
# y_test: raw public ratings, a Series with exactly X_test.index.
# display: display metadata, in precisely the same row order.
# model: fitted CatBoostRegressor for raw public ratings.
# X_train: the rows actually used to train that model.
# Keep model features in the original training column order.

export_test_collection(
    model,
    X_test,
    y_test,
    display.loc[X_test.index],
    training_index=X_train.index,
    output="artifacts/web/test-wines.json",
    name="DALAS held-out rating test set",
    model_name="CatBoost rating regressor / recovered-model-version",
    feature_groups={
        "price": "Price",
        "country": "Origin",
        "winery": "Origin",
        "year": "Vintage",
        "alcohol": "Alcohol",
        "acidity": "Taste",
        "tannin": "Taste",
        # Use the exact column names of the fitted model.
    },
    # Optional boolean mask, same index and columns as X_test:
    # imputed=imputed_test_mask,
)
```

`display` needs these columns:

| Column | Type and meaning |
| --- | --- |
| `id` | Unique stable string; include vintage where necessary |
| `name`, `producer`, `country`, `region` | Nonempty display strings; use “Not available” when truly unknown |
| `type` | `Red`, `White`, `Rosé`, `Sparkling`, `Orange`, `Dessert`, or `Fortified` |
| `year` | Integer year or missing/null for a non-vintage wine |
| `grapes` | List of display names, possibly empty |
| `priceUsd` | Nonnegative historical price normalized to USD per 750 ml |
| `alcohol` | Percentage or missing/null |

The helper preserves exact model input values separately from display metadata. It supports native CatBoost categorical features. It does not reverse one-hot encodings, recover original labels, normalize currencies, or infer imputation provenance. Supply those intentionally from your preparation pipeline. The native SHAP baseline corresponds to the fitted model's reference distribution. Changing the SHAP reference method can change individual explanations while retaining additivity.

All features are exported. Unmapped features use the `Other` theme. The waterfall displays the seven largest absolute contributions plus a signed sum of the remainder when there are more than eight features; the exact table retains every contribution. The theme chart sums **absolute contributions**, so positive and negative effects do not cancel there.

## JSON structure

This is a **fictional one-wine example**, not a course result:

```json
{
  "schemaVersion": 1,
  "name": "Small illustrative example",
  "source": "demo",
  "modelName": "Illustrative model",
  "description": "Fictional data for validating the format.",
  "wines": [{
    "id": "example-01",
    "name": "Example vintage",
    "producer": "Example producer",
    "country": "France",
    "region": "Bordeaux",
    "type": "Red",
    "year": 2020,
    "grapes": ["Merlot"],
    "priceUsd": 24,
    "alcohol": 13.5,
    "actualRating": 4.0,
    "predictedRating": 3.9,
    "baseValue": 3.8,
    "shap": [
      {"feature": "Price", "value": 24, "contribution": 0.15, "group": "Price"},
      {"feature": "Alcohol", "value": 13.5, "contribution": -0.05, "group": "Alcohol", "imputed": true}
    ]
  }]
}
```

Use `source: "test"` only for verified real held-out exports. Ratings and contributions are in **stars**, not probabilities, standardized target units, or price-adjusted ratings. Numeric feature values enable the feature-context plot; categorical values remain available in the waterfall and table.

Browser validation requires unique wine IDs and feature names, supported styles, finite numbers, actual ratings in [1, 5], predicted ratings and baselines in [0, 6], and `baseValue + sum(contribution) ≈ predictedRating` within 0.002. Predictions are not clipped to [1, 5], because clipping would break the explanation. The local development importer retains a 25 MB file limit. The complete 113 MB test collection is packaged offline into hashed static chunks for production; the release packager validates all 9,329 IDs, 103 features per wine, source-row disjointness, hashes and SHAP additivity. Keep more than three decimal places when exporting large numbers of contributions.

The file is read locally and discarded on reload. Only bookmark IDs and theme preference are persisted. Collections with the same source and name share a bookmark namespace; use a distinct name for each dataset/model version.
