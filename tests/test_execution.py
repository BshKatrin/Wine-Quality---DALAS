"""Small fixtures for corrected paths; these do not reproduce course results."""

import ast
import contextlib
import importlib.util
import io
import json
from pathlib import Path
import unittest

import numpy as np
import pandas as pd

from wine_quality.imputation import impute_row, impute_wines_df, infer_alcohol

ROOT = Path(__file__).resolve().parents[1]


class ImputationTests(unittest.TestCase):
    def test_missing_taste_uses_matching_grapes_and_preserves_observed_value(self):
        group = pd.DataFrame({
            "grapes": [["merlot"], {"merlot"}, {"syrah"}],
            "acidity": [np.nan, 3.0, 5.0],
            "tannin": [2.0, 4.0, 5.0],
        })
        result = impute_row(group.iloc[0], group, "grapes", ["acidity", "tannin"])
        self.assertEqual(result["acidity"], 3.0)
        self.assertEqual(result["tannin"], 2.0)
        self.assertNotIn("distances", group.columns)

    def test_missing_grapes_or_no_overlap_leaves_taste_missing(self):
        for grapes in (np.nan, [], {"unknown"}):
            group = pd.DataFrame({"grapes": [grapes, {"merlot"}], "acidity": [np.nan, 3.0]})
            result = impute_row(group.iloc[0], group, "grapes", ["acidity"])
            self.assertTrue(pd.isna(result["acidity"]))

    def test_alcohol_weighting_preserves_observed_vintages(self):
        wines = pd.DataFrame({
            "id": [1, 2, 3], "id_parent": [10, 10, 10],
            "alcohol": [12.0, 14.0, np.nan], "alcohol_parent": [15.0] * 3,
        })
        inferred = infer_alcohol(wines, True).set_index("id")
        self.assertEqual(inferred.loc[1, "alcohol"], 12.0)
        self.assertAlmostEqual(inferred.loc[3, "alcohol"], 13 * 2 / 3 + 15 / 3)
        self.assertEqual(inferred.loc[3, "inferred"], "Inferred")

    def test_combined_helper_keeps_sparkling_sweetness_and_parent_grapes(self):
        # Include the historical schema consumed by the combined helper.
        row = {
            "id": 1, "id_parent": 10, "alcohol": 12.0, "alcohol_parent": 12.0,
            "type": "spark", "sweetness": 1.2, "fizziness": 4.5,
            "intensity": 2.0, "acidity": 3.0, "tannin": np.nan,
            "grapes": np.nan, "parent_grapes": [1],
            "window_end_year": 2025, "window_start_year": 2020,
            "VIVINO_rating": np.nan,
        }
        for column in ("allergens", "JS_rating", "WS_rating", "parent_style_grapes",
                       "grape_composition", "seo_name", "name", "year", "country",
                       "region_name", "winery_name", "base_volume", "price", "base_currency",
                       "mean_rating", "n_rating", "ratings_distribution", "food"):
            row[column] = np.nan
        for taste in ("intensity", "tannin", "sweetness", "acidity", "fizziness"):
            row[f"style_baseline_structure_{taste}"] = np.nan
        grapes = pd.DataFrame({"id": [1], "name": ["Chardonnay"]})
        result = impute_wines_df(pd.DataFrame([row]), pd.DataFrame(), grapes)
        self.assertEqual(result.iloc[0]["sweetness"], 1.2)
        self.assertEqual(len(result.iloc[0]["grapes_merged"]), 1)
        self.assertEqual(result.iloc[0]["drinking_window"], 5)


