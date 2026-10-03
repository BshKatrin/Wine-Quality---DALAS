"""Load crawl inputs when a spider is instantiated, not during discovery."""

import json
from pathlib import Path

import scrapy

SIMPLEWINE_DATA = Path(__file__).resolve().parents[2] / "data/raw/simplewine"


class URLListSpider(scrapy.Spider):
    def __init__(self, *args, urls_file=None, **kwargs):
        super().__init__(*args, **kwargs)
        path = Path(urls_file) if urls_file else SIMPLEWINE_DATA / "urls_to_scrap.json"
        if not path.is_file():
            raise FileNotFoundError(
                f"Missing URL list: {path}. Provide a JSON array of product URLs "
                "or pass -a urls_file=/absolute/path/to/urls.json."
            )
        urls = json.loads(path.read_text(encoding="utf-8"))
        if not isinstance(urls, list) or not all(isinstance(url, str) for url in urls):
            raise ValueError("The URL file must contain a JSON array of strings.")
        self.urls = urls
