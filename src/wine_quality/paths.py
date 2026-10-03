"""Checkout-relative paths shared by the research notebooks."""

from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[2]
RAW_DATA = PROJECT_ROOT / "data" / "raw"
INTERIM_DATA = PROJECT_ROOT / "data" / "interim"
PROCESSED_DATA = PROJECT_ROOT / "data" / "processed"
FIGURES = PROJECT_ROOT / "artifacts" / "figures"
MODELS = PROJECT_ROOT / "artifacts" / "models"
