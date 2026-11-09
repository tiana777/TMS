"""Unit tests for AxisAutoDetector Domain Service with real Excel operational corridors."""

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

    def test_level2_real_urban_corridors_and_fees(self):
        cases = [
            # 1. Itaosy (Ouest)
            ("67Ha Sud près du marché", LogisticAxis.AXE_ITAOSY, 3000),
            ("Itaosy Cité", LogisticAxis.AXE_ITAOSY, 4000),
            ("Itaosy Sinibeandrano", LogisticAxis.AXE_ITAOSY, 5000),
            # 2. Ampitatafika (Sud-Ouest)
            ("Ampitatafika près du pont", LogisticAxis.AXE_AMPITATAFIKA, 4000),
            ("Fenoarivo centre", LogisticAxis.AXE_AMPITATAFIKA, 4000),
            # 3. Ambohimangakely (Est)
            ("Besarety pharmacie", LogisticAxis.AXE_AMBOHIMANGAKELY, 3000),
            ("Ambohimangakely Ankadilalana", LogisticAxis.AXE_AMBOHIMANGAKELY, 4000),
            ("Ambodivoara", LogisticAxis.AXE_AMBOHIMANGAKELY, 5000),
            # 4. Sabotsy Namehana (Nord)
            ("Andravoahangy marché", LogisticAxis.AXE_SABOTSY_NAMEHANA, 3000),
            ("Ankadikely Ilafy", LogisticAxis.AXE_SABOTSY_NAMEHANA, 4000),
            ("Sabotsy Namehana centre", LogisticAxis.AXE_SABOTSY_NAMEHANA, 5000),
            # 5. Ivato (Nord-Ouest / Digue)
            ("Andraharo Zone Galaxy", LogisticAxis.AXE_IVATO, 3000),
            ("Talatamaty route principale", LogisticAxis.AXE_IVATO, 4000),
            ("Ivato aéroport", LogisticAxis.AXE_IVATO, 5000),
            # 6. Iavoloha (Sud)
            ("Tanjombato près du pont", LogisticAxis.AXE_IAVOLOHA, 4000),
            ("Iavoloha Galana", LogisticAxis.AXE_IAVOLOHA, 5000),
            # 7. Alasora (Sud-Est)
            ("Ambanidia en haut", LogisticAxis.AXE_ALASORA, 3000),
            ("Alasora Commune", LogisticAxis.AXE_ALASORA, 4000),
            ("Ambohimanambola Tetezana", LogisticAxis.AXE_ALASORA, 5000),
            # 8. Centre Ville 1 (Hyper-Centre)
            ("Analakely avenue de l'indépendance", LogisticAxis.AXE_CENTRE_1, 3000),
            ("Isoraka près de l'ambassade", LogisticAxis.AXE_CENTRE_1, 3000),
            # 9. Centre Ville 2 (Péri-Centre)
            ("Antanimena face église", LogisticAxis.AXE_CENTRE_2, 3000),
            ("Ivandry près ambassade", LogisticAxis.AXE_CENTRE_2, 3000),
        ]
        for address, expected_axis, expected_fee in cases:
            res = AxisAutoDetector.detect(address)
            assert res.axis == expected_axis, f"Failed for address '{address}': got {res.axis}"
            assert res.is_fallback is False
            assert res.delivery_fee == expected_fee, f"Fee failed for '{address}': got {res.delivery_fee}"

    def test_level3_unknown_fallback(self):
        res = AxisAutoDetector.detect("Adresse totalement inconnue xyz 9999")
        assert res.axis == LogisticAxis.AXE_CENTRE_1
        assert res.is_fallback is True
        assert res.matched_keyword is None

    def test_empty_address_fallback(self):
        res = AxisAutoDetector.detect("")
        assert res.axis == LogisticAxis.AXE_CENTRE_1
        assert res.is_fallback is True
