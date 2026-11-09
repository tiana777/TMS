"""Domain Service: AxisAutoDetector based on real Excel operational axes & tariffs."""

from dataclasses import dataclass
from typing import Optional
import unicodedata
import re
from backend.app.domain.value_objects.axis import LogisticAxis


def normalize_text(text: str) -> str:
    """Normalize text for insensitive keyword search: lowercasing, strip accents and punctuation."""
    if not text:
        return ""
    text = unicodedata.normalize("NFKD", text).encode("ASCII", "ignore").decode("utf-8")
    return re.sub(r"[^a-z0-9]", "", text.lower().strip())


# Level 1: Province / Gares Routières / Coopératives
PROVINCE_KEYWORDS = [
    # Major regional cities
    "toamasina", "tamatave", "mahajanga", "majunga", "antsirabe", "fianarantsoa",
    "toliara", "tulear", "diego", "antsiranana", "moramanga", "brickaville",
    "manakara", "sambava", "antalaha", "nosy be", "nosy-be", "fort-dauphin",
    "fort dauphin", "tolagnaro", "ambatondrazaka", "fenerive", "fenerive-est",
    "sainte-marie", "sainte marie", "ambositra", "ambalavao", "ihosy", "port-berge",
    "antsohihy", "ambanja", "maevatanana", "ambato-boeni", "mananjary", "morondava",
    # Stations (Gares)
    "gare ambodivona", "fasan'ny karana", "fasan ny karana", "fasankarana",
    "gare maki", "andohatapenaka", "gare andohatapenaka", "gare aranta",
    # National cooperatives
    "cotisse", "kofmad", "besady", "sonatra", "trans texpress", "trans tsiry",
    "soatrans", "fifafi", "trans mada", "kofiam", "chita express", "trans diego",
    "madatrans",
]

# The 9 Real Urban Axes from the Excel Operations Grid
REAL_URBAN_KEYWORDS = {
    LogisticAxis.AXE_IVATO: [
        "ivato aeroport", "aeroport ivato", "ambohidratrimo", "mandrosoa ivato", "ivato horizon",
        "ivato tanana", "croc farm", "talatamaty", "antanetibe talatamaty", "ambohibao",
        "ambatolampy", "ambohidroa", "andranomena", "antehiroka", "ambohijanahary antehiroka",
        "andrahara", "andraharo", "zone galaxy", "galaxy", "alarobia", "ambodimita",
        "ambodivonkely", "ambohimanandray", "ambohimandroso", "ambohimitsinjo",
        "anosisoa", "anosivavaka", "antanety", "antanjombe", "ambodihady", "ankazomanga",
    ],
    LogisticAxis.AXE_SABOTSY_NAMEHANA: [
        "sabotsy namehana", "sabotsy", "tsarafara", "manarintsoa sabotsy", "ambatofotsy",
        "antsofinondry", "ankadikely ilafy", "ankadikely", "ilafy", "ambohitrarahaba",
        "antanandrano", "ambatobe ambony", "ambatobe ambany", "ambatobe", "ambatomainty",
        "amboditsiry", "analamahintsy cite", "analamahintsy tanana", "analamahintsy",
        "androhibe", "anjanahary", "manjakaray", "andravoahangy", "anosy avaratra",
        "lazaina", "soavinimerina", "manjaka ilafy", "antsampandrano ilafy", "ambohipanja",
        "andranobevava", "masay",
    ],
    LogisticAxis.AXE_AMBOHIMANGAKELY: [
        "ambodivoara", "ambohimangakely", "cmt", "antsobolo", "behintsy",
        "bypass ambohimangakely", "soamanandrariny", "ambohibe", "ankadiefajoro",
        "ambohitrakely", "ampahibe", "besarety", "soavinandriana", "ambatokaranana",
        "ambatomaro", "ankadindramamy", "ambohimirary", "ampanotokana", "andraisoro",
        "nanisana", "tsarahonenana", "avaradoha", "betongolo", "mahavoky", "mahazo",
    ],
    LogisticAxis.AXE_ALASORA: [
        "ambohimanambola", "alasora alatsinainy", "alasora mahatsinjo", "alasora ambohitanety",
        "alasora commune", "alasora", "bypass alasora", "by-pass alasora", "ambohidrazaka",
        "ambolokandrina", "ankadindratombo", "ampandrana", "ambohipo", "androndra",
        "morarano ambohitsoa", "tsiadana", "ambohitsoa", "ambanidia", "mandroseza",
        "antanimora ampasanimalo", "ampasanimalo", "ambatoroka", "ambohimiandra",
        "miandrarivo", "mahazoarivo", "ampamantanana", "andohanimandroseza", "antsahabe",
        "volosarika", "ankazotokana", "antsakaviro", "ankatso", "antsahameva", "antsahamamy",
        "ankorahotra", "avaratr'antanimora", "androndrakely",
    ],
    LogisticAxis.AXE_IAVOLOHA: [
        "iavoloha galana", "iavoloha elgeco", "iavoloha", "imerimanjaka", "ambohijanaka",
        "soavina", "bypass gazety", "bypass iavoloha", "tongarivo", "bevalala",
        "ambohimanala", "ambohimanatrika", "tanjombato", "andoharanofotsy", "mandrimena",
        "forello", "ankaraobato", "fasan'ny karana", "manakambahiny", "ouest ambohijanahary",
        "ankaditoho", "marohoho", "soanierana", "tsarafaritra", "tsimbazaza", "saropody",
    ],
    LogisticAxis.AXE_AMPITATAFIKA: [
        "ampitatafika ankaditany", "ampitatafika tetezana", "ampitatafika faliarivo",
        "ampitatafika", "alakamisy fenoarivo", "fenoarivo", "ambodiafontsy", "ambohimangidy",
        "anosizato andrefana", "ambohimamory", "ambalavao-isotry", "ambalavao isotry",
        "andavamamba", "avaratetezana-bekiraro", "avaratetezana", "bekiraro", "ampefiloha",
        "anosibe", "anosipatrana", "anosizato est", "anosizato ouest", "anosizato",
        "ilanivato", "namontana", "angarangarana", "anosy",
    ],
    LogisticAxis.AXE_ITAOSY: [
        "sinibeandrano", "ambohidrapeto", "itaosy marobiby", "itaosy horizon",
        "ambavahaditokana", "itaosy andranonahoatra", "itaosy cite", "itaosy hopitaly",
        "itaosy ambodifasika", "itaosy ambohijanamasoandro", "itaosy andohatanjona",
        "itaosy ambodiapanga", "itaosy", "67ha", "67 ha", "ampasika", "ambodin'isotry",
        "ambodinisotry", "antohomadinika", "ambohitrimanjaka", "andohatapenaka", "ankasina",
        "manarintsoa", "anatihazo isotry", "andranomanalina", "bemasoandro",
    ],
    LogisticAxis.AXE_CENTRE_2: [
        "ambatolampy tsimahafotsy", "ambodivoanjo", "amboniloha", "ivandry",
        "morarano alarobia", "soavimasoandro", "ambodivona", "ambatomitsangana",
        "ankadifotsy", "antanimena", "ankorondrano", "mandialaza", "tsaramasay",
        "ambodifasina", "mahatony",
    ],
    LogisticAxis.AXE_CENTRE_1: [
        "ambatonakanga", "ambohitsorohitra", "ambatovinaky", "ambodifilao", "soarano",
        "amparibe", "avaratr'imahamasina", "ampasamadinika", "amboasarikely",
        "faravohitra", "isoraka", "tsaralalana", "ambondrona", "tsiazotafo",
        "andafiavaratra", "manjakamiadana", "behoririka", "analakely", "ankadilalana",
        "fiadanana", "mahamasina", "tsimialonjafy", "ambanin'ampamarinana",
        "ambohijatovo", "mananjara", "fort-voyron", "petite vitesse", "antaninandro",
        "ambohipotsy", "andohalo", "anjohy", "antaninarenina",
    ],
}

