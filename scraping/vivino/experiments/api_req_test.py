import requests
import json

url = "https://www.vivino.com/api/explore/explore"
# url = "https://www.vivino.com/api/checkout_prices?vintage_id=14148802"
# url = "https://www.vivino.com/api/vintages/164978317"
# url = "https://www.vivino.com/api/wines/1152755/checkout_prices" # to get wines lists
# url = "https://www.vivino.com/api/regions" # get regions


headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:66.0) Gecko/20100101 Firefox/66.0",
    # "Cookie": "vivino_location=US; vivino_currency=USD;",
    "Accept-Language": "en-US;q=0.8,en;q=0.7",
    "Referer": "https://www.vivino.com/",
}

# list of countries to do
country_codes = {
    "argentina": "ar",
    "australia": "au",
    "austria": "at",
    "chile": "cl",
    "france": "fr",
    "germany": "de",
    "italy": "it",
    "portugal": "pt",
    "spain": "es",
    "united states": "us"
}

# cries internally
country_codes_2 = {
    "greece": "gr",
    "hungary": "hu",
    "south africa": "za",
    "mexico": "mx",
    "brazil": "br",
    "netherlands": "nl",
    "belgium": "be",
    "new zealand": "nz",
    "slovenia": "si",
    "georgia": "ge"
}

states = {
    "Alabama": 59,
    "Alaska": 63,
    "Arizona": 38,
    "Arkansas": 1878,
    "California": 1885,
    "Colorado": 134,
    "Connecticut": 150,
    "Delaware": 2103,
    "Columbia": 327,
    "Florida": 154,
    "Georgia": 892,
    "Hawaii": 156,
    "Idaho": 158,
    "Illinois": 166,
    "Indiana": 169,
    "Iowa": 177,
    "Kansas": 192,
    "Kentucky": 357,
    "Louisiana": 204,
    "Maine": 360,
    "Maryland": 209,
    "Massachusetts": 362,
    "Michigan": 217,
    "Minnesota": 225,
    "Mississippi": 1494,
    "Missouri": 228,
    "Montana": 312,
    "Nebraska": 234,
    "Nevada": 1901,
    "New Hampshire": 370,
    "New Jersey": 923,
    "New Mexico": 241,
    "New York": 247,
    "North Carolina": 269,
    "North Dakota": 276,
    "Ohio": 278,
    "Oklahoma": 280,
    "Oregon": 45,
    "Pennsylvania": 285,
    "Rhode Island": 289,
    "South Carolina": 291,
    "South Dakota": 293,
    "Tennessee": 297,
    "Texas": 299,
    "Utah": 347,
    "Vermont": 366,
    "Virginia": 318,
    "Washington": 323,
    "West Virginia": 1558,
    "Wisconsin": 239,
    "Wyoming": 237,
}

currency_codes = {
    "argentina": "ARS",   # Argentine Peso
    "australia": "AUD",   # Australian Dollar
    "austria": "EUR",     # Euro
    "chile": "CLP",       # Chilean Peso
    "france": "EUR",      # Euro
    "germany": "EUR",     # Euro
    "italy": "EUR",       # Euro
    "portugal": "EUR",    # Euro
    "spain": "EUR",       # Euro
    "united states": "USD", # US Dollar

    "greece": "EUR",
    "hungary": "HUF",
    "south africa": "ZAR",
    "mexico": "MXN",
    "brazil": "BRL",
    "netherlands": "EUR",
    "belgium": "EUR",
    "new zealand": "NZD",
    "slovenia": "EUR",
    "georgia": "GEL"
}

params = {
    "country_code": "us",          # Country where the user is browsing from, not working for us
    "country_codes[]": "mx",       # Filter: only show wines
    "currency_code": "usd",        # Currency for prices
    "facets": "false",             # Disable facets (aggregation counts)?
    "grape_filter": "varietal",    # Filter wines by grape variety
    "min_rating": 0,             # Minimum Vivino rating
    "order_by": "best_picks",      # Sort by Vivino’s “best picks”
    "order": "desc",               # Descending order
    "price_range_max": 100000000,       # Maximum price
    "price_range_min": 0,          # Minimum price
    "wine_type_ids[]": [1, 2, 3, 4, 7, 24],          # wines
    "page": 1,                     # Page number for pagination
    "language": "en",              # Language for results (optional)
    "per_page": 50,
    # "region_ids[]": 24, # state working?
}


response = requests.get(url, params=params, headers=headers) # 
print(response)
data = response.json()

with open("aaaaaaaaaaaaaa.json", "w") as f:
    json.dump(data, f, indent=4)