import requests
import json
import asyncio
import aiohttp
import random
import math
import os
import argparse
from pathlib import Path

# avilable params

# collect the wines USING EXPLORE PAGES

# what is /api/wines/1152755/checkout_prices -> wine id give this
"""
country_code, country_codes, currency_code, discount_prices, food_ids, 
grape_ids, grape_filter, max_rating, merchant_id, merchant_type, min_rating, 
min_ratings_count, order_by, order, page, per_page, price_range_max, 
price_range_min, region_ids, wine_style_ids, wine_type_ids, winery_ids, 
vintage_ids, wine_years, excluding_vintage_id, wsa_year, top_list_filter
"""

parser = argparse.ArgumentParser(description="Collect Vivino pages by wine type and region.")
parser.add_argument("shipping_country")
parser.add_argument("origin_country")
parser.add_argument("currency")
parser.add_argument("wine_type", type=int, choices=[1, 2, 3, 4, 7, 24])
parser.add_argument("region", type=int, help="Vivino region ID")
args = parser.parse_args()
p1, p2, p3, p4, p5 = args.shipping_country, args.origin_country, args.currency, args.wine_type, args.region

url = "https://www.vivino.com/api/explore/explore"

headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:66.0) Gecko/20100101 Firefox/66.0",
    "Accept-Language": "en-US;q=0.8,en;q=0.7",
    "Referer": "https://www.vivino.com/",
    # "Cookies" : "vivino_location=US; vivino_currency=USD;"
}

base_params = {
    "country_code": p1,          # Country where the user is browsing from
    "country_codes[]": p2,       # Filter: only show wines from France
    "locale": "en", # ?
    "currency_code": p3,        # Currency for prices
    "facets": "false",             # Disable facets (aggregation counts)
    "grape_filter": "varietal",    # Filter wines by grape variety
    "min_rating": 0,             # Minimum Vivino rating
    "order_by": "best_picks",      # Sort by Vivino’s “best picks”
    "order": "desc",               # Descending order
    "price_range_max": 10000000,   # Maximum price
    "price_range_min": 0,          # Minimum price
    "wine_type_ids[]": p4,          # 1 = Red wine
    "page": 1,                     # Page number for pagination
    "language": "en",              # Language for results (optional)
    "per_page": 50,
    "region_ids[]": int(p5),
}

typew = {
    1: "red",
    2: "white",
    3: "spark",
    4: "rose",
    7: "dessert",
    24: "fortif",
}


CONCURRENCY_LIMIT = 10     # Simultaneous requests
RETRY_LIMIT = 3            # Retries per failed request
PER_REQUEST_DELAY = (0.5, 3)  # Random delay range per request
BATCH_DELAY = 7                 # Delay between batches

DATA_DIR = Path(__file__).resolve().parents[2] / "data/raw/vivino"
OUTPUT_DIR = DATA_DIR / f"{typew[int(p4)]}_{p2}_{p3}_jsons"        # Folder to store individual page files

async def fetch_page(session, page):
    """Fetch a single page of wines, with retry and random delay."""
    params = base_params.copy()
    params["page"] = page

    filename = os.path.join(OUTPUT_DIR, f"page_s{p5}_{page}.json") # added states

    if os.path.exists(filename):
        print(f"Page {page} already exists, skipping.")
        return None

    for attempt in range(RETRY_LIMIT):
        try:
            delay = random.uniform(*PER_REQUEST_DELAY)
            await asyncio.sleep(delay)

            async with session.get(url, params=params, headers=headers) as response:
                if response.status != 200:
                    print(f"Page {page} failed ({response.status}), retry {attempt+1}")
                    await asyncio.sleep(2)
                    continue

                data = await response.json()
                matches = data.get("explore_vintage", {}).get("matches", [])

                with open(filename, "w", encoding="utf-8") as f:
                    json.dump(matches, f, ensure_ascii=False, indent=4)

                return matches

        except aiohttp.ClientError as e:
            print(f"Network error on page {page}: {e}, retrying...")
            await asyncio.sleep(2)

    print(f"Giving up on page {page} after {RETRY_LIMIT} retries.")
    return []

async def get_total_pages(session):
    """Fetch the first page to calculate total number of pages."""
    async with session.get(url, params=base_params, headers=headers) as response:
        if response.status != 200:
            raise Exception(f"Failed to get total pages: {response.status}")
        data = await response.json()

        explore = data.get("explore_vintage", {})
        total_records = explore.get("records_matched", 0)
        per_page = base_params["per_page"]
        total_pages = math.ceil(total_records / per_page)

        print(f"Found {total_records} wines — {total_pages} total pages.")
        return total_pages


async def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    connector = aiohttp.TCPConnector(limit=CONCURRENCY_LIMIT)

    async with aiohttp.ClientSession(connector=connector) as session:
        # Step 1: detect total pages
        total_pages = await get_total_pages(session)

        # Step 2: fetch all pages in batches
        for start in range(1, total_pages + 1, CONCURRENCY_LIMIT):
            batch_pages = [
                page for page in range(start, min(start + CONCURRENCY_LIMIT, total_pages + 1))
                if not os.path.exists(os.path.join(OUTPUT_DIR, f"page_s{p5}_{page}.json"))
            ]
            if not batch_pages:
                continue  # skip if all in this batch already exist

            tasks = [fetch_page(session, page) for page in batch_pages]
            await asyncio.gather(*tasks)

            print(f"Processed pages {batch_pages[0]}–{batch_pages[-1]}")
            await asyncio.sleep(BATCH_DELAY)  # throttle between batches

if __name__ == "__main__":
    asyncio.run(main())
