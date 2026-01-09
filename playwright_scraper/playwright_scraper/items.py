# Define here the models for your scraped items
#
# See documentation in:
# https://docs.scrapy.org/en/latest/topics/items.html

from scrapy import Item, Field


class WineItem(Item):
    name = Field()
    n_reviews = Field()  # sections[reviewsCount]
    ratings = Field()  # ratings [(code, title, value), ...], pro and user ratings
    price_base = Field()  # price[base][price]
    manufacturer = Field()  # = brand = winery manufacturer[slug]
    year = Field()  # code = year, value
    volume = Field()
    country = Field()  # code = country, value[value]
    color = Field()  # code = color, value[value]
    sugar_type = Field()  # code = sugarType, value[value]
    grape = Field()  # code = grapeContent, value[(slug, value)] -> list
    region = Field()  # code = region, value[value]
    orange = Field()  # 1 for True, 0 for False
    appellation = Field()

    # Tastes. 0 = Null value
    smokiness = Field()
    bodied = Field()
    richness = Field()
    spice = Field()
    fruitiness = Field()
    colorness = Field()
    sweetness = Field()
    acidity = Field()
    tanins = Field()
    woodiness = Field()

    # serving temp
    temp_from = Field()
    temp_to = Field()

    food = Field()  # list of foods
    description = Field()  # data[code = description] = value
    storage_capacity = Field()  # data[code = storageCapacity] = value
    decantation_aeration = Field()  # data[code = decantation] = value
    alcohol_percent = Field()  # data[code = strongness] = value

    ratings_distr = Field()  # list of (n of 5 stars, 4, 3, 2, 1)
    vintages = Field()  # dict

    # extre props
    premium_pack = Field()
    brand_desc = Field()

    degustation_desc = Field()
    gastronomy_desc = Field()
    grapes_desc = Field()
    method_aging_desc = Field()
    method_production_desc = Field()
    bundle_desc = Field()
    set_desc = Field()
    history_label_desc = Field()
    its_interesting_desc = Field()
    aging_tank = Field()
    rear_value = Field()

    url = Field()


class ReviewItem(Item):
    url = Field()  # parent wine name
    ratings_distr = Field()  # pro ratings only. Users ratings dont change

# Handlers for filling


def get_value(d):
    return d["value"]


def get_value_slug(d):
    return (d["value"].get("slug", None), d["value"].get("value", None))


def get_id_lst(lst):
    return [d["id"] for d in lst["value"]]


handlers = {
    "year": (get_value, "year"),
    "netVolume": (get_value, "volume"),
    "country": (get_value_slug, "country"),
    "color": (get_value_slug, "color"),
    "sugarType": (get_value_slug, "sugar_type"),
    "grapeContent": (get_value, "grape"),
    "region": (get_value_slug, "region"),
    "orange": (get_value, "orange"),
    "appellation": (get_value_slug, "appellation"),
    "smokiness": (get_value, "smokiness"),
    "bodied": (get_value, "bodied"),
    "richness": (get_value, "richness"),
    "spice": (get_value, "spice"),
    "fruitiness": (get_value, "fruitiness"),
    "colorness": (get_value, "colorness"),
    "sweetness": (get_value, "sweetness"),
    "acidity": (get_value, "acidity"),
    "tanins": (get_value, "tanins"),
    "woodiness": (get_value, "woodiness"),
    "temperatureTo": (get_value, "temp_to"),
    "temperatureFrom": (get_value, "temp_from"),
    "food": (get_id_lst, "food"),
    "description":  (get_value, "description"),
    "storageCapacity": (get_value, "storage_capacity"),
    "decantation": (get_value_slug, "decantation_aeration"),
    "strongness": (get_value, "alcohol_percent"),
    "degustationCharacteristics": (get_value, "degustation_desc"),
    "gastronomy": (get_value, "gastronomy_desc"),
    "grapesDesc": (get_value, "grapes_desc"),
    "methodAging": (get_value, "method_aging_desc"),
    "methodProduction": (get_value, "method_production_desc"),
    "bundleDescription": (get_value, "bundle_desc"),
    "setDescription": (get_value, "set_desc"),
    "historyLabels": (get_value, "history_label_desc"),
    "itsInteresting": (get_value, "its_interesting_desc"),
    "agingTank": (get_value_slug, "aging_tank"),
    "rearLabel": (get_value, "rear_value")
}