@unittest.skipUnless(importlib.util.find_spec("sklearn"), "Install the analysis extra for modeling checks")
class NotebookEvaluationTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        from sklearn.base import BaseEstimator, TransformerMixin
        from sklearn.metrics import (accuracy_score, f1_score, mean_absolute_error,
                                     mean_squared_error, precision_score, r2_score, recall_score)
        from sklearn.preprocessing import MultiLabelBinarizer, OneHotEncoder, TargetEncoder

        names = ("CustPipeline", "cut_quant", "cut_quant_test", "evaluate_regression",
                 "evaluate_price_relative")
        cls.namespace = dict(np=np, pd=pd, BaseEstimator=BaseEstimator,
                             TransformerMixin=TransformerMixin, accuracy_score=accuracy_score,
                             f1_score=f1_score, mean_absolute_error=mean_absolute_error,
                             mean_squared_error=mean_squared_error, precision_score=precision_score,
                             r2_score=r2_score, recall_score=recall_score,
                             MultiLabelBinarizer=MultiLabelBinarizer, OneHotEncoder=OneHotEncoder,
                             TargetEncoder=TargetEncoder)
        notebook = json.loads((ROOT / "notebooks/04_models_and_explanations.ipynb").read_text())
        for cell in notebook["cells"]:
            if cell["cell_type"] != "code":
                continue
            source = "\n".join(line for line in "".join(cell["source"]).splitlines()
                               if not line.lstrip().startswith(("%", "!")))
            module = ast.parse(source)
            selected = [node for node in module.body
                        if isinstance(node, (ast.FunctionDef, ast.ClassDef)) and node.name in names]
            if selected:
                exec(compile(ast.Module(body=selected, type_ignores=[]), "notebook-functions", "exec"),
                     cls.namespace)

    def frame(self):
        return pd.DataFrame({
            "type": ["red"] * 40, "country": ["France"] * 40,
            "region_name": ["Bordeaux"] * 40, "winery_name": ["Example"] * 40,
            "food_filt": [["beef"] for _ in range(40)],
            "grapes_merged": [["merlot"] for _ in range(40)],
            "price": np.exp(np.linspace(0, 4, 40)),
            "mean_rating": np.tile([3.0, 3.2, 3.4, 3.6], 10),
        })

    class ConstantModel:
        def __init__(self, value):
            self.value = value

        def fit(self, X, y):
            self.columns = list(X.columns)
            return self

        def predict(self, X):
            return np.full(len(X), self.value)

    def test_rating_evaluation_keeps_price_and_returns_rating_outputs(self):
        model = self.ConstantModel(3.3)
        with contextlib.redirect_stdout(io.StringIO()):
            result = self.namespace["evaluate_regression"](model, self.frame(), self.frame())
        self.assertEqual(len(result), 8)
        self.assertIn("price", model.columns)
        self.assertAlmostEqual(result[0], 0.2)
        self.assertAlmostEqual(result[1], 0.05)
        self.assertIn("mean_rating", result[6].columns)

    def test_price_relative_evaluation_removes_price_and_uses_zero_threshold(self):
        model = self.ConstantModel(0.1)
        with contextlib.redirect_stdout(io.StringIO()):
            result = self.namespace["evaluate_price_relative"](model, self.frame(), self.frame())
        self.assertEqual(len(result), 13)
        self.assertNotIn("price", model.columns)
        self.assertNotIn("mean_rating", model.columns)
        self.assertAlmostEqual(result[3], 0.5)
        self.assertAlmostEqual(result[4], 1.0)
        self.assertAlmostEqual(result[5], 2 / 3)
        self.assertAlmostEqual(result[6], 0.5)

    def test_imputation_notebook_excludes_both_distillate_ids(self):
        notebook = json.loads((ROOT / "notebooks/02_imputation.ipynb").read_text())
        cell = next(c for c in notebook["cells"]
                    if c["cell_type"] == "code" and "# distillates" in "".join(c["source"]))
        filtering = next(line for line in "".join(cell["source"]).splitlines() if "# distillates" in line)
        namespace = {"wines": pd.DataFrame({"id": [142522005, 144353810, 42]})}
        exec(filtering, namespace)
        self.assertEqual(namespace["wines"]["id"].tolist(), [42])


if __name__ == "__main__":
    unittest.main()