# Grille Tarifaire Officielle du CDC (Section 5.3)
FEE_5000_KEYWORDS = [
    # AVARADRANO (5 000 Ar)
    "sabotsy namehana", "sabotsy", "ambohimanambola tetezana", "ambohimanambola",
    "alasora alatsinainy", "alasora mahatsinjo", "alasora ambohitanety",
    # ATSIMONDRANO (5 000 Ar)
    "iavoloha galana", "iavoloha elgeco plus", "iavoloha elgeco", "iavoloha",
    "imerimanjaka bypass", "imerimanjaka", "ambohijanaka",
    "itaosy sinibeandrano", "sinibeandrano", "itaosy ambohidrapeto", "ambohidrapeto", "soavina",
    # AMBOHIDRATRIMO (5 000 Ar)
    "ivato aeroport", "aeroport ivato", "ambohidratrimo", "mandrosoa ivato", "ivato horizon", "ivato",
    # AMBOHIMANGAKELY (5 000 Ar)
    "ambodivoara", "rond point bypass", "rond-point bypass",
    # Extensions péri-urbaines
    "antsofinondry", "croc farm", "tsarafara", "ambatofotsy",
]

FEE_4000_KEYWORDS = [
    # AVARADRANO (4 000 Ar)
    "ankadindratombo", "alasora commune", "rond point bypass alasora", "by pass cote alasora", "bypass alasora", "by-pass alasora",
    "ambohidrazaka", "ankadikely ilafy", "ankadikely", "ilafy", "ambohitrarahaba", "antanandrano", "ambatobe ambony", "ambolokandrina",
    # ATSIMONDRANO (4 000 Ar)
    "tanjombato", "andoharanofotsy", "mandrimena", "forello",
    "itaosy andranonahoatra", "andranonahoatra", "itaosy cite", "itaosy cite",
    "anosizato andrefana", "ampitatafika avaravohitra", "ampitatafika tetezana", "ampitatafika",
    "ankaraobato", "bemasoandro", "fenoarivo", "alakamisy fenoarivo", "ambodiafontsy", "ambohimangidy",
    # AMBOHIDRATRIMO (4 000 Ar)
    "ambohibao", "ambatolampy", "talatamaty", "antanetibe talatamaty", "antanetibe", "ambohidroa", "andranomena",
    # AMBOHIMANGAKELY (4 000 Ar)
    "ambohimangakely ankadilalana", "ambohimangaely eo cmt", "ambohimangakely eo cmt", "ambohimangakely cmt", "ambohimangakely", "antsobolo",
    # Première couronne / communes rattachées
    "behintsy", "soamanandrariny", "ambohibe", "antehiroka", "tongarivo", "bevalala",
    "ambohimanala", "ambohimanatrika", "marobiby", "itaosy horizon", "ambatolampy tsimahafotsy",
    "alasora",
]

