import scrapy
from scrapy_playwright.page import PageMethod
from ..items import ReviewItem
from ..url_input import URLListSpider
import json


class SwReviewsSpider(URLListSpider):
    name = "sw_reviews"
    # allowed_domains = ["simplewine.ru"]
    # start_urls = ["https://simplewine.ru/"]
    async def start(self):
        for url in self.urls:
            yield scrapy.Request(url + "reviews", callback=self.parse_item, cb_kwargs={"url": url},
                                 meta=dict(
                playwright=True,
                playwright_context="persistent_session",
                playwright_page_methods=[PageMethod("wait_for_selector", "h1")]
            )
            )

    def parse_item(self, response, url):
        item = ReviewItem()
        item["url"] = url
        item["ratings_distr"] = response.css("div.RatingMarksStatistics_markValue__40eXT::text").getall()
        print(item)
        yield item
