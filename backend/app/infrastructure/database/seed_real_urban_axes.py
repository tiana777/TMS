"""Seed and migrate to the exact 9 real urban delivery axes and zones from Excel."""

import re
import unicodedata
from sqlalchemy import text
from backend.app.infrastructure.database.connection import engine, SessionLocal
from backend.app.infrastructure.persistence.models import AxisORM, ZoneORM, ParcelORM, CourierORM

def normalize_text(text_val: str) -> str:
    if not text_val:
        return ""
    text_val = unicodedata.normalize("NFKD", text_val).encode("ASCII", "ignore").decode("utf-8")
    return re.sub(r"[^a-z0-9]", "", text_val.lower())

REAL_URBAN_AXES_DATA = {
    "AXE_CENTRE_1": {
        "libelle": "Axe Centre Ville 1 (Hyper-Centre & Analakely)",
        "type_axe": "URBAIN",
        "zones": [
            ("Ambatonakanga-Ambohitsorohitra", 3000),
            ("Ambatovinaky", 3000),
            ("Ambodifilao-Soarano", 3000),
            ("Amparibe-Avaratr’Imahamasina", 3000),
            ("Ampasamadinika-Amboasarikely", 3000),
            ("Faravohitra", 3000),
            ("Isoraka", 3000),
            ("Tsaralalana", 3000),
            ("Ambondrona -Tsiazotafo", 3000),
            ("Andafiavaratra", 3000),
            ("Manjakamiadana", 3000),
            ("Behoririka", 3000),
            ("Analakely", 3000),
            ("Ankadilalana", 3000),
            ("Fiadanana", 3000),
            ("Mahamasina", 3000),
            ("Tsimialonjafy", 3000),
            ("Ambanin’Ampamarinana", 3000),
            ("Ambohijatovo", 3000),
            ("Mananjara -Fort-Voyron", 3000),
            ("Petite vitesse", 3000),
            ("Soarano", 3000),
            ("Antaninandro", 3000),
            ("Ambohipotsy", 3000),
            ("Andohalo", 3000),
            ("Anjohy", 3000),
            ("Antaninarenina", 3000),
        ]
    },
    "AXE_CENTRE_2": {
        "libelle": "Axe Centre Ville 2 (Péri-Centre & Antanimena)",
        "type_axe": "URBAIN",
        "zones": [
            ("Ambodivoanjo", 3000),
            ("Amboniloha", 3000),
            ("Ivandry", 3000),
            ("Morarano Alarobia", 3000),
            ("Soavimasoandro", 3000),
            ("Ambodivona", 3000),
            ("Ambatomitsangana", 3000),
            ("Ankadifotsy", 3000),
            ("Antanimena", 3000),
            ("Ankorondrano", 3000),
            ("Mandialaza", 3000),
            ("Tsaramasay", 3000),
            ("ambodifasina", 3000),
            ("Mahatony", 3000),
            ("ambatolampy tsimahafotsy", 4000),
        ]
    },
    "AXE_ITAOSY": {
        "libelle": "Axe Itaosy (67Ha, Itaosy & Ouest)",
        "type_axe": "URBAIN",
        "zones": [
            ("67ha", 3000),
            ("Itaosy Andranonahoatra", 4000),
            ("Itaosy Cité", 4000),
            ("Itaosy Sinibeandrano", 5000),
            ("Itaosy Ambohidrapeto", 5000),
            ("itaosy marobiby", 4000),
            ("Ampasika", 3000),
            ("itaosy horizon", 4000),
            ("itaosy ambavahaditokana", 4000),
            ("ambodin'isoty", 3000),
            ("antohomadinika", 3000),
            ("ambohitrimanjaka", 4000),
            ("Andohatapenaka", 3000),
            ("Ankasina", 3000),
            ("Manarintsoa", 3000),
            ("Anatihazo Isotry", 3000),
            ("Andranomanalina", 3000),
            ("Itaosy hopitaly", 4000),
            ("Bemasoandro", 4000),
            ("Itaosy Ambodifasika", 4000),
            ("Itaosy Ambohijanamasoandro", 4000),
            ("Itaosy Andohatanjona", 4000),
            ("Itaosy Ambodiapanga", 4000),
        ]
    },
    "AXE_AMPITATAFIKA": {
        "libelle": "Axe Ampitatafika (Ampefiloha, Fenoarivo & Sud-Ouest)",
        "type_axe": "URBAIN",
        "zones": [
            ("Ambalavao-Isotry", 3000),
            ("Andavamamba", 3000),
            ("Avaratetezana-Bekiraro", 3000),
            ("Ampefiloha", 3000),
            ("Anosizato Andrefana", 4000),
            ("Ampitatafika Ankaditany", 4000),
            ("Ampitatafika Tetezana", 4000),
            ("Anosibe", 3000),
            ("Anosipatrana", 3000),
            ("Anosizato Est", 3000),
            ("Ilanivato", 3000),
            ("Namontana", 3000),
            ("Anosizato ouest", 3000),
            ("Ambohimamory", 4000),
            ("Angarangarana", 3000),
            ("Anosy", 3000),
            ("Ampitatafika Faliarivo", 4000),
            ("Fenoarivo", 4000),
            ("Alakamisy Fenoarivo", 4000),
            ("Ambodiafontsy", 4000),
            ("Ambohimangidy", 4000),
        ]
    },
    "AXE_AMBOHIMANGAKELY": {
        "libelle": "Axe Ambohimangakely (RN2 Est & By-pass)",
        "type_axe": "URBAIN",
        "zones": [
            ("Ambohitrakely", 3000),
            ("Ampahibe", 3000),
            ("Besarety", 3000),
            ("Soavinandriana", 3000),
            ("Ambatokaranana", 3000),
            ("Ambatomaro", 3000),
            ("Ankadindramamy", 3000),
            ("Ambohimirary", 3000),
            ("Ampanotokana", 3000),
            ("Andraisoro", 3000),
            ("Nanisana", 3000),
            ("Tsarahonenana", 3000),
            ("Ambohimangakely Ankadilalana", 4000),
            ("Ambohimangaely eo CMT", 4000),
            ("Ambohimangakely", 4000),
            ("Antsobolo", 4000),
            ("Ambodivoara", 5000),
            ("Behintsy", 4000),
            ("bypass ambohimangakely", 4000),
            ("Avaradoha", 3000),
            ("Betongolo", 3000),
            ("Mahavoky", 3000),
            ("Mahazo", 3000),
            ("Soamanandrariny", 4000),
            ("Ambohibe", 4000),
            ("Ankadiefajoro", 4000),
        ]
    },
    "AXE_SABOTSY_NAMEHANA": {
        "libelle": "Axe Sabotsy Namehana (RN3 Nord & Avaradrano)",
        "type_axe": "URBAIN",
        "zones": [
            ("Ankadikely ilafy", 4000),
            ("Ilafy", 4000),
            ("Ambohitrarahaba", 4000),
            ("Antanandrano", 4000),
            ("Ambatobe ambony", 4000),
            ("Sabotsy Namehana", 5000),
            ("Ambatobe Ambany", 3000),
            ("Ambatomainty", 3000),
            ("Amboditsiry", 3000),
            ("Analamahintsy cité", 3000),
            ("Analamahintsy Tanàna", 3000),
            ("Androhibe", 3000),
            ("Anjanahary", 3000),
            ("Manjakaray", 3000),
            ("Andravoahangy", 3000),
            ("Anosy avaratra", 4000),
            ("Lazaina avaradrano", 4000),
            ("Soavinimerina", 4000),
            ("Manjaka Ilafy", 4000),
            ("Antsampandrano Ilafy", 4000),
            ("Ambohipanja", 4000),
            ("Tsarafara Sabotsy Namehana", 5000),
            ("Manarintsoa Sabotsy Namehana", 5000),
            ("Ambatofotsy Sabotsy Namehana", 5000),
            ("Antsofinondry", 5000),
            ("Andranobevava", 3000),
            ("Masay", 3000),
        ]
    },
    "AXE_IVATO": {
        "libelle": "Axe Ivato (RN4 Digue & Aéroport)",
        "type_axe": "URBAIN",
        "zones": [
            ("Ivato aeroport", 5000),
            ("Ambohidratrimo", 5000),
            ("Mandrosoa Ivato", 5000),
            ("Ivato horizon", 5000),
            ("Ambohibao", 4000),
            ("Ambatolampy", 4000),
            ("Talatamaty", 4000),
            ("Antanetibe talatamaty", 4000),
            ("Ambohidroa", 4000),
            ("Andranomena", 4000),
            ("Ankazomanga", 3000),
            ("Andraharo", 3000),
            ("Ambodimita", 3000),
            ("Ambodivonkely", 3000),
            ("Ambohimanandray", 3000),
            ("Ambohimandroso", 3000),
            ("Ambohimitsinjo", 3000),
            ("Anosisoa", 3000),
            ("Anosivavaka", 3000),
            ("Antanety", 3000),
            ("Antanjombe", 3000),
            ("Ambodihady", 3000),
            ("Ivato Tanana", 5000),
            ("Croc farm", 5000),
            ("Antehiroka", 4000),
            ("Ambohijanahary Antehiroka", 4000),
        ]
    },
    "AXE_IAVOLOHA": {
        "libelle": "Axe Iavoloha (RN7 Sud & Atsimondrano)",
        "type_axe": "URBAIN",
        "zones": [
            ("Manakambahiny", 3000),
            ("Ouest Ambohijanahary", 3000),
            ("Ankaditoho", 3000),
            ("Marohoho", 3000),
            ("Soanierana", 3000),
            ("Tsarafaritra", 3000),
            ("Tsimbazaza", 3000),
            ("Tanjombato", 4000),
            ("Andoharanofotsy", 4000),
            ("Mandrimena", 4000),
            ("Forello", 4000),
            ("Ankaraobato", 4000),
            ("Iavoloha GALANA", 5000),
            ("Iavoloha Elgeco Plus", 5000),
            ("Imerimanjaka Bypass", 5000),
            ("Ambohijanaka", 5000),
            ("Soavina", 5000),
            ("Fasan'ny karana", 3000),
            ("Bypass Gazety", 4000),
            ("Bypass Iavoloha", 4000),
            ("Tongarivo", 4000),
            ("Bevalala", 4000),
            ("Ambohimanala", 4000),
            ("Ambohimanatrika", 4000),
            ("Saropody", 3000),
        ]
    },
    "AXE_ALASORA": {
        "libelle": "Axe Alasora (Sud-Est & By-pass Alasora)",
        "type_axe": "URBAIN",
        "zones": [
            ("Ampandrana-Ankadivato", 3000),
            ("Ambohipo", 3000),
            ("Androndra", 3000),
            ("Morarano Ambohitsoa", 3000),
            ("Tsiadana", 3000),
            ("Ambohitsoa", 3000),
            ("Ambanidia", 3000),
            ("Mandroseza", 3000),
            ("Antanimora Ampasanimalo", 3000),
            ("Ambatoroka", 3000),
            ("Ambohimiandra", 3000),
            ("Miandrarivo", 3000),
            ("Mahazoarivo", 3000),
            ("Ampamantanana", 3000),
            ("Andohanimandroseza", 3000),
            ("Antsahabe", 3000),
            ("Volosarika", 3000),
            ("Ankazotokana", 3000),
            ("Antsakaviro", 3000),
            ("Ampandrana", 3000),
            ("Ankadindratombo", 4000),
            ("Alasora Commune", 4000),
            ("Rond point Bypass Alasora", 4000),
            ("By pass Coté Alasora", 4000),
            ("Ambohidrazaka", 4000),
            ("Ambolokandrina", 4000),
            ("Ambohimanambola TETEZANA", 5000),
            ("Alasora Alatsinainy", 5000),
            ("Alasora Mahatsinjo", 5000),
            ("Alasora Ambohitanety", 5000),
            ("Ankatso", 3000),
            ("Antsahameva", 3000),
            ("Antsahamamy", 3000),
            ("Ankorahotra", 3000),
            ("Ampasanimalo", 3000),
            ("Avaratr'antanimora", 3000),
            ("Androndrakely", 3000),
        ]
    },
}

