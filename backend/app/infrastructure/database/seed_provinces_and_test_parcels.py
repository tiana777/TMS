"""Script to seed realistic provinces corridors (axes), bus stations (gares),
transport cooperatives and authentic test parcels for Madagascar national logistics network.
"""

from datetime import datetime
from backend.app.infrastructure.database.connection import SessionLocal, engine
from backend.app.infrastructure.persistence.models import (
    AxisORM,
    ZoneORM,
    PartnerORM,
    VendorORM,
    CourierORM,
    ParcelORM,
    ParcelStatusHistoryORM,
)

# 1. Authentic Province Corridors (Axes) & Regional Destinations (Zones)
PROVINCE_AXES = [
    (
        "AXE_PROV_RN2_EST",
        "AXE PROVINCE RN2 EST (Tamatave / Moramanga / Sainte-Marie)",
        [
            "Toamasina Port",
            "Toamasina Bazar Be",
            "Moramanga Centre",
            "Brickaville",
            "Foulpointe (Mahavelona)",
            "Fénérive-Est (Fenoarivo)",
            "Sainte-Marie (Nosy Boraha)",
            "Mahambo",
            "Vatomandry",
            "Mahanoro",
        ],
    ),
    (
        "AXE_PROV_RN4_OUEST",
        "AXE PROVINCE RN4 NORD-OUEST (Majunga / Maevatanana / Marovoay)",
        [
            "Mahajanga Bord de Mer",
            "Mahajanga Bazar Be",
            "Maevatanana Centre",
            "Ankazobe",
            "Ambato-Boeni",
            "Marovoay",
            "Port-Bergé (Boriziny)",
            "Mampikony",
        ],
    ),
    (
        "AXE_PROV_RN6_NORD",
        "AXE PROVINCE RN6 GRAND NORD (Diego-Suarez / Nosy Be / Sambava)",
        [
            "Antsiranana Bazarikely",
            "Antsiranana Place Scobel",
            "Nosy Be Hell-Ville",
            "Ambanja Centre",
            "Ambilobe",
            "Antsohihy",
            "Sambava Centre",
            "Antalaha",
            "Vohémar (Iharana)",
            "Andapa",
        ],
    ),
    (
        "AXE_PROV_RN7_SUD",
        "AXE PROVINCE RN7 SUD (Antsirabe / Ambositra / Fianarantsoa)",
        [
            "Antsirabe Centre",
            "Antsirabe Ville d'Eaux",
            "Ambositra Centre",
            "Fianarantsoa Tanàna Vaovao",
            "Fianarantsoa Haute-Ville",
            "Ambohimahasoa",
            "Ambalavao",
            "Ihosy",
        ],
    ),
    (
        "AXE_PROV_RN7_SUD_OUEST",
        "AXE PROVINCE RN7 SUD-OUEST (Tuléar / Morondava / Sakaraha)",
        [
            "Toliara Sanfily",
            "Toliara Bazar Be",
            "Sakaraha",
            "Ilakaka",
            "Ifaty",
            "Morondava Centre",
            "Morondava Allée des Baobabs",
            "Miandrivazo",
            "Mahabo",
        ],
    ),
    (
        "AXE_PROV_SUD_EST",
        "AXE PROVINCE SUD-EST & ANOSY (Manakara / Farafangana / Fort-Dauphin)",
        [
            "Manakara Port",
            "Farafangana Centre",
            "Ranomafana",
            "Vohipeno",
            "Taolagnaro Fort-Dauphin",
            "Ambovombe Androy",
        ],
    ),
    (
        "AXE_PROV_RN44_ALAOTRA",
        "AXE PROVINCE RN44 (Ambatondrazaka / Lac Alaotra)",
        [
            "Ambatondrazaka Centre",
            "Ambatondrazaka Grand Marché",
            "Amparafaravola",
            "Andilamena",
        ],
    ),
]

