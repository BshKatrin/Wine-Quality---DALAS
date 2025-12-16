translate = {
    "country": {
        "Армения": "Armenia",
        "Россия": "Russia",
        "Республика Молдова": "Moldova",
        "Грузия": "Georgia",
        "Словения": "Slovenia",
    },
    "color": {
        "белое": "white",
        "красное": "red",
        "розовое": "rose"
    },
    "grape": {
        'арени': 'Areni',
        'воскеат': 'Voskehat',
        'хатун': 'Khatun',
        'лалвари': 'Lalvari',
        'милаг': 'Milagh',
        'кангун': 'Kangun',
        'коломбар': 'Colombard',
        'сира': 'Syrah',
        'мерло': 'Merlot',
        'каберне фран': 'Cabernet Franc',
        'каберне совиньон': 'Cabernet Sauvignon',
        'пино нуар': 'Pinot Noir',
        'шардоне': 'Chardonnay',
        'красностоп': 'Krasnostop',
        'ркацители': 'Rkatsiteli',
        'рислинг': 'Riesling',
        'марселан': 'Marselan',
        'алиготе': 'Aligoté',
        'совиньон блан': 'Sauvignon Blanc',
        'мускат': 'Muscat',
        'вионье': 'Viognier',
        'рислинг рейнский': 'Rhine Riesling',
        'мальбек': 'Malbec',
        'пти мансан': 'Petit Manseng',
        'саперави': 'Saperavi',
        'мальвазия': 'Malvasia',
        'мускат белый': 'White Muscat',
        'цимлянский чёрный': 'Tsimlyansky Black',
        'пти вердо': 'Petit Verdot',
        'цицка': 'Tsitska',
        'кахури мцване': 'Kakhuri Mtsvane',
        'киси': 'Kisi',
        'мцване': 'Mtsvane',
        'крахуна': 'Krakhuna',
        'хихви': 'Khikhvi',
        'оджалеши': 'Ojaléshi',
        'муджуретули': 'Mujuretuli',
        'александроули': 'Aleksandrouli',
        'вельшрислинг': 'Welschriesling',
        'фурминт': 'Furmint',
        'марсан': 'Marsanne',
        'руссан': 'Roussanne',
        'красностоп золотовский': 'Krasnostop Zolotovsky',
        'пино блан': 'Pinot Blanc',
        'бастардо магарачский': 'Bastardo Magarachsky',
        'пино менье': 'Pinot Meunier'
    },
    "region": {
        'Кахетия': 'Kakheti',
        'Имеретия': 'Imereti',
        'Самегрело': 'Samegrelo',
        'Рача Лечхуми': 'Racha-Lechkhumi',
        'Штайерска Словения': 'Štajerska'
    },
    "food": {
        "asian": "asian",  # no match
        "beef": "beef",
        "burger": "junkfood",
        "cheese": "hardcheese",
        "chicken": "chicken",
        "chocolate": "sweetdessert",
        "duck": "duck",  # no match
        "fish": ["leanfish", "richfish"],
        "fruit": "fruitydessert",
        "jamon": "curedmeat",
        "japanese": "japanese",  # no match
        "lamb": "lamb",
        "mature_cheese": "hardcheese",
        "mushrooms": "mushrooms",
        "pasta": "pasta",
        "pork": "pork",
        "rabbit": "rabbit",  # no match
        "risotto": "risotto",  # no match
        "salat": "vegetarian",
        "seafood": "shellfish",
        "soft_cheese": "softcheese",
        "vegetables": "vegetarian",
        "yomi": "sweetdessert"

    }
}