def detect_new_axis(address: str) -> str:
    norm_addr = normalize_text(address)
    for code, data in REAL_URBAN_AXES_DATA.items():
        for zone_name, _ in data["zones"]:
            norm_z = normalize_text(zone_name)
            if len(norm_z) >= 3 and norm_z in norm_addr:
                return code
    return "AXE_CENTRE_1"

def apply_real_axes_migration(seed_samples: bool = False):
    session = SessionLocal()
    try:
        with engine.connect() as conn:
            conn.execute(text("ALTER TABLE zones ADD COLUMN IF NOT EXISTS tarif_livraison INTEGER DEFAULT 3000;"))
            conn.commit()

        # 1. Upsert the 9 real urban axes
        print("Upserting 9 real urban axes...")
        for code, data in REAL_URBAN_AXES_DATA.items():
            axis = session.query(AxisORM).filter(AxisORM.code == code).first()
            if not axis:
                axis = AxisORM(
                    code=code,
                    libelle=data["libelle"],
                    type_axe=data["type_axe"],
                    actif=1,
                )
                session.add(axis)
                session.flush()
                print(f"Created axis: {code}")
            else:
                axis.libelle = data["libelle"]
                axis.type_axe = data["type_axe"]
                axis.actif = 1
                session.flush()

            # Delete old zones for this axis to replace with exact Excel list
            session.query(ZoneORM).filter(ZoneORM.axe_id == axis.id).delete()
            session.flush()

            for zone_name, fee in data["zones"]:
                # Check if zone exists
                existing_z = session.query(ZoneORM).filter(ZoneORM.nom == zone_name).first()
                if existing_z:
                    existing_z.axe_id = axis.id
                    existing_z.tarif_livraison = fee
                else:
                    z = ZoneORM(axe_id=axis.id, nom=zone_name, tarif_livraison=fee)
                    session.add(z)
            session.flush()

        # Deactivate old legacy axes (AXE_CENTRE, AXE_RN1, etc.)
        legacy_codes = ["AXE_CENTRE", "AXE_RN1", "AXE_RN2", "AXE_RN3", "AXE_RN4", "AXE_RN7", "AXE_SUD_EST"]
        for lc in legacy_codes:
            old_axis = session.query(AxisORM).filter(AxisORM.code == lc).first()
            if old_axis:
                old_axis.actif = 0

        session.commit()
        print("Axes and zones successfully seeded from Excel.")

        # 2. Re-classify existing parcels based on delivery_address
        print("Reclassifying existing stock parcels...")
        from backend.app.domain.services.axis_detector import AxisAutoDetector
        parcels = session.query(ParcelORM).filter(
            ParcelORM.axe.in_(legacy_codes)
        ).all()
        reclassified_count = 0
        for p in parcels:
            detected = AxisAutoDetector.detect(p.lieu_detail or "")
            p.axe = detected.axis.value
            reclassified_count += 1
        session.commit()
        print(f"Reclassified {reclassified_count} parcels to new real axes.")

        # 3. Update couriers to new axes
        print("Assigning couriers to new real axes...")
        couriers = session.query(CourierORM).all()
        new_axis_codes = list(REAL_URBAN_AXES_DATA.keys())
        for idx, c in enumerate(couriers):
            c.assigned_axis = new_axis_codes[idx % len(new_axis_codes)]
        session.commit()
        print("Couriers updated.")

        # 4. Optionally ensure each urban axis has active parcels in EN_DEPOT
        if seed_samples:
            seed_sample_depot_parcels(session)

    finally:
        session.close()