# 2. National Bus Stations (Gares) & Transport Cooperatives / Delivery Entities
PROVINCE_PARTNERS = [
    # Gares Routières
    {
        "nom": "Gare Routière Ambodivona (Lignes Est & Alaotra)",
        "contact": "034 00 111 22",
        "type": "GARE",
        "gare_rattachement": "Ambodivona",
    },
    {
        "nom": "Gare Routière Fasan'ny Karana (Lignes Sud & Sud-Est)",
        "contact": "032 00 222 33",
        "type": "GARE",
        "gare_rattachement": "Fasan'ny Karana",
    },
    {
        "nom": "Gare Routière Maki Andohatapenaka (Lignes Nord-Ouest & Menabe)",
        "contact": "033 00 333 44",
        "type": "GARE",
        "gare_rattachement": "Andohatapenaka",
    },
    {
        "nom": "Gare Routière Aranta - Mahajanga",
        "contact": "034 11 444 55",
        "type": "GARE",
        "gare_rattachement": "Mahajanga",
    },
    {
        "nom": "Gare Routière Bazar Be - Toamasina",
        "contact": "032 22 555 66",
        "type": "GARE",
        "gare_rattachement": "Toamasina",
    },
    {
        "nom": "Gare Routière Tsianolondroa - Fianarantsoa",
        "contact": "033 33 666 77",
        "type": "GARE",
        "gare_rattachement": "Fianarantsoa",
    },
    {
        "nom": "Gare Routière Sanfily - Toliara",
        "contact": "034 44 777 88",
        "type": "GARE",
        "gare_rattachement": "Toliara",
    },
    # Coopératives de Transport & Entités de Distribution Régionales
    {
        "nom": "Cotisse Transport VIP & Colis",
        "contact": "032 11 025 00",
        "type": "COOPERATIVE",
        "gare_rattachement": "Ambodivona",
    },
    {
        "nom": "Besady Plus Transport",
        "contact": "033 15 444 77",
        "type": "COOPERATIVE",
        "gare_rattachement": "Andohatapenaka",
    },
    {
        "nom": "Kofmad Transport Sud",
        "contact": "034 22 555 88",
        "type": "COOPERATIVE",
        "gare_rattachement": "Fasan'ny Karana",
    },
    {
        "nom": "Sonatra Transport National",
        "contact": "032 05 666 99",
        "type": "COOPERATIVE",
        "gare_rattachement": "Fasan'ny Karana",
    },
    {
        "nom": "Trans-Post Express Toamasina",
        "contact": "034 88 999 00",
        "type": "COOPERATIVE",
        "gare_rattachement": "Ambodivona",
    },
    {
        "nom": "Soatrans Coopérative Est",
        "contact": "033 12 333 44",
        "type": "COOPERATIVE",
        "gare_rattachement": "Ambodivona",
    },
    {
        "nom": "Trans-Nord Express Diego & Nosy Be",
        "contact": "032 44 888 11",
        "type": "COOPERATIVE",
        "gare_rattachement": "Andohatapenaka",
    },
    {
        "nom": "Trans-Sud Express RN7",
        "contact": "034 11 777 22",
        "type": "COOPERATIVE",
        "gare_rattachement": "Fasan'ny Karana",
    },
    {
        "nom": "Trans-Alaotra Ambatondrazaka",
        "contact": "033 22 666 33",
        "type": "COOPERATIVE",
        "gare_rattachement": "Ambodivona",
    },
    {
        "nom": "Trans-Menabe Morondava",
        "contact": "034 55 444 11",
        "type": "COOPERATIVE",
        "gare_rattachement": "Andohatapenaka",
    },
    {
        "nom": "Air Fort Services Colis",
        "contact": "032 33 999 00",
        "type": "COOPERATIVE",
        "gare_rattachement": "Fasan'ny Karana",
    },
    {
        "nom": "Vatsy Coopérative Tamatave",
        "contact": "034 66 111 55",
        "type": "COOPERATIVE",
        "gare_rattachement": "Ambodivona",
    },
    {
        "nom": "Chérubin Transport Sud",
        "contact": "033 77 222 88",
        "type": "COOPERATIVE",
        "gare_rattachement": "Fasan'ny Karana",
    },
    {
        "nom": "Colis Express Diana Nord",
        "contact": "032 88 333 44",
        "type": "COOPERATIVE",
        "gare_rattachement": "Andohatapenaka",
    },
]


