import numpy as np
import pandas as pd
from unidecode import unidecode
from .translation import mapping

taste_columns = ["intensity", "sweetness", "acidity", "tannin", "fizziness"]


def infer_alcohol(wines, assign_inferred_col: bool):
    alcohol = wines[["id", "id_parent", "alcohol", "alcohol_parent"]].copy()

    # Replace zero values by NaN
    alcohol[["alcohol", "alcohol_parent"]] = alcohol[["alcohol", "alcohol_parent"]].replace(0, np.nan)

    # Count number of vintages where 'alcohol' is known, per parent
    alcohol["count"] = alcohol.groupby("id_parent")["alcohol"].transform("count")

    # Weight = 1 / (count + 1)
    alcohol["weights"] = 1 / (alcohol["count"] + 1)

    # Median alcohol per parent
    alcohol["alcohol_median"] = alcohol.groupby("id_parent")["alcohol"].transform("median")
    alcohol["alcohol_median"] = alcohol["alcohol_median"].fillna(0)

    # Remove rows where both alcohol_parent is NaN and count == 1
    alcohol = alcohol[~(alcohol["alcohol_parent"].isna() & (alcohol["count"] == 1))]

    # Compute inferred values and fill missing alcohol
    inferred = alcohol["alcohol_median"] * (1 - alcohol["weights"]) + \
        alcohol["alcohol_parent"] * alcohol["weights"]

    mask = alcohol["alcohol"].isna()
    alcohol.loc[mask, "alcohol"] = inferred[mask]

    # Assign inferred / observed flag
    if assign_inferred_col:
        alcohol["inferred"] = np.where(mask, "Inferred", "Observed")

    return wines.drop(columns=["alcohol"]).merge(alcohol[["id", "alcohol"]], on="id", how="left")


def impute_row(row, group, list_col, num_cols):
    def jaccard_distance(a, b):
        a = set(a) if not isinstance(a, set) else a
        b = set(b) if not isinstance(b, set) else b
        if not a and not b:
            return 0.0
        return 1 - len(a & b) / len(a | b)

    if pd.isna(row[list_col]) or (len(row[list_col]) == 0) or (~row[num_cols].isna()).all():
        return row

    group = group[~group[list_col].isna()]
    if group.empty:
        return row

    group["distances"] = group[list_col].apply(lambda x: jaccard_distance(row[list_col], x))

    new_row = row.copy()
    for col in num_cols:
        if pd.isna(row[col]):
            group_col = group[~group[col].isna()]
            if group_col.empty:
                continue

            distances = group_col["distances"]
            distances[distances.index == row.name] = np.inf
            min_dist = distances.min()
            if min_dist == 1:
                continue

            nearest = group_col[distances == min_dist]
            new_row[col] = nearest[col].mean()

    return new_row


def impute_taste(df):
    return (df.
            groupby(["type"], group_keys=False).
            apply(lambda group: group.apply(lambda row: impute_row(row, group, "grapes_merged", taste_columns), axis=1))
            )


def impute_wines_df(wines, parent_wines, grapes):

    # 1. Alcohol percentage
    wines = infer_alcohol(wines, False)

    # 2. Grapes
    # merge parent, children grapes
    wines["grapes_merged"] = wines[["grapes", "parent_grapes"]].apply(
        lambda row: list(set(row["grapes"]) | set(row["parent_grapes"]))
        if isinstance(row["grapes"], list) else row, axis=1)
    wines_grapes = wines[["id", "grapes_merged"]].explode("grapes_merged")

    # Normalizing grapes names (unidecode, lowercase)
    grapes_dict = grapes.set_index("id")["name"].to_dict()  # get id : grape_name dict
    wines_grapes["grapes_merged"] = wines_grapes["grapes_merged"].map(grapes_dict).apply(
        lambda row: unidecode(row).lower() if isinstance(row, str) else row)

    # Translate grapes into English and remove some subvarieties
    wines_grapes["grapes_merged"] = wines_grapes["grapes_merged"].apply(
        lambda x: mapping["grapes_translation"].get(x, x))

    # 2.1. Taste
    # filling missing values that are 'undefined' for some types
    wines.loc[wines["type"] != "spark", "fizziness"] = wines[wines["type"] != "spark"]["fizziness"].fillna(0)
    wines.loc[~wines["type"].isin(["orange", "red"]), "tannin"] = wines[~wines["type"].isin([
        "orange", "red"])]["tannin"].fillna(0)
    wines.loc[wines["type"] == "spark", "sweetness"] = wines[wines["type"] == "spark"]["fizziness"].fillna(0)

    # impute others based on jaccard distance
    wines_grapes = wines_grapes.dropna(subset=["grapes_merged"]).groupby("id")["grapes_merged"].apply(set).reset_index()
    wines = wines.drop(columns=["grapes_merged"]).merge(wines_grapes, how="left", on="id")
    wines = impute_taste(wines)

    # 2.2 Merge grapes into large families
    wines["grapes_merged"] = wines["grapes_merged"].apply(
        lambda s: [mapping["grapes_families"].get(x, x) for x in s] if isinstance(s, set) else s)

    # 4. Drinking window
    wines["drinking_window"] = wines["window_end_year"] - wines["window_start_year"]
    wines["drinking_window"] = wines["drinking_window"].fillna(wines["drinking_window"].median())

    cols_to_drop = ["allergens", "JS_rating", "WS_rating", "window_end_year", "window_start_year",
                    "style_baseline_structure_intensity", "style_baseline_structure_tannin",
                    "style_baseline_structure_sweetness", "style_baseline_structure_acidity",
                    "style_baseline_structure_fizziness",
                    "parent_style_grapes", "grape_composition", "grapes", "parent_grapes",
                    "alcohol_parent"]
    cols_to_rename = {"VIVINO_rating": "pro_rating"}
    cols_to_rearr = ['id', 'id_parent', 'seo_name', 'name', 'type', 'year', 'country',
                     'region_name', 'winery_name', 'base_volume', 'price', 'base_currency',
                     'intensity', 'sweetness', 'acidity', 'tannin', 'fizziness', 'mean_rating',
                     'n_rating', 'ratings_distribution', 'pro_rating', 'food',
                     'alcohol', 'grapes_merged', 'drinking_window']

    return wines.drop(columns=cols_to_drop).rename(columns=cols_to_rename)[cols_to_rearr]
