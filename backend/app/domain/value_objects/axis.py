"""Axis Enumeration according to CDC section 5."""

from enum import Enum


class LogisticAxis(str, Enum):
    """The official logistic radial corridors radiating from Tsiazotafo Central Hub."""
    # 9 Real Urban Delivery Axes from Operations Excel
    AXE_CENTRE_1 = "AXE_CENTRE_1"
    AXE_CENTRE_2 = "AXE_CENTRE_2"
    AXE_ITAOSY = "AXE_ITAOSY"
    AXE_AMPITATAFIKA = "AXE_AMPITATAFIKA"
    AXE_AMBOHIMANGAKELY = "AXE_AMBOHIMANGAKELY"
    AXE_SABOTSY_NAMEHANA = "AXE_SABOTSY_NAMEHANA"
    AXE_IVATO = "AXE_IVATO"
    AXE_IAVOLOHA = "AXE_IAVOLOHA"
    AXE_ALASORA = "AXE_ALASORA"

    # Legacy / Compatibility codes
    AXE_CENTRE = "AXE_CENTRE"
    AXE_RN1 = "AXE_RN1"
    AXE_RN2 = "AXE_RN2"
    AXE_RN3 = "AXE_RN3"
    AXE_RN4 = "AXE_RN4"
    AXE_RN7 = "AXE_RN7"
    AXE_SUD_EST = "AXE_SUD_EST"

    # Province / National Corridors
    AXE_PROVINCE = "AXE_PROVINCE"
    AXE_PROV_RN2_EST = "AXE_PROV_RN2_EST"
    AXE_PROV_RN4_OUEST = "AXE_PROV_RN4_OUEST"
    AXE_PROV_RN6_NORD = "AXE_PROV_RN6_NORD"
    AXE_PROV_RN7_SUD = "AXE_PROV_RN7_SUD"
    AXE_PROV_RN7_SUD_OUEST = "AXE_PROV_RN7_SUD_OUEST"
    AXE_PROV_SUD_EST = "AXE_PROV_SUD_EST"
    AXE_PROV_RN44_ALAOTRA = "AXE_PROV_RN44_ALAOTRA"

    @classmethod
    def _missing_(cls, value):
        if isinstance(value, str):
            obj = str.__new__(cls, value)
            obj._value_ = value
            obj._name_ = str(value)
            return obj
        return super()._missing_(value)

    @property
    def label(self) -> str:
        labels = {
            LogisticAxis.AXE_CENTRE_1: "Axe Centre Ville 1 (Hyper-Centre & Analakely)",
            LogisticAxis.AXE_CENTRE_2: "Axe Centre Ville 2 (Péri-Centre & Antanimena)",
            LogisticAxis.AXE_ITAOSY: "Axe Itaosy (67Ha, Itaosy & Ouest)",
            LogisticAxis.AXE_AMPITATAFIKA: "Axe Ampitatafika (Ampefiloha, Fenoarivo & Sud-Ouest)",
            LogisticAxis.AXE_AMBOHIMANGAKELY: "Axe Ambohimangakely (RN2 Est & By-pass)",
            LogisticAxis.AXE_SABOTSY_NAMEHANA: "Axe Sabotsy Namehana (RN3 Nord & Avaradrano)",
            LogisticAxis.AXE_IVATO: "Axe Ivato (RN4 Digue & Aéroport)",
            LogisticAxis.AXE_IAVOLOHA: "Axe Iavoloha (RN7 Sud & Atsimondrano)",
            LogisticAxis.AXE_ALASORA: "Axe Alasora (Sud-Est & By-pass Alasora)",
            LogisticAxis.AXE_CENTRE: "AXE CENTRE-VILLE (Tsiazotafo & Hyper-Centre)",
            LogisticAxis.AXE_RN1: "AXE RN1 OUEST (Tsiazotafo ➔ Itaosy / Ampitatafika)",
            LogisticAxis.AXE_RN2: "AXE RN2 EST (Tsiazotafo ➔ Ambohimangakely)",
            LogisticAxis.AXE_RN3: "AXE RN3 NORD (Tsiazotafo ➔ Sabotsy Namehana)",
            LogisticAxis.AXE_RN4: "AXE RN4 / DIGUE (Tsiazotafo ➔ Ivato Aéroport)",
            LogisticAxis.AXE_RN7: "AXE RN7 SUD (Tsiazotafo ➔ Iavoloha / Andoharanofotsy)",
            LogisticAxis.AXE_SUD_EST: "AXE SUD-EST (Tsiazotafo ➔ Ankatso / Alasora)",
            LogisticAxis.AXE_PROVINCE: "AXE PROVINCES & GARES ROUTIÈRES (Coopératives Régionales)",
            LogisticAxis.AXE_PROV_RN2_EST: "AXE PROVINCE RN2 EST (Tamatave / Moramanga / Sainte-Marie)",
            LogisticAxis.AXE_PROV_RN4_OUEST: "AXE PROVINCE RN4 NORD-OUEST (Majunga / Maevatanana / Marovoay)",
            LogisticAxis.AXE_PROV_RN6_NORD: "AXE PROVINCE RN6 GRAND NORD (Diego-Suarez / Nosy Be / Sambava)",
            LogisticAxis.AXE_PROV_RN7_SUD: "AXE PROVINCE RN7 SUD (Antsirabe / Ambositra / Fianar)",
            LogisticAxis.AXE_PROV_RN7_SUD_OUEST: "AXE PROVINCE RN7 SUD-OUEST (Tuléar / Morondava)",
            LogisticAxis.AXE_PROV_SUD_EST: "AXE PROVINCE SUD-EST & ANOSY (Manakara / Fort-Dauphin)",
            LogisticAxis.AXE_PROV_RN44_ALAOTRA: "AXE PROVINCE RN44 (Ambatondrazaka / Alaotra)",
        }
        if self in labels:
            return labels[self]
        val = str(self.value)
        if val.startswith("AXE_PROVINCE_"):
            return f"Axe Province {val.replace('AXE_PROVINCE_', '').replace('_', ' ').title()}"
        if val.startswith("AXE_PROV_"):
            return f"Axe Province {val.replace('AXE_PROV_', '').replace('_', ' ').title()}"
        return val.replace("AXE_", "Axe ").replace("_", " ").title()

    @property
    def vehicle_type(self) -> str:
        vehicles = {
            LogisticAxis.AXE_CENTRE_1: "Scooter 110cc",
            LogisticAxis.AXE_CENTRE_2: "Scooter 110cc",
            LogisticAxis.AXE_ITAOSY: "Scooter 125cc",
            LogisticAxis.AXE_AMPITATAFIKA: "Scooter 125cc",
            LogisticAxis.AXE_AMBOHIMANGAKELY: "Scooter 125cc",
            LogisticAxis.AXE_SABOTSY_NAMEHANA: "Moto Trail 150cc",
            LogisticAxis.AXE_IVATO: "Moto Cross 150cc",
            LogisticAxis.AXE_IAVOLOHA: "Scooter 150cc",
            LogisticAxis.AXE_ALASORA: "Moto Roadster",
            LogisticAxis.AXE_CENTRE: "Scooter 110cc",
            LogisticAxis.AXE_RN1: "Scooter 125cc",
            LogisticAxis.AXE_RN2: "Scooter 125cc",
            LogisticAxis.AXE_RN3: "Moto Trail 150cc",
            LogisticAxis.AXE_RN4: "Moto Cross 150cc",
            LogisticAxis.AXE_RN7: "Scooter 150cc",
            LogisticAxis.AXE_SUD_EST: "Moto Roadster",
            LogisticAxis.AXE_PROVINCE: "Navette Gares / Fourgonnette",
            LogisticAxis.AXE_PROV_RN2_EST: "Navette Gares / Fourgonnette",
            LogisticAxis.AXE_PROV_RN4_OUEST: "Navette Gares / Fourgonnette",
            LogisticAxis.AXE_PROV_RN6_NORD: "Navette Gares / Fourgonnette",
            LogisticAxis.AXE_PROV_RN7_SUD: "Navette Gares / Fourgonnette",
            LogisticAxis.AXE_PROV_RN7_SUD_OUEST: "Navette Gares / Fourgonnette",
            LogisticAxis.AXE_PROV_SUD_EST: "Navette Gares / Fourgonnette",
            LogisticAxis.AXE_PROV_RN44_ALAOTRA: "Navette Gares / Fourgonnette",
        }
        if self in vehicles:
            return vehicles[self]
        if "PROV" in str(self.value).upper():
            return "Navette Gares / Fourgonnette"
        return "Deux-roues"
