import scrapy
from scrapy_playwright.page import PageMethod
from ..items import WineItem, handlers
from ..url_input import SIMPLEWINE_DATA, URLListSpider

import json


class SimplewineSpider(URLListSpider):
    name = "simple_wine"
    n_items_per_page = 33
    n_items = 17
    # start_urls = [f"https://simplewine.ru/catalog/vino/filter/country-sloveniya/?page_number={num}"
    #               for num in range(1, ceil(n_items / n_items_per_page) + 1)]
    # start_urls = ["https://simplewine.ru/catalog/vino/filter/country-gruziya/?page-number=1"]

    async def start(self):
        for i, url in enumerate(self.urls, start=1):
            yield scrapy.Request(url, callback=self.parse_item, cb_kwargs={"item_name": url.split("/")[-2]},
                                 meta=dict(
                playwright=True,
                playwright_context="persistent_session",
                playwright_page_methods=[PageMethod("wait_for_selector", "h1")]
            )
            )

    # def _parse(self, response):
    #     return self.parse_items_list(response, None)

     # Extract url links to listed wines
    def parse_items_list(self, response, page_num):
        script = response.css('script[type="application/ld+json"]::text').getall()[1]
        data = json.loads(script)
        urls = self.get_urls(data)

        SIMPLEWINE_DATA.mkdir(parents=True, exist_ok=True)
        with open(SIMPLEWINE_DATA / f"slovenia_urls_page_{page_num}.json", "w", encoding="utf-8") as f:
            json.dump(urls, f, ensure_ascii=False, indent=4)

        for wine_url in urls:
            yield scrapy.Request(wine_url, callback=self.parse_item, cb_kwargs={"item_name": wine_url.split("/")[-2]},
                                 meta=dict(
                                     playwright=True,
                                     playwright_context="persistent_session",
                                     playwright_page_methods=[PageMethod(
                                         "wait_for_selector", 'h1')]
            )
            )

    def parse_item(self, response, item_name):
        print("going to ", response.url)
        # splitted = response.url.split("/")
        # item_name = splitted[-2] if response.url[-1] == "/" else splitted[-1]
        print("item_name", item_name)

        # Get data from api response
        script = response.css('script[type="application/json"]::text').get()
        wine_data = json.loads(script)[
            "props"]["pageProps"]["initialState"]["api"]["queries"][f'getProduct("{item_name}")']["data"]["data"]
        # print("wine_data", wine_data)
        # WineItem
        item = WineItem()
        item["name"] = wine_data["name"]
        item["n_reviews"] = wine_data["reviewsCount"]
        # item["ratings"] = [(d["code"], d["title"], d["value"]) for d in wine_data["ratings"]]
        item["ratings"] = wine_data["ratings"]
        item["price_base"] = wine_data["price"]["base"]["price"]
        item["manufacturer"] = wine_data.get("brand", {}).get(
            "manufacturer", {}).get("slug", None) if wine_data["brand"] else wine_data["brand"]
        item["url"] = response.url

        props = wine_data["properties"]

        for prop in props:
            if prop["code"] in handlers:
                func, item_key = handlers.get(prop["code"])
                item[item_key] = func(prop)

        # item["vintages"] = [(d["year"], d["basePrice"], d["code"]) for d in wine_data["vintages"]]
        item["vintages"] = wine_data["vintages"]

        if item["n_reviews"] > 0:
            yield scrapy.Request(response.url + "reviews", callback=self.parse_reviews,
                                 meta=dict(
                                     item=item,
                                     playwright=True,
                                     playwright_context="persistent_session",
                                     playwright_page_methods=[PageMethod(
                                         "wait_for_selector", "h1")]
                                 )
                                 )
        yield item

    def parse_reviews(self, response):
        response.meta["item"]["ratings_distr"] = response.css(
            "div.RatingMarksStatistics_markValue__40eXT::text").getall()
        yield response.meta["item"]

    def get_urls(self, data):
        return [d["itemOffered"]["url"] for d in data["itemListElement"]]
