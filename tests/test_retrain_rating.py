"""Checks for split-safe preparation and truthful display mapping."""

from pathlib import Path
import ast
import tempfile
import unittest

import numpy as np
import pandas as pd

from wine_quality.retrain_rating import (
    FEATURES, RatingPreprocessor, display_metadata, load_modeling_table,
)


class RetrainRatingTest(unittest.TestCase):
    def fixture(self) -> pd.DataFrame:
        values = {column: [1, 2, 3] for column in FEATURES}
        values.update({
            "id": [10, 142522005, 11],
            "mean_rating": [4.1, 4.2, 3.7],
            "type": ["red", "white", "fortif"],
            "country": ["France", "France", "Italy"],
            "region_name": ["Loire", "Bordeaux", "Tuscany"],
            "winery_name": ["A", "B", "C"],
            "year": [2020, 2021, np.nan],
            "price": [20.0, 30.0, 40.0],
            "alcohol": [13.0, 12.0, np.nan],
            "food_filt": ["['beef']", "['fish']", "['cheese']"],
            "grapes_merged": ["['merlot']", "['pinot']", "['new_grape']"],
            "name": ["First", "Excluded", "Third"],
        })
        return pd.DataFrame(values)

    def test_source_row_and_notebook_filters_survive_loading(self):
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / "fixture.csv"
            self.fixture().to_csv(path, index=False)
            frame = load_modeling_table(path)
        self.assertEqual(frame.index.tolist(), [0, 2])
        self.assertEqual(frame["mean_rating"].tolist(), [4.1, 3.7])

    def test_vocabulary_is_fitted_only_on_supplied_training_rows(self):
        frame = self.fixture().iloc[[0, 2]].copy()
        frame["food_filt"] = frame["food_filt"].map(ast.literal_eval)
        frame["grapes_merged"] = frame["grapes_merged"].map(ast.literal_eval)
        processor = RatingPreprocessor().fit(frame.iloc[:1])
        test, mask = processor.transform(frame.iloc[1:])
        self.assertNotIn("grape::new_grape", test.columns)
        self.assertNotIn("food::cheese", test.columns)
        self.assertEqual(test.loc[2, "grape::merlot"], 0)
        self.assertFalse(mask.loc[2, "alcohol"])
        self.assertTrue(np.isnan(test.loc[2, "alcohol"]))

    def test_fortified_style_and_ids_preserve_source_row(self):
        frame = self.fixture().iloc[[2]].copy()
        frame["grapes_merged"] = [["new_grape"]]
        metadata = display_metadata(frame)
        self.assertEqual(metadata.loc[2, "type"], "Fortified")
        self.assertEqual(metadata.loc[2, "id"], "wine-11-row-2")
        self.assertTrue(pd.isna(metadata.loc[2, "year"]))


if __name__ == "__main__":
    unittest.main()