FEE_3000_SPECIFIC_OVERRIDES = [
    "ambatobe ambany", "anosizato est",
]


@dataclass(frozen=True)
class AxisDetectionResult:
    axis: LogisticAxis
    matched_keyword: Optional[str]
    is_fallback: bool
    delivery_fee: int = 3000


class AxisAutoDetector:
    """Detects logistic axis and official delivery fee according to CDC 5.3:
    - 3 000 Ar: Arrondissements 1 à 6 de la CUA
    - 4 000 Ar: Première couronne (Avaradrano, Atsimondrano, Ambohidratrimo, Ambohimangakely)
    - 5 000 Ar: Périphérie lointaine / grande couronne
    """

    CUSTOM_ZONES: List[Dict[str, Any]] = []

    @classmethod
    def register_custom_zone(cls, name: str, axis: LogisticAxis, fee: int):
        trimmed = name.strip()
        if not trimmed:
            return
        cls.CUSTOM_ZONES.insert(0, {"name": trimmed, "axis": axis, "fee": fee})

    @classmethod
    def detect_fee(cls, address: str) -> int:
        if not address:
            return 3000
        norm_addr = normalize_text(address)

        # 0. Custom registered zones priority
        for cz in cls.CUSTOM_ZONES:
            if normalize_text(cz["name"]) in norm_addr:
                return cz["fee"]

        # 1. Spécifique 3 000 Ar (ex: Ambatobe Ambany vs Ambatobe Ambony, Anosizato Est vs Ouest)
        for kw in FEE_3000_SPECIFIC_OVERRIDES:
            if normalize_text(kw) in norm_addr:
                return 3000

        # 2. Bypass Alasora (4 000 Ar) prioritaire sur Bypass générique (5 000 Ar)
        if "bypassalasora" in norm_addr or "alasora" in norm_addr:
            if any(sub in norm_addr for sub in ["alatsinainy", "mahatsinjo", "ambohitanety"]):
                return 5000
            return 4000

        # 3. Grille 5 000 Ar
        for kw in FEE_5000_KEYWORDS:
            if normalize_text(kw) in norm_addr:
                return 5000

        # 4. Grille 4 000 Ar
        for kw in FEE_4000_KEYWORDS:
            if normalize_text(kw) in norm_addr:
                return 4000

        # 5. Défaut Intra-Urbain (CUA 1er au 6ème Arrondissement)
        return 3000

    @classmethod
    def detect(cls, address: str) -> AxisDetectionResult:
        if not address:
            return AxisDetectionResult(
                axis=LogisticAxis.AXE_CENTRE_1,
                matched_keyword=None,
                is_fallback=True,
                delivery_fee=3000,
            )

        norm_addr = normalize_text(address)
        fee = cls.detect_fee(address)

        # 0. Custom registered zones priority
        for cz in cls.CUSTOM_ZONES:
            if normalize_text(cz["name"]) in norm_addr:
                return AxisDetectionResult(
                    axis=cz["axis"],
                    matched_keyword=cz["name"],
                    is_fallback=False,
                    delivery_fee=cz["fee"],
                )

        # 1. Level 1: Province Priority
        for keyword in PROVINCE_KEYWORDS:
            norm_kw = normalize_text(keyword)
            if norm_kw in norm_addr:
                return AxisDetectionResult(
                    axis=LogisticAxis.AXE_PROVINCE,
                    matched_keyword=keyword,
                    is_fallback=False,
                    delivery_fee=fee,
                )

        # 2. Level 2: Real 9 Urban Corridors
        for axis, keywords in REAL_URBAN_KEYWORDS.items():
            for kw in keywords:
                norm_kw = normalize_text(kw)
                if len(norm_kw) >= 3 and norm_kw in norm_addr:
                    return AxisDetectionResult(
                        axis=axis,
                        matched_keyword=kw,
                        is_fallback=False,
                        delivery_fee=fee,
                    )

        # 3. Level 3: Fallback to AXE_CENTRE_1
        return AxisDetectionResult(
            axis=LogisticAxis.AXE_CENTRE_1,
            matched_keyword=None,
            is_fallback=True,
            delivery_fee=fee,
        )
