"""Domain Service: AxisAutoDetector according to CDC section 5.1."""

from dataclasses import dataclass
from typing import Optional, Tuple
import unicodedata
from backend.app.domain.value_objects.axis import LogisticAxis


def normalize_text(text: str) -> str:
    """Normalize text for insensitive keyword search: lowercasing, strip accents and extra punctuation."""
    if not text:
        return ""
    text = unicodedata.normalize("NFKD", text).encode("ASCII", "ignore").decode("utf-8")
    return text.lower().strip()


# Comprehensive dictionaries from CDC section 5 & 6
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

URBAN_AXES_KEYWORDS = {
    LogisticAxis.AXE_RN1: [
        "67ha", "67 ha", "ampefiloha", "anosizato", "ambodin'isotry", "ambodinisotry",
        "itaosy", "cite seimad", "seimad", "ampitatafika", "fenoarivo", "bemasoandro",
    ],
    LogisticAxis.AXE_RN2: [
        "besarety", "mahavoky", "avaradoha", "ampasapito", "nanisana",
        "ankadindramamy", "mahazo", "ambohimahitsy", "ambohimangakely",
    ],
    LogisticAxis.AXE_RN3: [
        "andravoahangy", "amboditsiry", "analamahitsy", "ilafy",
        "sabotsy namehana", "sabotsy", "manjakaray", "anjanahary",
    ],
    LogisticAxis.AXE_RN4: [
        "antanimena", "ankorondrano", "andraharo", "zone galaxy", "galaxy",
        "alarobia", "ambohimanarina", "ambohibao", "talatamaty", "mandrosoa",
        "ivato", "aeroport ivato",
    ],
    LogisticAxis.AXE_RN7: [
        "ankadimbahoaka", "tanjombato", "andoharanofotsy", "iavoloha",
        "ambohimanambola",
    ],
    LogisticAxis.AXE_SUD_EST: [
        "ambanidia", "mandroseza", "ankatso", "campus", "tsiadana",
        "ambatoroka", "befelatanana", "alasora", "by-pass", "bypass",
    ],
    LogisticAxis.AXE_CENTRE: [
        "analakely", "antaninarenina", "isoraka", "tsaralalana", "behoririka",
        "mahamasina", "faravohitra", "ambohijatovo", "antsahabe", "tsiazotafo",
    ],
}


@dataclass(frozen=True)
class AxisDetectionResult:
    axis: LogisticAxis
    matched_keyword: Optional[str]
    is_fallback: bool


class AxisAutoDetector:
    """Detects logistic axis according to 3-level decision tree from CDC section 5.1:
    1. Level 1: Province keywords, regional cities, gares & cooperatives -> AXE_PROVINCE
    2. Level 2: Urban corridors (RN1, RN2, RN3, RN4, RN7, SUD_EST, CENTRE)
    3. Level 3: Fallback -> AXE_CENTRE with warning/flag is_fallback=True
    """

    @classmethod
    def detect(cls, address: str) -> AxisDetectionResult:
        if not address:
            return AxisDetectionResult(
                axis=LogisticAxis.AXE_CENTRE,
                matched_keyword=None,
                is_fallback=True,
            )

        norm_addr = normalize_text(address)

        # 1. Level 1: Province Priority
        for keyword in PROVINCE_KEYWORDS:
            norm_kw = normalize_text(keyword)
            if norm_kw in norm_addr:
                return AxisDetectionResult(
                    axis=LogisticAxis.AXE_PROVINCE,
                    matched_keyword=keyword,
                    is_fallback=False,
                )

        # 2. Level 2: Urban Corridors
        # Check corridors 1-7 (check non-centre axes first, then centre)
        for axis in [
            LogisticAxis.AXE_RN1,
            LogisticAxis.AXE_RN2,
            LogisticAxis.AXE_RN3,
            LogisticAxis.AXE_RN4,
            LogisticAxis.AXE_RN7,
            LogisticAxis.AXE_SUD_EST,
            LogisticAxis.AXE_CENTRE,
        ]:
            for kw in URBAN_AXES_KEYWORDS[axis]:
                norm_kw = normalize_text(kw)
                if norm_kw in norm_addr:
                    return AxisDetectionResult(
                        axis=axis,
                        matched_keyword=kw,
                        is_fallback=False,
                    )

        # 3. Level 3: Fallback to AXE_CENTRE
        return AxisDetectionResult(
            axis=LogisticAxis.AXE_CENTRE,
            matched_keyword=None,
            is_fallback=True,
        )