SAMPLE_DEPOT_PARCELS_DATA = [
    # AXE_CENTRE_2 (Péri-Centre & Antanimena)
    {"axe": "AXE_CENTRE_2", "client": "Ravelomanana Hery", "tel": "034 55 123 45", "lieu": "Antanimena face Villa Pradon", "desig": "Smartphone & Accessoires", "montant": 120000.0, "frais": 3000.0},
    {"axe": "AXE_CENTRE_2", "client": "Razafindrakoto Lova", "tel": "032 44 234 56", "lieu": "Ankorondrano Tour Zital", "desig": "Documents Juridiques", "montant": 0.0, "frais": 3000.0},
    {"axe": "AXE_CENTRE_2", "client": "Andrianasolo Faly", "tel": "033 11 345 67", "lieu": "Ivandry Résidence Magnolia", "desig": "Cosmétiques & Parfums Bio", "montant": 65000.0, "frais": 3000.0},
    {"axe": "AXE_CENTRE_2", "client": "Rakotomalala Tsiry", "tel": "038 22 456 78", "lieu": "Ambodivona près Pharmacie", "desig": "Pièces Électroniques", "montant": 45000.0, "frais": 3000.0},

    # AXE_AMPITATAFIKA (Ampefiloha, Anosibe & Fenoarivo)
    {"axe": "AXE_AMPITATAFIKA", "client": "Rasoanirina Voahirana", "tel": "034 66 789 01", "lieu": "Ampefiloha près Bâtiment CENAM", "desig": "Robes de créateur été", "montant": 55000.0, "frais": 3000.0},
    {"axe": "AXE_AMPITATAFIKA", "client": "Randrianasolo Michel", "tel": "032 88 901 23", "lieu": "Anosibe près Marché de Gros", "desig": "Matériel Informatique", "montant": 140000.0, "frais": 3000.0},
    {"axe": "AXE_AMPITATAFIKA", "client": "Raharison Mamy", "tel": "033 77 012 34", "lieu": "Ampitatafika Tetezana Lot 14", "desig": "Chaussures Cuir Homme", "montant": 70000.0, "frais": 4000.0},
    {"axe": "AXE_AMPITATAFIKA", "client": "Ratsimbazafy Nivo", "tel": "038 99 123 45", "lieu": "Fenoarivo Centre route RN1", "desig": "Colis Électroménager", "montant": 85000.0, "frais": 4000.0},

    # AXE_AMBOHIMANGAKELY (Besarety, Nanisana & RN2 Est)
    {"axe": "AXE_AMBOHIMANGAKELY", "client": "Andriamalala Tahina", "tel": "034 11 567 89", "lieu": "Besarety en face Station", "desig": "Lot de Vêtements Enfants", "montant": 38000.0, "frais": 3000.0},
    {"axe": "AXE_AMBOHIMANGAKELY", "client": "Razanadrakoto Nicole", "tel": "032 33 678 90", "lieu": "Nanisana près de la Cité", "desig": "Bijoux Fantaisie & Sacs", "montant": 48000.0, "frais": 3000.0},
    {"axe": "AXE_AMBOHIMANGAKELY", "client": "Rajaonarison Eric", "tel": "033 44 789 01", "lieu": "Ambohimangakely Ankadilalana", "desig": "Outillage Mécanique", "montant": 95000.0, "frais": 4000.0},
    {"axe": "AXE_AMBOHIMANGAKELY", "client": "Raveloson Sitraka", "tel": "038 55 890 12", "lieu": "Ambodivoara By-pass Est", "desig": "Kit Solaire Nomade", "montant": 110000.0, "frais": 5000.0},

    # AXE_SABOTSY_NAMEHANA (Ankadikely, Ilafy & RN3 Nord)
    {"axe": "AXE_SABOTSY_NAMEHANA", "client": "Ramananarivo Onja", "tel": "034 22 901 23", "lieu": "Analamahintsy Cité Seimad", "desig": "Pack Beauté Capillaire", "montant": 42000.0, "frais": 3000.0},
    {"axe": "AXE_SABOTSY_NAMEHANA", "client": "Andriamanantena Solofo", "tel": "032 55 012 34", "lieu": "Ankadikely Ilafy près Mairie", "desig": "Accessoires Déco Intérieur", "montant": 60000.0, "frais": 4000.0},
    {"axe": "AXE_SABOTSY_NAMEHANA", "client": "Rasoavelo Holy", "tel": "033 66 123 45", "lieu": "Ambohitrarahaba route RN3", "desig": "Sandales & Vannerie", "montant": 32000.0, "frais": 4000.0},
    {"axe": "AXE_SABOTSY_NAMEHANA", "client": "Razafimahatratra Yves", "tel": "038 77 234 56", "lieu": "Sabotsy Namehana Centre", "desig": "Batterie Externe & Câbles", "montant": 54000.0, "frais": 5000.0},

    # AXE_IVATO (Andraharo Galaxy, Talatamaty & RN4 Aéroport)
    {"axe": "AXE_IVATO", "client": "Rakotoniaina Fanja", "tel": "034 33 345 67", "lieu": "Andraharo Zone Galaxy Bât C", "desig": "Ordinateur Portable 14 pouces", "montant": 0.0, "frais": 3000.0},
    {"axe": "AXE_IVATO", "client": "Andrianaivoravelo Lalaina", "tel": "032 66 456 78", "lieu": "Alarobia près Jumbo Score", "desig": "Chaussures de Sport", "montant": 68000.0, "frais": 3000.0},
    {"axe": "AXE_IVATO", "client": "Ranaivomanana Patrick", "tel": "033 88 567 89", "lieu": "Talatamaty route principale", "desig": "Livre de Comptabilité & Droit", "montant": 25000.0, "frais": 4000.0},
    {"axe": "AXE_IVATO", "client": "Ramanantenasoa Marie", "tel": "038 11 678 90", "lieu": "Ivato Aéroport Fret", "desig": "Documents Douane Urgents", "montant": 0.0, "frais": 5000.0},

    # AXE_IAVOLOHA (Tanjombato, Andoharanofotsy & RN7 Sud)
    {"axe": "AXE_IAVOLOHA", "client": "Rasoamampionona Bakoly", "tel": "034 44 789 01", "lieu": "Tanjombato près Usine Cotona", "desig": "Tissus d'Ameublement", "montant": 78000.0, "frais": 4000.0},
    {"axe": "AXE_IAVOLOHA", "client": "Andriantsitohaina Marc", "tel": "032 77 890 12", "lieu": "Andoharanofotsy près Pharmacie", "desig": "Montre Connectée Sport", "montant": 92000.0, "frais": 4000.0},
    {"axe": "AXE_IAVOLOHA", "client": "Rakotondrazaka Denis", "tel": "033 99 901 23", "lieu": "Mandrimena Station Shell", "desig": "Casque Audio Bluetooth", "montant": 49000.0, "frais": 4000.0},
    {"axe": "AXE_IAVOLOHA", "client": "Ravalison Nirina", "tel": "038 33 012 34", "lieu": "Iavoloha Galana RN7 Sud", "desig": "Fournitures Scolaires & Jeux", "montant": 36000.0, "frais": 5000.0},

    # AXE_ALASORA (Ambanidia, Mandroseza & By-Pass)
    {"axe": "AXE_ALASORA", "client": "Rasolofoarisoa Fenitra", "tel": "034 77 123 45", "lieu": "Ambanidia face Total", "desig": "Vêtements Prêt-à-Porter", "montant": 44000.0, "frais": 3000.0},
    {"axe": "AXE_ALASORA", "client": "Rakotoarivelo Haja", "tel": "032 99 234 56", "lieu": "Mandroseza Tour d'eau", "desig": "Matériel de Dessin d'Art", "montant": 31000.0, "frais": 3000.0},
    {"axe": "AXE_ALASORA", "client": "Andriambololona Vero", "tel": "033 22 345 67", "lieu": "Alasora Commune Centre", "desig": "Électroménager Robot Cuisine", "montant": 125000.0, "frais": 4000.0},
    {"axe": "AXE_ALASORA", "client": "Ranaivojaona Feno", "tel": "038 44 456 78", "lieu": "Ambohimanambola Tetezana", "desig": "Lampes LED Rechargeables", "montant": 50000.0, "frais": 5000.0},
]