def seed_provinces_and_test_parcels():
    db = SessionLocal()
    try:
        print("--- 1. Seeding / Updating Province Axes & Zones ---")
        zone_map = {}  # zone_name -> zone_id
        axis_map = {}  # axis_code -> axis_id

        # Cache existing axes
        for a in db.query(AxisORM).all():
            axis_map[a.code] = a.id

        for code, libelle, zones_list in PROVINCE_AXES:
            axis = db.query(AxisORM).filter(AxisORM.code == code).first()
            if not axis:
                axis = AxisORM(code=code, libelle=libelle, type_axe="PROVINCE", actif=1)
                db.add(axis)
                db.flush()
                print(f"Created Axis: {code} ({libelle})")
            else:
                axis.type_axe = "PROVINCE"
                axis.libelle = libelle
                axis.actif = 1
                db.flush()
            axis_map[code] = axis.id

            # Add / attach zones
            for z_name in zones_list:
                existing_zone = db.query(ZoneORM).filter(ZoneORM.nom == z_name).first()
                if not existing_zone:
                    zone = ZoneORM(axe_id=axis.id, nom=z_name)
                    db.add(zone)
                    db.flush()
                    zone_map[z_name] = zone.id
                else:
                    existing_zone.axe_id = axis.id
                    db.flush()
                    zone_map[z_name] = existing_zone.id

        db.commit()
        print(f"Total Province Axes configured: {len(PROVINCE_AXES)}")

        print("\n--- 2. Seeding National Bus Stations (Gares) & Transport Cooperatives ---")
        partner_map = {}
        for p_data in PROVINCE_PARTNERS:
            existing_p = db.query(PartnerORM).filter(PartnerORM.nom == p_data["nom"]).first()
            if not existing_p:
                p = PartnerORM(
                    nom=p_data["nom"],
                    contact=p_data["contact"],
                    type=p_data["type"],
                    gare_rattachement=p_data["gare_rattachement"],
                    actif=1,
                )
                db.add(p)
                db.flush()
                partner_map[p_data["nom"]] = p.id
                print(f"Added Partner: {p_data['nom']} ({p_data['type']})")
            else:
                partner_map[p_data["nom"]] = existing_p.id

        # Also map existing partners from base seed
        for p in db.query(PartnerORM).all():
            partner_map[p.nom] = p.id

        db.commit()
        print(f"Total Partners indexed: {len(partner_map)}")

        print("\n--- 3. Seeding Realistic Test Parcels for Each Province ---")
        # Ensure a main vendor
        vendor = db.query(VendorORM).first()
        if not vendor:
            vendor = VendorORM(
                nom="Mod'Tanà Boutique",
                type_expediteur="CYBERMARCHAND",
                telephone="0345566778",
                contact_responsable="Madame Voahirana",
                adresse="Box 14, Pavillon Analakely",
                modalite_paiement="COMPTANT",
                actif=1,
            )
            db.add(vendor)
            db.flush()

        # Retrieve a courier for assigned test parcels (e.g. Navette Gares)
        courier = db.query(CourierORM).filter(CourierORM.actif == 1).first()
        courier_id = courier.id if courier else 1

        test_parcels_data = [
            # Tamatave / RN2 Est
            {
                "numero_bordereau": "PRV-RN2-0101",
                "client_nom": "Rasoanirina Christine",
                "client_tel": "0341234567",
                "designation": "Robes de soirée & Sandales été",
                "lieu_detail": "Tamatave Port, face Bureau Douane - Retrait Cotisse Ambodivona vers Toamasina",
                "axe": "AXE_PROV_RN2_EST",
                "zone_nom": "Toamasina Port",
                "montant_marchandise": 120000.0,
                "frais_livraison": 15000.0,
                "frais_partenaire": 12000.0,
                "statut": "EN_DEPOT",
                "nom_partenaire": "Cotisse Transport VIP & Colis",
                "reference_partenaire": None,
                "driver_contact": None,
                "vehicle_plate": None,
                "mode_paiement": None,
            },
            {
                "numero_bordereau": "PRV-RN2-0102",
                "client_nom": "Rakotomalala Jean-Luc",
                "client_tel": "0325566778",
                "designation": "Pièces détachées moto 125cc",
                "lieu_detail": "Moramanga Centre, près Gare ferroviaire - Soatrans Ambodivona",
                "axe": "AXE_PROV_RN2_EST",
                "zone_nom": "Moramanga Centre",
                "montant_marchandise": 65000.0,
                "frais_livraison": 10000.0,
                "frais_partenaire": 8000.0,
                "statut": "ASSIGNE",
                "livreur_id": courier_id,
                "nom_partenaire": "Soatrans Coopérative Est",
                "reference_partenaire": None,
                "driver_contact": None,
                "vehicle_plate": None,
                "mode_paiement": None,
            },
            {
                "numero_bordereau": "PRV-RN2-0103",
                "client_nom": "Ravelomanantsoa Brigitte",
                "client_tel": "0339988776",
                "designation": "Lot T-shirts & Casquettes brodées",
                "lieu_detail": "Sainte-Marie (Nosy Boraha), Ilot Madame via Toamasina - Vatsy Ambodivona",
                "axe": "AXE_PROV_RN2_EST",
                "zone_nom": "Sainte-Marie (Nosy Boraha)",
                "montant_marchandise": 150000.0,
                "frais_livraison": 25000.0,
                "frais_partenaire": 18000.0,
                "statut": "SOUS_TRAITE",
                "livreur_id": courier_id,
                "nom_partenaire": "Vatsy Coopérative Tamatave",
                "reference_partenaire": "VAT-77291",
                "driver_contact": "Rakoto 034 11 222 33",
                "vehicle_plate": "2841 TAB",
                "mode_paiement": None,
            },
            {
                "numero_bordereau": "PRV-RN2-0104",
                "client_nom": "Andrianasolo Toky",
                "client_tel": "0347766554",
                "designation": "Téléphone 4G & Écouteurs sans fil",
                "lieu_detail": "Toamasina Bazar Be, Allée Marchande",
                "axe": "AXE_PROV_RN2_EST",
                "zone_nom": "Toamasina Bazar Be",
                "montant_marchandise": 210000.0,
                "frais_livraison": 15000.0,
                "frais_partenaire": 10000.0,
                "statut": "LIVRE_ENCAISSE",
                "mode_paiement": "MVOLA",
                "nom_partenaire": "Trans-Post Express Toamasina",
                "reference_partenaire": "TPE-00812",
                "driver_contact": "Rabe 034 88 123 45",
                "vehicle_plate": "4102 TAB",
            },

            # Majunga / RN4 Nord-Ouest
            {
                "numero_bordereau": "PRV-RN4-0201",
                "client_nom": "Randriamanantena Hery",
                "client_tel": "0331122334",
                "designation": "Montres connectées & Enceinte Bluetooth",
                "lieu_detail": "Mahajanga Bord de Mer, près du Grand Baobab - Besady Plus Maki",
                "axe": "AXE_PROV_RN4_OUEST",
                "zone_nom": "Mahajanga Bord de Mer",
                "montant_marchandise": 185000.0,
                "frais_livraison": 20000.0,
                "frais_partenaire": 15000.0,
                "statut": "EN_DEPOT",
                "nom_partenaire": "Besady Plus Transport",
                "reference_partenaire": None,
                "driver_contact": None,
                "vehicle_plate": None,
                "mode_paiement": None,
            },
            {
                "numero_bordereau": "PRV-RN4-0202",
                "client_nom": "Razafindrakoto Mamisoa",
                "client_tel": "0348899001",
                "designation": "Packs Solaires 50W & Ampoules LED",
                "lieu_detail": "Maevatanana Centre, RN4 - Trans-Boeny",
                "axe": "AXE_PROV_RN4_OUEST",
                "zone_nom": "Maevatanana Centre",
                "montant_marchandise": 95000.0,
                "frais_livraison": 15000.0,
                "frais_partenaire": 10000.0,
                "statut": "EN_COURS",
                "livreur_id": courier_id,
                "nom_partenaire": "Besady Plus Transport",
                "reference_partenaire": None,
                "driver_contact": None,
                "vehicle_plate": None,
                "mode_paiement": None,
            },
            {
                "numero_bordereau": "PRV-RN4-0203",
                "client_nom": "Ratsimbazafy Faly",
                "client_tel": "0324455667",
                "designation": "Cartouches d'encre & Rames papier A4",
                "lieu_detail": "Ambato-Boeni Marché Municipal, Boeny",
                "axe": "AXE_PROV_RN4_OUEST",
                "zone_nom": "Ambato-Boeni",
                "montant_marchandise": 110000.0,
                "frais_livraison": 18000.0,
                "frais_partenaire": 14000.0,
                "statut": "SOUS_TRAITE",
                "livreur_id": courier_id,
                "nom_partenaire": "Besady Plus Transport",
                "reference_partenaire": "BES-44102",
                "driver_contact": "Jean-Marc 032 77 111 22",
                "vehicle_plate": "1102 TAB",
                "mode_paiement": None,
            },

            # Diego / RN6 Grand Nord & Nosy Be
            {
                "numero_bordereau": "PRV-RN6-0301",
                "client_nom": "Rabenjamina Solofo",
                "client_tel": "0323322110",
                "designation": "Tablettes tactiles éducatives",
                "lieu_detail": "Antsiranana Bazarikely, Diego-Suarez - Trans-Nord Maki",
                "axe": "AXE_PROV_RN6_NORD",
                "zone_nom": "Antsiranana Bazarikely",
                "montant_marchandise": 240000.0,
                "frais_livraison": 30000.0,
                "frais_partenaire": 22000.0,
                "statut": "EN_DEPOT",
                "nom_partenaire": "Trans-Nord Express Diego & Nosy Be",
                "reference_partenaire": None,
                "driver_contact": None,
                "vehicle_plate": None,
                "mode_paiement": None,
            },
            {
                "numero_bordereau": "PRV-RN6-0302",
                "client_nom": "Ravololomihanta Nicole",
                "client_tel": "0336655443",
                "designation": "Parfums & Coffrets Beauté Luxe",
                "lieu_detail": "Nosy Be Hell-Ville, Boulevard Pasteur via Ankify",
                "axe": "AXE_PROV_RN6_NORD",
                "zone_nom": "Nosy Be Hell-Ville",
                "montant_marchandise": 320000.0,
                "frais_livraison": 35000.0,
                "frais_partenaire": 26000.0,
                "statut": "SOUS_TRAITE",
                "livreur_id": courier_id,
                "nom_partenaire": "Cotisse Transport VIP & Colis",
                "reference_partenaire": "COT-99482",
                "driver_contact": "Andry 033 44 555 66",
                "vehicle_plate": "9876 TAA",
                "mode_paiement": None,
            },
            {
                "numero_bordereau": "PRV-RN6-0303",
                "client_nom": "Raharinirina Lova",
                "client_tel": "0342211009",
                "designation": "Accessoires de pêche & Lunettes polarisées",
                "lieu_detail": "Sambava Centre, Allée de la Vanille",
                "axe": "AXE_PROV_RN6_NORD",
                "zone_nom": "Sambava Centre",
                "montant_marchandise": 175000.0,
                "frais_livraison": 30000.0,
                "frais_partenaire": 20000.0,
                "statut": "EN_DEPOT",
                "nom_partenaire": "Colis Express Diana Nord",
                "reference_partenaire": None,
                "driver_contact": None,
                "vehicle_plate": None,
                "mode_paiement": None,
            },

            # Antsirabe & Fianarantsoa / RN7 Sud
            {
                "numero_bordereau": "PRV-RN7-0401",
                "client_nom": "Rajaonarivelo Mamy",
                "client_tel": "0328877665",
                "designation": "Chaussures de randonnée & Sacs à dos",
                "lieu_detail": "Antsirabe Centre, face Hôtel des Thermes - Fasan'ny Karana",
                "axe": "AXE_PROV_RN7_SUD",
                "zone_nom": "Antsirabe Centre",
                "montant_marchandise": 85000.0,
                "frais_livraison": 10000.0,
                "frais_partenaire": 7000.0,
                "statut": "EN_DEPOT",
                "nom_partenaire": "Trans-Sud Express RN7",
                "reference_partenaire": None,
                "driver_contact": None,
                "vehicle_plate": None,
                "mode_paiement": None,
            },
            {
                "numero_bordereau": "PRV-RN7-0402",
                "client_nom": "Ramanandraibe Eric",
                "client_tel": "0334433221",
                "designation": "Outillage de menuiserie & Sculpture",
                "lieu_detail": "Ambositra Centre Artisanal, Grand Sud",
                "axe": "AXE_PROV_RN7_SUD",
                "zone_nom": "Ambositra Centre",
                "montant_marchandise": 115000.0,
                "frais_livraison": 12000.0,
                "frais_partenaire": 9000.0,
                "statut": "ASSIGNE",
                "livreur_id": courier_id,
                "nom_partenaire": "Sonatra Transport National",
                "reference_partenaire": None,
                "driver_contact": None,
                "vehicle_plate": None,
                "mode_paiement": None,
            },
            {
                "numero_bordereau": "PRV-RN7-0403",
                "client_nom": "Rakotondrabe Aina",
                "client_tel": "0349911223",
                "designation": "Fournitures médicales & Tensiomètres",
                "lieu_detail": "Fianarantsoa Tanàna Vaovao, près Pharmacie Centrale",
                "axe": "AXE_PROV_RN7_SUD",
                "zone_nom": "Fianarantsoa Tanàna Vaovao",
                "montant_marchandise": 140000.0,
                "frais_livraison": 15000.0,
                "frais_partenaire": 11000.0,
                "statut": "SOUS_TRAITE",
                "livreur_id": courier_id,
                "nom_partenaire": "Trans-Sud Express RN7",
                "reference_partenaire": "TSD-44589",
                "driver_contact": "Solofo 034 55 666 77",
                "vehicle_plate": "4512 TAF",
                "mode_paiement": None,
            },
            {
                "numero_bordereau": "PRV-RN7-0404",
                "client_nom": "Randriamampionona Zo",
                "client_tel": "0321199887",
                "designation": "Colis de semences maraîchères & Engrais bio",
                "lieu_detail": "Ambalavao Marché aux Zébus, RN7",
                "axe": "AXE_PROV_RN7_SUD",
                "zone_nom": "Ambalavao",
                "montant_marchandise": 70000.0,
                "frais_livraison": 15000.0,
                "frais_partenaire": 10000.0,
                "statut": "LIVRE_ENCAISSE",
                "mode_paiement": "ORANGE_MONEY",
                "nom_partenaire": "Kofmad Transport Sud",
                "reference_partenaire": "KOF-11822",
                "driver_contact": "Dera 032 00 999 11",
                "vehicle_plate": "8899 TAB",
            },

            # Tuléar & Morondava / RN7 Sud-Ouest
            {
                "numero_bordereau": "PRV-TLE-0501",
                "client_nom": "Rasolofonirina Fanja",
                "client_tel": "0337788990",
                "designation": "Matériel de coiffure & Lisseurs professionnels",
                "lieu_detail": "Toliara Sanfily, près Station Jovenna - Kofmad Fasan'ny Karana",
                "axe": "AXE_PROV_RN7_SUD_OUEST",
                "zone_nom": "Toliara Sanfily",
                "montant_marchandise": 160000.0,
                "frais_livraison": 25000.0,
                "frais_partenaire": 18000.0,
                "statut": "EN_DEPOT",
                "nom_partenaire": "Kofmad Transport Sud",
                "reference_partenaire": None,
                "driver_contact": None,
                "vehicle_plate": None,
                "mode_paiement": None,
            },
            {
                "numero_bordereau": "PRV-TLE-0502",
                "client_nom": "Andriatsitohaina Patrick",
                "client_tel": "0346655441",
                "designation": "Caméras d'action & Trépieds voyage",
                "lieu_detail": "Morondava Allée des Baobabs, Allée Principale",
                "axe": "AXE_PROV_RN7_SUD_OUEST",
                "zone_nom": "Morondava Allée des Baobabs",
                "montant_marchandise": 230000.0,
                "frais_livraison": 25000.0,
                "frais_partenaire": 18000.0,
                "statut": "SOUS_TRAITE",
                "livreur_id": courier_id,
                "nom_partenaire": "Trans-Menabe Morondava",
                "reference_partenaire": "TMN-66120",
                "driver_contact": "Paul 032 22 111 00",
                "vehicle_plate": "3344 TAB",
                "mode_paiement": None,
            },

            # Sud-Est & Anosy
            {
                "numero_bordereau": "PRV-STE-0601",
                "client_nom": "Razanamalala Marie",
                "client_tel": "0324411223",
                "designation": "Kits scolaires & Dictionnaires",
                "lieu_detail": "Manakara Port, Gare FCE - Kofmad Sud-Est",
                "axe": "AXE_PROV_SUD_EST",
                "zone_nom": "Manakara Port",
                "montant_marchandise": 80000.0,
                "frais_livraison": 20000.0,
                "frais_partenaire": 15000.0,
                "statut": "EN_DEPOT",
                "nom_partenaire": "Kofmad Transport Sud",
                "reference_partenaire": None,
                "driver_contact": None,
                "vehicle_plate": None,
                "mode_paiement": None,
            },
            {
                "numero_bordereau": "PRV-STE-0602",
                "client_nom": "Ratsitorahana Guy",
                "client_tel": "0335566770",
                "designation": "Ventilateurs solaires rechargeables",
                "lieu_detail": "Taolagnaro Fort-Dauphin, Bazarikely",
                "axe": "AXE_PROV_SUD_EST",
                "zone_nom": "Taolagnaro Fort-Dauphin",
                "montant_marchandise": 290000.0,
                "frais_livraison": 35000.0,
                "frais_partenaire": 25000.0,
                "statut": "SOUS_TRAITE",
                "livreur_id": courier_id,
                "nom_partenaire": "Air Fort Services Colis",
                "reference_partenaire": "AFS-00912",
                "driver_contact": "Jean 033 11 999 88",
                "vehicle_plate": "7788 TAA",
                "mode_paiement": None,
            },

            # Lac Alaotra / RN44
            {
                "numero_bordereau": "PRV-ALT-0701",
                "client_nom": "Rabemananjara Justin",
                "client_tel": "0343344556",
                "designation": "Motopompes & Tuyaux d'arrosage 50m",
                "lieu_detail": "Ambatondrazaka Grand Marché, Alaotra - Trans-Alaotra Ambodivona",
                "axe": "AXE_PROV_RN44_ALAOTRA",
                "zone_nom": "Ambatondrazaka Grand Marché",
                "montant_marchandise": 195000.0,
                "frais_livraison": 20000.0,
                "frais_partenaire": 14000.0,
                "statut": "EN_DEPOT",
                "nom_partenaire": "Trans-Alaotra Ambatondrazaka",
                "reference_partenaire": None,
                "driver_contact": None,
                "vehicle_plate": None,
                "mode_paiement": None,
            },
        ]

        today_date = "2026-11-08"
        created_count = 0
        updated_count = 0

        for p_info in test_parcels_data:
            bdr = p_info["numero_bordereau"]
            existing_colis = db.query(ParcelORM).filter(ParcelORM.numero_bordereau == bdr).first()

            partenaire_id = partner_map.get(p_info["nom_partenaire"]) if p_info.get("nom_partenaire") else None
            zone_id = zone_map.get(p_info["zone_nom"])

            if not existing_colis:
                colis = ParcelORM(
                    numero_bordereau=bdr,
                    date_reception=today_date,
                    vendeur_id=vendor.id,
                    expediteur_type="CYBERMARCHAND",
                    expediteur_nom=vendor.nom,
                    expediteur_tel=vendor.telephone,
                    expediteur_adresse=vendor.adresse,
                    client_nom=p_info["client_nom"],
                    client_tel=p_info["client_tel"],
                    designation=p_info["designation"],
                    lieu_detail=p_info["lieu_detail"],
                    axe=p_info["axe"],
                    axe_modifie_manuellement=1,
                    type_flux="PROVINCE",
                    zone_id=zone_id,
                    montant_marchandise=p_info["montant_marchandise"],
                    frais_livraison=p_info["frais_livraison"],
                    frais_partenaire=p_info["frais_partenaire"],
                    statut=p_info["statut"],
                    livreur_id=p_info.get("livreur_id"),
                    partenaire_id=partenaire_id,
                    nom_partenaire=p_info.get("nom_partenaire"),
                    reference_partenaire=p_info.get("reference_partenaire"),
                    driver_contact=p_info.get("driver_contact"),
                    vehicle_plate=p_info.get("vehicle_plate"),
                    mode_paiement=p_info.get("mode_paiement"),
                    actif=1,
                )
                db.add(colis)
                db.flush()
                # Create initial status history entry
                hist = ParcelStatusHistoryORM(
                    colis_id=colis.id,
                    statut_precedent=None,
                    statut_nouveau=colis.statut,
                    motif=f"Colis test Province enregistré ({colis.axe})",
                    horodatage=datetime.utcnow(),
                )
                db.add(hist)
                created_count += 1
            else:
                existing_colis.date_reception = today_date
                existing_colis.axe = p_info["axe"]
                existing_colis.zone_id = zone_id
                existing_colis.statut = p_info["statut"]
                existing_colis.nom_partenaire = p_info.get("nom_partenaire")
                existing_colis.reference_partenaire = p_info.get("reference_partenaire")
                existing_colis.driver_contact = p_info.get("driver_contact")
                existing_colis.vehicle_plate = p_info.get("vehicle_plate")
                existing_colis.mode_paiement = p_info.get("mode_paiement")
                existing_colis.actif = 1
                updated_count += 1

        db.commit()
        print(f"Created {created_count} new realistic province parcels, updated {updated_count}.")
        print("--- Seeding complete successfully! ---")
    except Exception as e:
        db.rollback()
        print(f"Error during province seeding: {e}")
        raise e
    finally:
        db.close()


if __name__ == "__main__":
    seed_provinces_and_test_parcels()
