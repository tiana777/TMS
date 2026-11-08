"""Axis Enumeration according to CDC section 5."""

from enum import Enum


class LogisticAxis(str, Enum):
    """The 8 official logistic radial axes radiating from Tsiazotafo Central Hub."""
    AXE_CENTRE = "AXE_CENTRE"
    AXE_RN1 = "AXE_RN1"
    AXE_RN2 = "AXE_RN2"
    AXE_RN3 = "AXE_RN3"
    AXE_RN4 = "AXE_RN4"
    AXE_RN7 = "AXE_RN7"
    AXE_SUD_EST = "AXE_SUD_EST"
    AXE_PROVINCE = "AXE_PROVINCE"

    @property
    def label(self) -> str:
        labels = {
            LogisticAxis.AXE_CENTRE: "AXE CENTRE-VILLE (Tsiazotafo & Hyper-Centre)",
            LogisticAxis.AXE_RN1: "AXE RN1 OUEST (Tsiazotafo ➔ Itaosy / Ampitatafika)",
            LogisticAxis.AXE_RN2: "AXE RN2 EST (Tsiazotafo ➔ Ambohimangakely)",
            LogisticAxis.AXE_RN3: "AXE RN3 NORD (Tsiazotafo ➔ Sabotsy Namehana)",
            LogisticAxis.AXE_RN4: "AXE RN4 / DIGUE (Tsiazotafo ➔ Ivato Aéroport)",
            LogisticAxis.AXE_RN7: "AXE RN7 SUD (Tsiazotafo ➔ Iavoloha / Andoharanofotsy)",
            LogisticAxis.AXE_SUD_EST: "AXE SUD-EST (Tsiazotafo ➔ Ankatso / Alasora)",
            LogisticAxis.AXE_PROVINCE: "AXE PROVINCES & GARES ROUTIÈRES (Coopératives Régionales)",
        }
        return labels.get(self, self.value)

    @property
    def vehicle_type(self) -> str:
        vehicles = {
            LogisticAxis.AXE_CENTRE: "Scooter 110cc",
            LogisticAxis.AXE_RN1: "Scooter 125cc",
            LogisticAxis.AXE_RN2: "Scooter 125cc",
            LogisticAxis.AXE_RN3: "Moto Trail 150cc",
            LogisticAxis.AXE_RN4: "Moto Cross 150cc",
            LogisticAxis.AXE_RN7: "Scooter 150cc",
            LogisticAxis.AXE_SUD_EST: "Moto Roadster",
            LogisticAxis.AXE_PROVINCE: "Moto 125cc",
        }
        return vehicles.get(self, "Deux-roues")
