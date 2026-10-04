"""Exercise export with a tiny fitted test fixture, never the course results."""
import json
from pathlib import Path
import tempfile
import unittest

import numpy as np
import pandas as pd
from catboost import CatBoostRegressor

from wine_quality.web_export import export_test_collection


class WebExportTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.x = pd.DataFrame({"Price": [10., 12., 17., 23., 34., 48., 64., 78.],
                              "Country": ["France", "Italy"] * 4}, index=range(100, 108))
        cls.y = pd.Series([3.2, 3.3, 3.5, 3.6, 3.8, 4., 4.1, 4.2], index=cls.x.index)
        cls.model = CatBoostRegressor(iterations=5, depth=2, verbose=False,
                                     cat_features=["Country"], allow_writing_files=False)
        cls.model.fit(cls.x.iloc[:6], cls.y.iloc[:6])
        cls.metadata = pd.DataFrame([
            {"id": f"fixture-{i}", "name": "Export test fixture", "producer": "Test producer",
             "country": "France", "region": "Test region", "type": "Red", "year": 2020,
             "grapes": ["Merlot"], "priceUsd": float(cls.x.loc[i, "Price"]), "alcohol": 13.}
            for i in cls.x.index[6:]], index=cls.x.index[6:])

    def export(self, directory, **overrides):
        args = dict(model=self.model, x_test=self.x.iloc[6:], y_test=self.y.iloc[6:],
                    metadata=self.metadata, training_index=self.x.index[:6],
                    output=Path(directory) / "collection.json", name="Export validation fixture",
                    model_name="Tiny test regressor", feature_groups={"Price": "Price", "Country": "Origin"})
        args.update(overrides)
        return export_test_collection(**args)

    def test_native_shap_reconstructs_exported_predictions(self):
        with tempfile.TemporaryDirectory() as directory:
            mask = pd.DataFrame(False, index=self.x.index[6:], columns=self.x.columns)
            mask.iloc[0, 0] = True
            path = self.export(directory, imputed=mask)
            data = json.loads(path.read_text())
            self.assertEqual(data["source"], "test")
            self.assertEqual(len(data["wines"]), 2)
            self.assertTrue(data["wines"][0]["shap"][0]["imputed"])
            for wine in data["wines"]:
                self.assertAlmostEqual(wine["baseValue"] + sum(s["contribution"] for s in wine["shap"]),
                                       wine["predictedRating"], places=6)

    def test_rejects_overlapping_or_misaligned_rows(self):
        with tempfile.TemporaryDirectory() as directory:
            with self.assertRaisesRegex(ValueError, "disjoint"):
                self.export(directory, training_index=self.x.index)
            with self.assertRaisesRegex(ValueError, "ordered indices"):
                self.export(directory, metadata=self.metadata.iloc[::-1])
            self.assertFalse((Path(directory) / "collection.json").exists())

    def test_rejects_invalid_ratings_and_display_fields(self):
        with tempfile.TemporaryDirectory() as directory:
            with self.assertRaisesRegex(ValueError, "1–5 scale"):
                self.export(directory, y_test=pd.Series([0., 1.], index=self.x.index[6:]))
            missing = self.metadata.copy()
            missing.loc[106, "priceUsd"] = np.nan
            with self.assertRaisesRegex(ValueError, "outside"):
                self.export(directory, metadata=missing)


if __name__ == "__main__":
    unittest.main()
