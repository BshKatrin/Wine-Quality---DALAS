# Data collection

The project uses two collection approaches: Scrapy with Playwright for SimpleWine, and asynchronous HTTP requests to Vivino endpoints observed during the course project. These collectors are historical code; the current website responses have not been verified.

Install the `scraping` extra from the repository root. The commands below are explicit collection commands and contact the source websites. Collection is separate from analysis and offline verification.

## SimpleWine

The existing Python package name `playwright_scraper` is preserved so that `scrapy.cfg` continues to work. Inputs now load when a spider is instantiated, allowing `scrapy list` to run without the original URL file.

From the repository root:

```bash
mkdir -p data/raw/simplewine
python -m playwright install chromium
cd scraping
scrapy list
scrapy crawl simple_wine -o ../data/raw/simplewine/wines.json
```

Place a JSON array of product URLs at `data/raw/simplewine/urls_to_scrap.json`. To use another file, add `-a urls_file=/absolute/path/to/urls.json`. The `sw_reviews` spider collects rating distributions from review pages; it is not a completed review-text/NLP pipeline. The report states that user review text was not collected for the modeling work.

## Vivino

From the repository root:

```bash
# Arguments: browsing country, production country, currency
python scraping/vivino/collect_explore_page.py fr fr eur

# Arguments: browsing country, production country, currency, wine type, region ID
python scraping/vivino/collect_json_wines.py us us usd 1 1885
```

The second example selects type 1 (red) and region 1885 (California in the historical script). `--help` displays the argument descriptions without collecting data. All collector outputs go beneath `data/raw/vivino/`, independent of the current working directory.

Additional historical tools:

| File | Purpose / input |
| --- | --- |
| `winery_info.py` | Retrieve vintage information using IDs in `data/raw/vivino/TREAT_winerys_ids.txt` |
| `req_wine_info.py` | Retrieve checkout-price responses using IDs in `data/raw/vivino/TREAT_wines_ids.txt` |
| `coll_one_type.sh` | Historical batch across US regions and wine types; review its scope before running |
| `experiments/api_req_test.py` | One-off exploratory API request; makes a request on execution |
| `experiments/decode_param_chiffre.py` | Decode sample query parameters locally |

The batch script locates its Python collector relative to itself. Both ID collectors require their original ID lists. Page collectors retain delays and retry behavior. Scrapy retains its existing robots.txt and throttling settings.

## Parsing

After recovering the merged round responses, use `notebooks/01_parse_vivino.ipynb`. It expects `all_merged_round1.json` and `all_merged_round2.json` under `data/raw/vivino/`, and writes tables under `data/interim/vivino/`.

The scripts for merging individual response files into those round responses are absent. So are some subsequent source-merging and normalization steps; see `docs/reproducibility.md`.
