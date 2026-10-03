"""Check the research archive offline, without executing notebooks or collectors."""

import argparse
import ast
import base64
import hashlib
import json
import math
from pathlib import Path
import re
import sys
from urllib.parse import unquote

ROOT = Path(__file__).resolve().parents[1]
DATA_INPUTS = (
    "data/raw/vivino/all_merged_round1.json",
    "data/raw/vivino/all_merged_round2.json",
    "data/interim/grapes_merged.csv",
    "data/interim/vivino/filt_all_wines_parent.csv",
    "data/interim/wines_merged3.json",
    "data/processed/wines_inferred.json",
    "data/processed/wines_inferred_food_grapes.csv",
)


def check(require_data=False):
    errors = []
    for name in ("pyproject.toml", "uv.lock", "README.md", "reports/results.json",
                 "reports/DALAS_wine_project.pdf", "src/wine_quality/paths.py"):
        if not (ROOT / name).is_file():
            errors.append(f"Missing project artifact: {name}")

    for folder in ("src", "scraping", "scripts", "tests"):
        for path in (ROOT / folder).rglob("*.py"):
            try:
                ast.parse(path.read_text(encoding="utf-8"), filename=str(path))
            except SyntaxError as exc:
                errors.append(str(exc))

    notebooks = {}
    for path in sorted((ROOT / "notebooks").glob("*.ipynb")):
        try:
            notebook = json.loads(path.read_text(encoding="utf-8"))
            if notebook["nbformat"] != 4:
                errors.append(f"Unsupported notebook version: {path.name}")
            ids = [cell["id"] for cell in notebook["cells"]]
            if len(ids) != len(set(ids)):
                errors.append(f"Duplicate cell IDs: {path.name}")
            for index, cell in enumerate(notebook["cells"]):
                if cell["cell_type"] == "code":
                    source = "".join(cell["source"])
                    # These notebooks use line magics, not cell magics.
                    source = "\n".join(line for line in source.splitlines()
                                       if not line.lstrip().startswith(("%", "!")))
                    ast.parse(source, filename=f"{path.name}:cell-{index}")
            notebooks[str(path.relative_to(ROOT))] = notebook
        except (ValueError, KeyError, SyntaxError) as exc:
            errors.append(f"Invalid notebook {path.name}: {exc}")
    if len(notebooks) != 4:
        errors.append(f"Expected four notebooks, found {len(notebooks)}")

    for path in [ROOT / "README.md", *(ROOT / "docs").glob("*.md"),
                 ROOT / "data/README.md", ROOT / "scraping/README.md"]:
        if not path.is_file():
            errors.append(f"Missing documentation: {path.relative_to(ROOT)}")
            continue
        for link in re.findall(r"\]\(([^)]+)\)", path.read_text(encoding="utf-8")):
            if "://" in link or link.startswith("#"):
                continue
            target = unquote(link.split("#", 1)[0])
            if not (path.parent / target).exists():
                errors.append(f"Broken link in {path.relative_to(ROOT)}: {link}")

    try:
        results = json.loads((ROOT / "reports/results.json").read_text())
        report = ROOT / results["provenance"]["report"]
        if hashlib.sha256(report.read_bytes()).hexdigest() != results["provenance"]["report_sha256"]:
            errors.append("Report differs from the file used for the results summary")
        notebook = notebooks[results["provenance"]["notebook"]]
        cells = {cell["id"]: cell for cell in notebook["cells"]}
        for task, values in results["tasks"].items():
            cell = cells[values["source_cell_id"]]
            digest = hashlib.sha256(json.dumps(cell["outputs"], sort_keys=True).encode()).hexdigest()
            if digest != values["source_output_sha256"]:
                errors.append(f"Historical output changed: {task}")
            text = "".join("".join(output.get("text", []))
                           for output in cell["outputs"] if output.get("output_type") == "stream")
            for split in ("train", "test"):
                for names, pattern in (
                    (("mae", "mse", "r2"), r" metrics MAE (\S+) MSE (\S+) R2 (\S+)"),
                    (("precision", "recall", "f1", "accuracy"), r" metrics PREC (\S+) REC (\S+) F1 (\S+) ACC (\S+)"),
                ):
                    if not all(name in values[split] for name in names):
                        continue
                    match = re.search(split + pattern, text)
                    if not match:
                        errors.append(f"Missing metric evidence for {task}/{split}")
                        continue
                    for name, original in zip(names, match.groups()):
                        if not math.isclose(values[split][name], float(original), rel_tol=1e-12):
                            errors.append(f"Metric does not match historical output: {task}/{split}/{name}")
        shape_cell = cells[results["split"]["row_count_source_cell_id"]]
        shape_output = "".join("".join(o.get("data", {}).get("text/plain", []))
                               for o in shape_cell.get("outputs", []))
        shape = re.search(r"\(\((\d+), \d+\), \((\d+), \d+\)\)", shape_output)
        if not shape or tuple(map(int, shape.groups())) != (
                results["split"]["train_rows"], results["split"]["test_rows"]):
            errors.append("Split row counts do not match saved notebook output")
        for original_index, name in ((55, "model_comparison_classification.png"),
                                     (101, "shap_rating_summary.png")):
            cell = notebook["cells"][original_index + 2]
            output = next(o for o in cell["outputs"] if "image/png" in o.get("data", {}))
            if (ROOT / "reports/figures" / name).read_bytes() != base64.b64decode(output["data"]["image/png"]):
                errors.append(f"Historical figure differs from notebook: {name}")
    except (ValueError, KeyError, OSError, StopIteration) as exc:
        errors.append(f"Cannot verify result provenance: {exc}")

    missing = [name for name in DATA_INPUTS if not (ROOT / name).is_file()]
    if require_data:
        errors.extend(f"Missing historical input: {name}" for name in missing)
    return errors, missing


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--require-data", action="store_true",
                        help="Also fail if expected historical notebook inputs are absent")
    args = parser.parse_args()
    errors, missing = check(args.require_data)
    if errors:
        for error in errors:
            print(f"ERROR: {error}", file=sys.stderr)
        return 1
    print("Project syntax, documentation links, and historical results checked successfully.")
    if missing:
        print(f"Historical data: {len(missing)} expected inputs absent; full notebook runs need recovery.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