mapping = {
    "grapes_translation": {
        "bordo": "cabernet franc",

        # PINOT
        "pinot grigio": "pinot gris",
        "grauburgunder": "pinot gris",
        "pinot bianco": "pinot blanc",
        "weissburgunder": "pinot blanc",
        "pinot nero": "pinot noir",
        "blauburgunder": "pinot noir",
        "spatburgunder": "pinot noir",
        "schwarzriesling": "pinot meunier",

        # RIESLING
        "rhine riesling": "riesling",
        "riesling renano": "riesling",
        "riesling italico": "welschriesling",

        # GRENACHE
        "garnacha": "red grenache",
        "garnacha tinta": "red grenache",
        "garnacha peluda": "red grenache",
        "cannonau": "red grenache",
        "garnacha tintorera": "red grenache",
        "alicante bouschet": "red grenache",  # garnacha tintorera
        "garnacha blanca": "grenache blanc",
        # "grenache gris": "white grenache",  # mostly used for white/rose wines

        # CARRIGNAN
        "mazuelo": "carignan",
        "samso": "carignan",
        "carinena": "carignan",

        # TEMPRANILLO
        "aragonez": "tempranillo",
        "tinta roriz": "tempranillo",
        "tinto fino": "tempranillo",
        "tinta de toro": "tempranillo",
        "tinta del pais": "tempranillo",

        # MOURVEDRE
        "mataro": "mourvedre",
        "monastrell": "mourvedre",

        # MUSCAT
        "moscatel de grano menudo": "muscat blanc",  # Muscat Blanc à Petits Grains (mbpg)
        "moscato bianco": "muscat blanc",
        "muscat canelli": "muscat blanc",
        "muscat de frontignan": "muscat blanc",
        "muscat blanc": "muscat blanc",
        "muscat": "muscat blanc",          # ambigious, default mbpg
        "moscato": "muscat blanc",         # ambigious, default mbpg
        "moscato giallo": "muscat blanc",
        "yellow muscat": "muscat blanc",   # ambigious, default mbpg
        "muscat ottonel": "muscat blanc",  # crossing of Chasselas & mbpg
        "rosenmuskateller": "muscat blanc",  # genetically mbpg, even if skins are pink/red

        "moscatel de alejandria": "muscat of alexandria",
        "muscat of alexandria": "muscat of alexandria",
        "zibibbo": "muscat of alexandria",

        "muscat hamburg": "black muscat",  # red variety

        # MALVASIA
        "malvasia bianca lunga": "malvasia",
        "malvasia di candia aromatica": "malvasia",
        "malvasia di lipari": "malvasia",
        "malvasia fina": "malvasia",
        "malvasia nera": "malvasia",
        "malvasia preta": "malvasia",

        # TREBBIANO
        "trebbiano d'abruzzo": "trebbiano",
        "trebbiano di lugana": "trebbiano",
        "trebbiano giallo": "trebbiano",
        "trebbiano toscano": "trebbiano",
        "ugni blanc": "trebbiano",
        "procanico": "trebbiano",

        # VERMENTIN
        "rolle": "vermentino",

        # TRAMINER
        "traminer": "gewurztraminer",

        # other wines
        "prugnolo gentile": "sangiovese",
        "cot": "malbec",
        "jaen": "mencia",

        "vidal blanc": "vidal",
        "kakhuri mtsvane": "mtsvane",
        "gamay noir": "gamay",

        "albillo mayor": "albillo",
        "nebbiolo rose": "nebbiolo",
        "tocai friulano": "friulano",

        "groppello gentile": "groppello",
        "soave": "garganega",  # soave : italian white wine, by law 70% garnanega

        "tinta barroca": "tinta",
        "tinta francisca": "tinta",
        "tinta cao": "tinta",
        "trincadeira": "tinta",
        "touriga nacional": "touriga",
        "touriga franca": "touriga",

        "alvarinho": "albarino",
        "inzolia": "ansonica",

        "arinto de bucelas": "arinto",
        "bianchetta trevigiana": "arneis",

        "corvinone": "corvina",
        "corvina veronese": "corvina",

        "maria gomes": "fernao pires",

        "godello": "gouveio",
        "krasnostop zolotovsky": "krasnostop",
        "viura": "macabeo",
        "trollinger": "schiava",
        "sylvaner": "silvaner",
        "tinta": "tempranillo",

        "verdicchio": "turbiana",
        "vernaccia di san gimignano": "vernaccia",
        "vernaccia di oristano": "vernaccia",
    },

    # "grapes_hybrid": {
    #     # catawba, concord : Vitis labrusca & Vitis vinifera (these grapes are not present in a db)
    #     # muscadelle : Gouais blanc & ??? (many wines in db already)
    #     "johanniter": ["riesling", "solaris"],
    #     "acolon": ["dornfelder", "lemberger"],
    #     "regent": ["silvaner", "muller-thurgau", "chambourcin"],
    #     "caberlot": ["cabernet sauvignon", "merlot"],

    #     # "siegerrebe": ["gewurztraminer"]
    #     # "vidal": "trebbiano",  # & rayon d'or, not present
    # }
    "grapes_families": {
        # INTERNATIONAL REDS
        "cabernet sauvignon": "cabernet_sauvignon_family",
        "petit verdot": "cabernet_sauvignon_family",
        "caberlot": "cabernet_sauvignon_family",
        "cabernet mitos": "cabernet_sauvignon_family",

        "cabernet franc": "cabernet_franc_family",
        "carmenere": "cabernet_franc_family",

        "merlot": "merlot_family",
        "malbec": "malbec_family",

        "shiraz/syrah": "syrah_family",
        "marselan": "syrah_family",

        "tempranillo": "tempranillo_family",
        "tempranillo blanco": "tempranillo_family",

        "sangiovese": "sangiovese_family",
        "canaiolo nero": "sangiovese_family",
        "colorino del valdarno": "sangiovese_family",

        "nebbiolo": "nebbiolo_family",

        "pinot noir": "pinot_noir_family",
        "pinot meunier": "pinot_noir_family",

        "gamay": "gamay_family",

        # MEDITERRANEAN REDS
        "grenache": "grenache_family",
        "red grenache": "grenache_family",
        "grenache blanc": "grenache_family",
        "grenache gris": "grenache_family",

        "mourvedre": "mourvedre_family",

        "carignan": "carignan_family",

        "cinsault": "cinsault_family",
        "cinsaut": "cinsault_family",

        "aglianico": "aglianico_family",
        "nero d'avola": "nero_davola_family",
        "primitivo": "primitivo_family",
        "negroamaro": "negroamaro_family",

        "teroldego": "teroldego_lagrein_family",
        "lagrein": "teroldego_lagrein_family",

        "sagrantino": "sagrantino_tannat_family",
        "tannat": "sagrantino_tannat_family",

        # CENTRAL / NORTHERN EUROPE REDS
        "blaufrankisch": "blaufrankisch_family",
        "lemberger": "blaufrankisch_family",

        "zweigelt": "zweigelt_family",
        "st. laurent": "zweigelt_family",

        "dornfelder": "dark_hybrids_family",
        "dunkelfelder": "dark_hybrids_family",
        "samtrot": "dark_hybrids_family",

        "schiava": "schiava_family",
        "lambrusco": "lambrusco_family",

        # REGIONAL REDS
        "barbera": "italian_reds",
        "dolcetto": "italian_reds",
        "ciliegiolo": "italian_reds",
        "groppello": "italian_reds",
        "marzemino": "italian_reds",
        "brachetto": "italian_reds",

        "mencia": "iberian_reds",
        "bobal": "iberian_reds",
        "trepat": "iberian_reds",
        "callet": "iberian_reds",
        "morenillo": "iberian_reds",
        "graciano": "iberian_reds",
        "sumoll": "iberian_reds",

        "xinomavro": "greek_reds",
        "agiorgitiko": "greek_reds",
        "limniona": "greek_reds",
        "mavro": "greek_reds",
        "limniona": "greek_reds",

        "saperavi": "georgian_reds",
        "ojaleshi": "georgian_reds",
        "mujuretuli": "georgian_reds",
        "aleksandrouli": "georgian_reds",
        "shavkapito": "georgian_reds",

        "nerello mascalese": "volcanic_island_reds",
        "nerello cappuccio": "volcanic_island_reds",
        "listan negro": "volcanic_island_reds",

        # WHITES
        "riesling": "riesling_family",
        "welschriesling": "riesling_family",

        "gewurztraminer": "gewurztraminer_family",

        "muscat blanc": "muscat_family",
        "moscatel": "muscat_family",
        "muscat of alexandria": "muscat_family",
        "black muscat": "muscat_family",
        "torrontes": "muscat_family",

        "sauvignon blanc": "sauvignon_family",
        "sauvignon gris": "sauvignon_family",

        "viognier": "viognier_family",
        "petit manseng": "petit_manseng_family",

        # STRUCTURAL / NEUTRAL WHITES
        "chardonnay": "chardonnay_family",
        "aligote": "chardonnay_family",

        "pinot blanc": "pinot_blanc_family",
        "auxerrois": "pinot_blanc_family",

        "pinot gris": "pinot_gris_family",

        "chenin blanc": "chenin_blanc_family",

        "colombard": "colombard_folle_blanche_family",
        "folle blanche": "colombard_folle_blanche_family",

        "trebbiano": "trebbiano_family",
        "airen": "trebbiano_family",

        "semillon": "semillon_family",
        "vermentino": "vermentino_family",

        "garganega": "garganega_family",
        "turbiana": "garganega_family",
        "grecanico": "garganega_family",

        # REGIONAL / MERGED WHITES
        "jacquere": "alpine_whites",
        "arbane": "alpine_whites",
        "petite arvine": "alpine_whites",
        "petit meslier": "alpine_whites",

        "albarino": "iberian_atlantic_whites",
        "loureiro": "iberian_atlantic_whites",
        "trajadura": "iberian_atlantic_whites",
        "treixadura": "iberian_atlantic_whites",
        "encruzado": "iberian_atlantic_whites",
        "arinto": "iberian_atlantic_whites",

        "assyrtiko": "greek_whites",
        "moschofilero": "greek_whites",
        "savatiano": "greek_whites",
        "malagouzia": "greek_whites",

        # ARMENIAN / CAUCASUS SPECIAL
        "rkatsiteli": "caucasus_whites",
        "kisi": "caucasus_whites",
        "mtsvane": "caucasus_whites",
        "krakhuna": "caucasus_whites",
        "khikhvi": "caucasus_whites",
        "tsitska": "caucasus_whites",

        "areni": "caucasus_reds",
        "krasnostop": "caucasus_reds",
        "tsimlyansky black": "caucasus_reds",
        "bastardo magarachsky": "caucasus_reds",
        "voskehat": "caucasus_whites",
        "khatun": "caucasus_whites",
        "lalvari": "caucasus_whites",
        "milagh": "caucasus_whites",
        "kangun": "caucasus_whites",

        # IBERIAN / PORTUGUESE
        "touriga": "portuguese_reds",
        "tinta": "portuguese_reds",
        "tinto cao": "portuguese_reds",
        "souzao": "portuguese_reds",
        "vinhao": "portuguese_reds",
        "viosinho": "portuguese_reds",
        "baga": "portuguese_reds",
        "bastardo": "portuguese_reds",

        "gouveio": "portuguese_whites",
        "fernao pires": "portuguese_whites",
        "rabigato": "portuguese_whites",
        "antao vaz": "portuguese_whites",
        "bical": "portuguese_whites",
        "azal branco": "portuguese_whites",
        "sercialinho": "portuguese_whites",
        "verdelho": "portuguese_whites",
        "verdello": "portuguese_whites",

        # SPANISH WHITES
        "macabeo": "spanish_whites",
        "palomino": "spanish_whites",
        "xarel-lo": "spanish_whites",
        "parellada": "spanish_whites",
        "verdejo": "spanish_whites",
        "albillo": "spanish_whites",
        "caino blanco": "spanish_whites",
        "maturana blanca": "spanish_whites",
        "perera": "spanish_whites",
        "pedro ximenez": "spanish_whites",

        "lado": "spanish_whites",
        "doradilla": "spanish_whites",
        "perera": "spanish_whites",
        "merseguera": "spanish_whites",

        # ITALIAN WHITES (NEUTRAL / STRUCTURAL)
        "cortese": "italian_whites",
        "ansonica": "italian_whites",
        "albana": "italian_whites",
        "timorasso": "italian_whites",
        "erbaluce": "italian_whites",
        "spergola": "italian_whites",
        "verdeca": "italian_whites",
        "biancolella": "italian_whites",
        "dona blanca": "italian_whites",
        "fenile": "italian_whites",
        "ginestra": "italian_whites",
        "ripolo": "italian_whites",
        "grechetto": "italian_whites",
        "nasco": "italian_whites",
        "vitovska": "italian_whites",
        "bellone": "italian_whites",

        "fiano": "italian_whites",
        "greco": "italian_whites",
        "pecorino": "italian_whites",
        "vernaccia": "italian_whites",
        "verduzzo friulano": "italian_whites",
        "falanghina": "italian_whites",
        "picolit": "italian_whites",
        "arneis": "italian_whites",
        "grillo": "italian_whites",
        "carricante": "italian_whites",
        "friulano": "italian_whites",
        "ribolla gialla": "italian_whites",
        "malvasia": "italian_whites",
        "glera": "italian_whites",

        "bosco": "italian_whites",
        "albarola": "italian_whites",
        "pederna": "italian_whites",
        "verdiso": "italian_whites",

        # ITALIAN REDS (REGIONAL)
        "pignolo": "italian_reds",
        "vespolina": "italian_reds",
        "raboso piave": "italian_reds",
        "gaglioppo": "italian_reds",
        "piedirosso": "italian_reds",
        "susumaniello": "italian_reds",
        "nocera": "italian_reds",
        "frappato": "italian_reds",
        "fortana": "italian_reds",
        "vespaiola": "italian_reds",
        "oseleta": "italian_reds",
        "molinara": "italian_reds",
        "croatina": "italian_reds",
        "montepulciano": "italian_reds",
        "rondinella": "italian_reds",
        "corvina": "italian_reds",

        # FRENCH SOUTH
        "bourboulenc": "southern_french_whites",
        "picpoul blanc": "southern_french_whites",
        "clairette": "southern_french_whites",
        "mauzac blanc": "southern_french_whites",
        "romorantin": "southern_french_whites",
        "marsanne": "southern_french_whites",
        "roussanne": "southern_french_whites",
        "muscadelle": "southern_french_whites",

        "counoise": "southern_french_reds",
        "tibouren": "southern_french_reds",
        "rufete": "southern_french_reds",
        "grolleau": "southern_french_reds",
        "negrette": "southern_french_reds",

        # GERMAN / AUSTRIAN WHITES
        "gruner veltliner": "austrian_german_whites",
        "silvaner": "austrian_german_whites",
        "scheurebe": "austrian_german_whites",
        "kerner": "austrian_german_whites",
        "muller-thurgau": "austrian_german_whites",
        "ortega": "austrian_german_whites",
        "bacchus": "austrian_german_whites",
        "siegerrebe": "austrian_german_whites",

        # HYBRIDS
        "cabernet dorsa": "hybrid_reds",
        "acolon": "hybrid_reds",
        "regent": "hybrid_reds",
        "domina": "hybrid_reds",
        "pinotage": "hybrid_reds",
        "concord": "hybrid_reds",
        "catawba": "hybrid_reds",
        "norton": "hybrid_reds",
        "dechaunac": "hybrid_reds",
        "caberlot": "hybrid_reds",

        "chambourcin": "hybrid_whites",
        "vidal": "hybrid_whites",
        "vignoles": "hybrid_whites",
        "cabernet blanc": "hybrid_whites",
        "solaris": "hybrid_whites",
        "johanniter": "hybrid_whites",

        # EASTERN EUROPE / BALKANS
        "harslevelu": "eastern_europe_whites",
        "furmint": "eastern_europe_whites",

        # ATLANTIC / ISLAND WHITES
        "hondarrabi zuri": "atlantic_whites",
        "marmajuelo": "atlantic_whites",
        "terrantes do pico": "atlantic_whites",
        "sercialinho": "atlantic_whites"
    }
}
