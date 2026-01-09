import pandas as pd
import numpy as np
import ast

from .translation import translate


def preprocess_simplewine(json_path: str, save_path: str):
    """Preprocess simplewine dataset"""
    def inverse_lst(row):
        return list(reversed(row)) if isinstance(row, list) else row

    def translate_grapes(row):
        return {translate["grape"][g[0]]: g[1] for g in row}

    wines = pd.read_json(json_path)

    # White wines that are orange are set to orange
    wines.loc[(wines["orange"] == 1), "color"] = "orange"

    # Drop some countries
    wines = wines[~wines["country"].isin(["Греция", "Венгрия"])]

    # Drop gift sets
    wines = wines[~wines["name"].str.contains("подар")]

    # Add currency columns
    wines = wines.assign(currency="RUB")

    # inverse ratings distribution to match 1...5 stars
    wines["ratings_distr"] = wines["ratings_distr"].apply(inverse_lst)

    wines["grape"] = wines["grape"].map(translate_grapes)
    wines["region"] = wines["region"].map(lambda row: row[-1] if isinstance(row, list) else row)
    for col in translate:
        if col == "grape":
            continue
        wines[col] = wines[col].replace(translate[col])

    foods = wines["food"].explode().map(translate["food"]).explode()
    wines["food"] = foods.groupby(foods.index).agg(lambda x: x.to_list())

    cols_rename = {"rating_JS": "JS_rating",
                   "rating_mean": "mean_rating",
                   "rating_VIVINO": "VIVINO_rating",
                   "rating_WS": "WS_rating",
                   "n_reviews": "n_rating",
                   "ratings_distr": "ratings_distribution"}

    wines = wines.rename(columns=cols_rename)
    wines.to_json(save_path)


def get_vintages_codes(row):
    return [d["code"] for d in row]


def str_to_json(df: pd.DataFrame, col: str):
    def map_func(row):
        # if pd.isna(row):
        #     return np.nan
        try:
            return ast.literal_eval(row)
        except:
            return row
    df[col] = df[col].map(lambda row: map_func(row))


def get_parent_grapes(parent: pd.DataFrame, separate: bool = False) -> pd.Series:
    def get_set(lst, key):
        return set(d[key] for d in lst) if isinstance(lst, list) else set()

    if separate:
        return parent["grapes"].map(lambda row: [d["id"] for d in row] if isinstance(row, list) else row), parent["style_grapes"].map(lambda row: [d["id"] for d in row] if isinstance(row, list) else row),

    grapes_sets = parent[["grapes", "style_grapes"]].apply(
        lambda row: list(get_set(row["grapes"], "id") | get_set(row["style_grapes"], "id")),
        axis=1)

    # grapes_sets = pd.DataFrame(data={"id_parent": parent["id"], "grapes_set": grapes_sets})
    # return pd.merge(data, grapes_sets, on="id_parent", how="left")
    return grapes_sets


def get_parent_food(parent) -> pd.Series:
    def get_lst(lst):
        return [d["name"] for d in lst] if isinstance(lst, list) else []

    return parent["style_food"].map(get_lst)


def calc_rating(data):
    def distr_to_mean(row):
        if row is None or row == []:
            return pd.Series([0, 0])

        s = sum(stars * n_stars for stars, n_stars in enumerate(row, start=1))
        n = sum(n_stars for n_stars in row)
        m = s / n if n > 0 else 0
        return pd.Series([m, n])

    data[["mean_rating", "n_rating"]] = data["ratings_distribution"].apply(distr_to_mean)


def calc_std(row, stars):
    if row is None or row == [] or np.isnan(row).all():
        return pd.Series([np.nan, np.nan, np.nan])

    row = np.asarray(row)
    if np.all(row == 0):
        return pd.Series([np.nan, np.nan, np.nan])

    cum_counts = np.cumsum(row)
    total = row.sum()

    median = stars[np.searchsorted(cum_counts, total / 2)]
    mean = np.average(stars, weights=row)
    std = np.sqrt(np.average((stars - mean)**2, weights=row))
    return pd.Series([median, mean, std])


def clean_year(data):
    data["year"] = pd.to_numeric(data["year"].replace("N.V.", pd.NA)).astype('Int64')
