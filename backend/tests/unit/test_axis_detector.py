"""Unit tests for AxisAutoDetector Domain Service."""

from backend.app.domain.services.axis_detector import AxisAutoDetector
from backend.app.domain.value_objects.axis import LogisticAxis


class TestAxisAutoDetector:
    def test_level1_province_cities(self):
        cases = [
            ("Livraison boutique Toamasina bazar be", LogisticAxis.AXE_PROVINCE, "toamasina"),
            ("Colis pour Tamatave port", LogisticAxis.AXE_PROVINCE, "tamatave"),
            ("Avenue de la paix Majunga", LogisticAxis.AXE_PROVINCE, "majunga"),
            ("Mahajanga bord de mer", LogisticAxis.AXE_PROVINCE, "mahajanga"),
            ("Centre ville Antsirabe", LogisticAxis.AXE_PROVINCE, "antsirabe"),
            ("Fianarantsoa ville haute", LogisticAxis.AXE_PROVINCE, "fianarantsoa"),
            ("Toliara sanfily", LogisticAxis.AXE_PROVINCE, "toliara"),
            ("Diego Suarez grand hotel", LogisticAxis.AXE_PROVINCE, "diego"),
            ("Antsiranana place scobel", LogisticAxis.AXE_PROVINCE, "antsiranana"),
            ("Moramanga gare", LogisticAxis.AXE_PROVINCE, "moramanga"),
            ("Nosy Be Hell-Ville", LogisticAxis.AXE_PROVINCE, "nosy be"),
            ("Fort-Dauphin plage libanona", LogisticAxis.AXE_PROVINCE, "fort-dauphin"),
        ]
        for address, expected_axis, keyword in cases:
            res = AxisAutoDetector.detect(address)
            assert res.axis == expected_axis, f"Failed for {address}"
            assert res.is_fallback is False
            assert res.matched_keyword == keyword

    def test_level1_bus_stations(self):
        cases = [
            ("Dépôt Gare Ambodivona guichet 3", LogisticAxis.AXE_PROVINCE),
            ("Gare Fasan'ny Karana vers RN7", LogisticAxis.AXE_PROVINCE),
            ("Andohatapenaka Gare Maki", LogisticAxis.AXE_PROVINCE),
        ]
        for address, expected_axis in cases:
            res = AxisAutoDetector.detect(address)
            assert res.axis == expected_axis
            assert res.is_fallback is False

    def test_level1_cooperatives(self):
        cases = [
            ("Envoi par Cotisse Transport", LogisticAxis.AXE_PROVINCE),
            ("Coopérative Kofmad guichet Sud", LogisticAxis.AXE_PROVINCE),
            ("Besady Plus vers Majunga", LogisticAxis.AXE_PROVINCE),
        ]
        for address, expected_axis in cases:
            res = AxisAutoDetector.detect(address)
            assert res.axis == expected_axis
            assert res.is_fallback is False

    def test_level2_urban_corridors(self):
        cases = [
            ("67Ha Sud près du marché", LogisticAxis.AXE_RN1),
            ("Itaosy Cité Seimad", LogisticAxis.AXE_RN1),
            ("Ampitatafika près du pont", LogisticAxis.AXE_RN1),
            ("Besarety pharmacie", LogisticAxis.AXE_RN2),
            ("Mahazo près du terminus", LogisticAxis.AXE_RN2),
            ("Ambohimangakely RN2", LogisticAxis.AXE_RN2),
            ("Andravoahangy marché", LogisticAxis.AXE_RN3),
            ("Analamahitsy carrefour", LogisticAxis.AXE_RN3),
            ("Sabotsy Namehana", LogisticAxis.AXE_RN3),
            ("Antanimena face église", LogisticAxis.AXE_RN4),
            ("Andraharo Zone Galaxy", LogisticAxis.AXE_RN4),
            ("Talatamaty route de l'aéroport", LogisticAxis.AXE_RN4),
            ("Tanjombato près du pont", LogisticAxis.AXE_RN7),
            ("Andoharanofotsy RN7", LogisticAxis.AXE_RN7),
            ("Ambanidia en haut", LogisticAxis.AXE_SUD_EST),
            ("Ankatso campus universitaire", LogisticAxis.AXE_SUD_EST),
            ("Alasora By-Pass", LogisticAxis.AXE_SUD_EST),
            ("Analakely avenue de l'indépendance", LogisticAxis.AXE_CENTRE),
            ("Isoraka près de l'ambassade", LogisticAxis.AXE_CENTRE),
        ]
        for address, expected_axis in cases:
            res = AxisAutoDetector.detect(address)
            assert res.axis == expected_axis, f"Failed for address '{address}'"
            assert res.is_fallback is False

    def test_level3_unknown_fallback(self):
        res = AxisAutoDetector.detect("Adresse totalement inconnue xyz 9999")
        assert res.axis == LogisticAxis.AXE_CENTRE
        assert res.is_fallback is True
        assert res.matched_keyword is None

    def test_empty_address_fallback(self):
        res = AxisAutoDetector.detect("")
        assert res.axis == LogisticAxis.AXE_CENTRE
        assert res.is_fallback is True
