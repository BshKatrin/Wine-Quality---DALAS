import requests
import json
import os
import time
import random
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

# COLLECT LIST OF VINTAGE GIVEN WINERY

# ---------------- CONFIG ----------------
DATA_DIR = Path(__file__).resolve().parents[2] / "data/raw/vivino"
INPUT_FILE = DATA_DIR / "TREAT_winerys_ids.txt"  # list of IDs, one per line
OUTPUT_DIR = DATA_DIR / "new_winery_info"               # where to save results


NUM_WORKERS = 3      # number of concurrent threads
BASE_DELAY = (1, 4)  # random delay range in seconds between requests
# ----------------------------------------

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:66.0) Gecko/20100101 Firefox/66.0",
    "Accept-Language": "en-US;q=0.8,en;q=0.7",
    "Referer": "https://www.vivino.com/",
}

BASE_PARAMS = {
    "country_code": "us",
    "locale": "en",
    "currency_code": "eur",
    "language": "en",
}

def fetch_wine(wine_id: int):
    """Fetch and save data for one wine ID."""
    output_path = OUTPUT_DIR / f"winery_{wine_id}_infos.json"
    if output_path.exists():
        print(f"Already have {wine_id}")
        return
    
    url = f"https://www.vivino.com/api/wines/{wine_id}/checkout_prices"
    time.sleep(random.uniform(*BASE_DELAY))  # random pause between requests

    try:
        response = requests.get(url, params=BASE_PARAMS, headers=HEADERS, timeout=10)
        if response.status_code != 200:
            print(f"ID {wine_id} failed ({response.status_code})")
            return

        data = response.json()
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=4)
        print(f"Saved {wine_id}")

    except requests.RequestException as e:
        print(f"Network error for {wine_id}: {e}")


def main():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    # Read all wine IDs from file
    if not os.path.exists(INPUT_FILE):
        print(f"Input file '{INPUT_FILE}' not found!")
        return
    
    with open(INPUT_FILE, "r", encoding="utf-8") as f:
        content = f.read()
        wine_ids = content.split()  
        print(f"Loaded {len(wine_ids)} IDs")

    with ThreadPoolExecutor(max_workers=NUM_WORKERS) as executor:
        futures = [executor.submit(fetch_wine, int(wid)) for wid in wine_ids]

        for future in as_completed(futures):
            # result is handled inside fetch_wine()
            pass


if __name__ == "__main__":
    main()
