# Data layout

Source datasets are excluded from Git. A prepared predecessor, `processed/wines_inferred.csv`, has been recovered locally for the [website retraining run](../docs/web-data.md); the later historical modeling CSV and other notebook inputs remain absent from this checkout. Do not substitute synthetic data or a different wine-quality dataset and present its results as this project’s results. Notebook outputs remain available for reading without the source files.

| Location | Expected contents |
| --- | --- |
| `raw/vivino/` | Original API collections, including `all_merged_round1.json` and `all_merged_round2.json` |
| `raw/simplewine/` | URL list `urls_to_scrap.json` and original Scrapy exports |
| `interim/vivino/` | Parsed round tables and filtered parent-wine table |
| `interim/` | Harmonized grapes and the cross-source merged wine table |
| `processed/` | Inferred JSON for EDA and food/grape-ready CSV for modeling |

## Required analysis inputs

| File | Consumer | Expected contents |
| --- | --- | --- |
| `interim/grapes_merged.csv` | Imputation, EDA | Grape lookup, including `id` and `name` |
| `interim/vivino/filt_all_wines_parent.csv` | Imputation | Historical filtered parent wines |
| `interim/wines_merged3.json` | Imputation, EDA | Historical merged wines with parent alcohol/grapes and unfilled taste values |
| `processed/wines_inferred.json` | EDA | Historical inferred wines, including ratings, price/volume/currency, type, origin, grapes, food, and taste |
| `processed/wines_inferred_food_grapes.csv` | Modeling | Modeling table with the features listed below and a mean public rating |

Modeling columns read by the notebook: `id`, `type`, `year`, `country`, `region_name`, `winery_name`, `intensity`, `sweetness`, `acidity`, `tannin`, `fizziness`, `alcohol`, `drinking_window`, `food_filt`, `grapes_merged`, `price`, and `mean_rating`. Food and grape columns contain Python list literals as strings. Prices must be the historical standardized USD prices per 750 ml bottle, using the project’s fixed conversion rates, rather than today’s exchange rates.

The report states that the exchange rates were dated October 20, 2024. The report’s cover date is not a collection timestamp. Collection dates and exact row-level provenance must be recovered from the original collection records.

## What is missing from the pipeline?

The parsing notebook produces Vivino round tables. The helpers include source translation, rating aggregation, and imputation routines. However, the complete merge of both sources, currency and volume normalization, and final modeling-table construction are not present as an executable workflow. The imputation notebook explores methods but does not write all downstream inputs.

Recover the historical input files first, reconcile duplicates and row counts, then reconstruct these steps in a dedicated pipeline. Until that is done, notebook numbering indicates reading order only.

Data files are ignored by Git. The README and empty directory markers are tracked. `scripts/check_project.py --require-data` checks expected file presence; it does not certify dataset correctness or provenance.