def seed_sample_depot_parcels(session):
    """Seed sample stock parcels in EN_DEPOT for every urban axis that has 0 parcels in stock."""
    from backend.app.infrastructure.persistence.models import VendorORM
    vendor = session.query(VendorORM).first()
    vendor_id = vendor.id if vendor else 1

    # Check parcel count in EN_DEPOT per axis
    from sqlalchemy import func
    counts = dict(
        session.query(ParcelORM.axe, func.count(ParcelORM.id))
        .filter(ParcelORM.statut == "EN_DEPOT")
        .group_by(ParcelORM.axe)
        .all()
    )

    created_count = 0
    import random
    from datetime import datetime

    for item in SAMPLE_DEPOT_PARCELS_DATA:
        axe_code = item["axe"]
        if counts.get(axe_code, 0) < 3:
            random_num = random.randint(1000, 9999)
            code = f"BDR-{axe_code[4:8]}-{random_num}"
            p = ParcelORM(
                numero_bordereau=code,
                date_reception=datetime.now().strftime("%Y-%m-%d"),
                vendeur_id=vendor_id,
                expediteur_type="CYBERMARCHAND",
                expediteur_nom="Mod'Tanà Boutique",
                expediteur_tel="0341234567",
                expediteur_adresse="Analakely, Antananarivo",
                client_nom=item["client"],
                client_tel=item["tel"].replace(" ", ""),
                designation=item["desig"],
                lieu_detail=item["lieu"],
                axe=axe_code,
                axe_modifie_manuellement=0,
                type_flux="COD" if item["montant"] > 0 else "SIMPLE",
                montant_marchandise=item["montant"],
                frais_livraison=item["frais"],
                frais_partenaire=0.0,
                observation="Colis de test prêt pour tournée de distribution",
                statut="EN_DEPOT",
                mode_paiement="ESPECES",
                actif=1,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
            )
            session.add(p)
            created_count += 1
            counts[axe_code] = counts.get(axe_code, 0) + 1

    session.commit()
    if created_count > 0:
        print(f"Successfully seeded {created_count} authentic EN_DEPOT parcels across real urban axes!")

if __name__ == "__main__":
    apply_real_axes_migration()
