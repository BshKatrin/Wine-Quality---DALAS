# Reproducibility and migration

## Current status

This repository is a documented research archive with an installable helper package. It includes the course report, four notebooks with saved outputs, collection code, and preprocessing/imputation helpers. It is not yet a complete pipeline that reproduces the reported results from raw collections.

The original data, trained models, fitted encoders, and exact original dependency versions are absent. The new `uv.lock` describes the environment used for the structural checks and focused tests, not the environment that produced the course results.

The report was copied without modification from the original checkout into `reports/`. Selected notebook figures were extracted without altering their contents. Metric values in `reports/results.json` are taken from saved outputs and checked against them by the verification script.

## Migration from the original layout

| Original location | New location |
| --- | --- |
| `scrapping/vivino_scrapping/data_parse.ipynb` | `notebooks/01_parse_vivino.ipynb` |
| `imputation.ipynb` | `notebooks/02_imputation.ipynb` |
| `eda.ipynb` | `notebooks/03_exploratory_analysis.ipynb` |
| `models_and_explanation.ipynb` | `notebooks/04_models_and_explanations.ipynb` |
| `scripts/preprocess.py`, `imputation.py`, `translation.py` | `src/wine_quality/` |
| `scrapping/` | `scraping/` |
| `db_cleaned/grapes_merged.csv` | `data/interim/grapes_merged.csv` |
| `db_cleaned/wines_merged3.json` | `data/interim/wines_merged3.json` |
| `data_vivino/filt_all_wines_parent.csv` | `data/interim/vivino/filt_all_wines_parent.csv` |
| `db_cleaned/wines_inferred.json` | `data/processed/wines_inferred.json` |
| `wines_inferred_food_grapes.csv` | `data/processed/wines_inferred_food_grapes.csv` |
| Parser inputs / outputs beside the old notebook | `data/raw/vivino/` / `data/interim/vivino/` |
| `images/`, `img/` generated figures | `artifacts/figures/` |

Imports change from `scripts.preprocess` to `wine_quality.preprocess`, and similarly for the other helpers. The notebooks locate the checkout from their working directory and share paths via `wine_quality.paths`. They support launching Jupyter from the repository root or `notebooks/`. The package is intended for an editable installation inside this checkout.

## Execution corrections made during organization

- Replaced the imputation notebook’s ambiguous pandas `and` filter with a vectorized exclusion of the two recorded distillate IDs.
- Named rating and price-relative validation/evaluation functions separately. Previously the second definition of `eval_test` overwrote the first before the rating evaluation ran.
- Separated rating and adjusted-result variables, and supplied the adjusted predictions explicitly to their scatterplot.
- Separated raw-rating and adjusted-rating plotting tables, which previously shared a name and could show the wrong task when cells ran in order.
- Made explanation-model selection explicit and removed assignments that silently replaced the rating model with the price-relative model. The selected model receives only its own input columns for SHAP.
- Allowed imputation neighbors to have grape lists or sets and avoided modifying a sliced group. The combined imputation helper now handles missing child/parent grape lists consistently.
- Corrected the helper’s sparkling-sweetness fill to use sweetness, as the original notebook does; it previously copied fizziness into observed sweetness. This is a behavioral correction, and historical outputs were not regenerated from it.
- Deferred SimpleWine URL-file loading to spider construction, added CLI help/argument validation to the page collectors, corrected the region-page resume filename, and routed collection outputs into `data/raw/`.

Saved notebook outputs are deliberately preserved as historical evidence. They are not proof that the modified code has produced the same figures or metrics. The intro in each notebook makes that distinction explicit.

## Before a full rerun

1. Recover the original raw and prepared data, plus collection dates and source metadata. Restore files using the data-path table above.
2. Reconstruct the missing response merging, cross-source merge, historical USD/750 ml normalization, filtered parent-wine table, and final food/grape preparation.
3. Reconcile the report’s approximate collection count with the saved modeling count of 46,644 rows. Audit duplicates, parent IDs, and filtering decisions.
4. Separate train and test before fitting any learned imputation, encoding, and bin statistics. Check whether the historical upstream preparation used the full dataset.
5. Audit the Random Forest target-encoding path: it uses `fit` then `transform` on the same training observations. A future comparison should use cross-fitting for training encodings. See the [scikit-learn TargetEncoder documentation](https://scikit-learn.org/stable/modules/generated/sklearn.preprocessing.TargetEncoder.html).
6. Retain parent-wine IDs for a grouped evaluation of unseen wines or wineries, and add a simple baseline. The historical country-stratified split alone does not evaluate that use case.
7. Regenerate task-specific figures in separate runs. The inherited explanation section contains paired regression/classification plots; all plots in a fresh pass use the selected `explanation_task`. Several original filenames retain legacy task names, so rename and verify exports before publication.
8. Export the model with its preprocessing, ordered features, categorical/multilabel vocabularies, fixed conversion rates, price-bin edges and means, versions, and validation metrics.

The alcohol helper also retains the historical weighting formula and missing-parent behavior. Audit edge cases such as an absent parent alcohol value before using it to process new visitor inputs.

## Verification scope

`python scripts/check_project.py` checks Python/notebook syntax, required project artifacts, local documentation links, notebook structure, and the recorded metrics’ source outputs. With `--require-data`, it also fails if expected historical inputs are missing. It does not train models or contact wine websites.

`python -m unittest discover -s tests` uses small fixtures to check the execution corrections. These fixtures are not replacements for the historical dataset. CI runs the same offline checks and focused tests; it does not claim a full research reproduction.
