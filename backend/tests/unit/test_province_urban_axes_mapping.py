"""Exhaustive tests for Province Gares Routières to 9 Real Urban Delivery Axes Mapping.

Verifies:
1. Exact mapping of all 9 official Gares Routières to the 9 Real Urban Axes:
   - Ambodivona       -> AXE_CENTRE_2
   - Ampasapito       -> AXE_AMBOHIMANGAKELY
   - Andranobevava    -> AXE_SABOTSY_NAMEHANA
   - Anosibe          -> AXE_AMPITATAFIKA
   - Ankadimbahoaka   -> AXE_IAVOLOHA
   - Behoririka       -> AXE_CENTRE_1
   - Andohatapenaka   -> AXE_ITAOSY
   - Anosizato        -> AXE_AMPITATAFIKA
   - Amoronakona      -> AXE_ALASORA

2. Automatic detection of gares and cooperatives in delivery addresses.
3. Creation and modification of PROVINCE parcels without generating any virtual AXE_PROVINCE_* axis.
4. Couriers are not locked to any axis and can be assigned to any tour.
5. Agents (RECEPTIONNISTE) and Supervisors can both assign couriers to any tour.
"""

import pytest
from datetime import date
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from backend.app.domain.value_objects.axis import LogisticAxis
from backend.app.domain.models.parcel import FluxType
from backend.app.domain.services.axis_detector import (
    GARE_ROUTIERE_TO_AXIS,
    get_axis_for_gare,
    AxisAutoDetector,
)
from backend.app.application.use_cases.parcel_use_cases import ParcelUseCases
from backend.app.application.use_cases.tour_use_cases import TourUseCases
from backend.app.application.dtos.parcel_dtos import CreateParcelDTO
from backend.app.infrastructure.persistence.models import (
    Base,
    AxisORM,
    CourierORM,
    ParcelORM,
    UserORM,
    VendorORM,
)


@pytest.fixture
def test_db():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)
    session = Session()

    # Seed the 9 real urban axes
    urban_axes = [
        ("AXE_CENTRE_1", "Axe Centre Ville 1 (Hyper-Centre & Analakely)"),
        ("AXE_CENTRE_2", "Axe Centre Ville 2 (Péri-Centre & Antanimena)"),
        ("AXE_ITAOSY", "Axe Itaosy (67Ha & Ouest)"),
        ("AXE_AMPITATAFIKA", "Axe Ampitatafika (Ampefiloha & Fenoarivo)"),
        ("AXE_AMBOHIMANGAKELY", "Axe Ambohimangakely (Besarety & RN2)"),
        ("AXE_SABOTSY_NAMEHANA", "Axe Sabotsy Namehana (Ankadikely & RN3)"),
        ("AXE_IVATO", "Axe Ivato (RN4 Digue & Aéroport)"),
        ("AXE_IAVOLOHA", "Axe Iavoloha (RN7 Sud & Tanjombato)"),
        ("AXE_ALASORA", "Axe Alasora (Mandroseza & By-pass)"),
    ]
    for code, lib in urban_axes:
        session.add(AxisORM(code=code, libelle=lib, type_axe="URBAIN", actif=1))

    # Seed an expéditeur
    session.add(VendorORM(id=1, nom="Boutique Test", telephone="0340000001", actif=1))

    # Seed a staff agent and supervisor
    session.add(UserORM(id=1, username="agent1", email="agent1@tmsexpress.mg", role="RECEPTIONNISTE", nom_complet="Aina", mot_de_passe_hash="x", actif=1))
    session.add(UserORM(id=2, username="super1", email="super1@tmsexpress.mg", role="SUPERVISEUR", nom_complet="Chef Quai", mot_de_passe_hash="x", actif=1))

    # Seed a courier with NO locked axis (assigned_axis=None)
    session.add(CourierORM(id=1, nom="Rakoto Jean", telephone="0341112233", type_vehicule="Moto 125cc", assigned_axis=None, actif=1))

    session.commit()
    yield session
    session.close()


def test_official_9_gares_to_axes_mapping():
    """Vérifie la table exacte des 9 gares routières vers les 9 axes urbains."""
    expected_mapping = {
        "Ambodivona": LogisticAxis.AXE_CENTRE_2,
        "Ampasapito": LogisticAxis.AXE_AMBOHIMANGAKELY,
        "Andranobevava": LogisticAxis.AXE_SABOTSY_NAMEHANA,
        "Anosibe": LogisticAxis.AXE_AMPITATAFIKA,
        "Ankadimbahoaka": LogisticAxis.AXE_IAVOLOHA,
        "Behoririka": LogisticAxis.AXE_CENTRE_1,
        "Andohatapenaka": LogisticAxis.AXE_ITAOSY,
        "Anosizato": LogisticAxis.AXE_AMPITATAFIKA,
        "Amoronakona": LogisticAxis.AXE_ALASORA,
    }

    for gare, expected_axis in expected_mapping.items():
        assert GARE_ROUTIERE_TO_AXIS[gare] == expected_axis, f"Erreur sur {gare}"
        assert get_axis_for_gare(gare) == expected_axis, f"Erreur get_axis_for_gare({gare})"


def test_address_detection_for_all_9_gares():
    """Vérifie que la détection automatique associe l'adresse au bon axe urbain réel."""
    test_cases = [
        ("Gare Ambodivona, Cotisse pour Tamatave", LogisticAxis.AXE_CENTRE_2),
        ("Gare Ampasapito, coopérative Est", LogisticAxis.AXE_AMBOHIMANGAKELY),
        ("Gare Andranobevava, départ Anjozorobe", LogisticAxis.AXE_SABOTSY_NAMEHANA),
        ("Gare Anosibe, coopérative Sud-Ouest", LogisticAxis.AXE_AMPITATAFIKA),
        ("Gare Ankadimbahoaka, Fasan'ny Karana vers Antsirabe", LogisticAxis.AXE_IAVOLOHA),
        ("Gare Behoririka, départ taxi-brousse", LogisticAxis.AXE_CENTRE_1),
        ("Gare Andohatapenaka (Maki), Besady Plus pour Majunga", LogisticAxis.AXE_ITAOSY),
        ("Gare Anosizato, transport RN1", LogisticAxis.AXE_AMPITATAFIKA),
        ("Gare Amoronakona, départ By-pass", LogisticAxis.AXE_ALASORA),
    ]

    for addr, expected_axis in test_cases:
        res = AxisAutoDetector.detect(addr)
        assert res.axis == expected_axis, f"Échec détection pour '{addr}' -> attendu {expected_axis}, reçu {res.axis}"
        assert not res.is_fallback


def test_create_province_parcel_uses_urban_axis_and_creates_no_virtual_axis(test_db):
    """Vérifie qu'un colis PROVINCE créé avec une gare n'ajoute aucun axe fictif AXE_PROVINCE en base."""
    use_cases = ParcelUseCases(test_db)

    # Création colis Province via Gare Ambodivona
    dto = CreateParcelDTO(
        tracking_number="BDR-PR01",
        sender_id=1,
        sender_phone="0340000001",
        recipient_name="Client Tamatave",
        recipient_phone="0340000002",
        delivery_address="Gare Ambodivona, Cotisse VIP Tamatave",
        axis="Ambodivona",  # Nom de la gare transmis
        flux_type="PROVINCE",
        merchandise_amount=50000.0,
        delivery_fee=3000.0,
    )

    created = use_cases.create_parcel(dto, user_id=1, user_nom="Aina")

    # L'axe retourné doit être AXE_CENTRE_2
    assert created.axis == "AXE_CENTRE_2"
    assert created.flux_type == "PROVINCE"

    # Vérification stricte en base : AUCUN axe virtuel créé
    all_axes = test_db.query(AxisORM).all()
    assert len(all_axes) == 9, "Des axes virtuels ont été créés indûment !"
    for ax in all_axes:
        assert not ax.code.startswith("AXE_PROV"), f"Axe virtuel détecté : {ax.code}"


def test_override_axis_with_gare_name(test_db):
    """Vérifie que la modification manuelle d'axe accepte un nom de gare et mappe vers l'axe urbain."""
    use_cases = ParcelUseCases(test_db)

    dto = CreateParcelDTO(
        tracking_number="BDR-PR02",
        sender_id=1,
        sender_phone="0340000001",
        recipient_name="Client Majunga",
        recipient_phone="0340000003",
        delivery_address="Antananarivo",
        axis="AXE_CENTRE_1",
        flux_type="PROVINCE",
        merchandise_amount=0.0,
        delivery_fee=3000.0,
    )
    created = use_cases.create_parcel(dto, user_id=1, user_nom="Aina")
    assert created.axis == "AXE_CENTRE_1"

    # Modification vers la Gare Andohatapenaka
    updated = use_cases.override_parcel_axis(
        created.id,
        new_axis="Andohatapenaka",
        user_id=1,
        user_nom="Aina",
        user_role="RECEPTIONNISTE",
    )

    assert updated.axis == "AXE_ITAOSY"
    all_axes = test_db.query(AxisORM).all()
    assert len(all_axes) == 9


def test_courier_not_locked_to_axis_and_can_be_assigned_by_receptionniste(test_db):
    """Vérifie qu'un livreur sans axe par défaut peut être affecté à une tournée par un RECEPTIONNISTE."""
    parcel_uc = ParcelUseCases(test_db)
    tour_uc = TourUseCases(test_db)

    # 1. Créer un colis rattaché à AXE_CENTRE_2
    dto = CreateParcelDTO(
        tracking_number="BDR-TO01",
        sender_id=1,
        sender_phone="0340000001",
        recipient_name="Client Gare",
        recipient_phone="0340000004",
        delivery_address="Ambodivona",
        axis="AXE_CENTRE_2",
        flux_type="PROVINCE",
        merchandise_amount=0.0,
        delivery_fee=3000.0,
    )
    p = parcel_uc.create_parcel(dto, user_id=1, user_nom="Aina")

    # 2. Le livreur n'a pas d'axe fixé
    courier = test_db.query(CourierORM).filter(CourierORM.id == 1).first()
    assert courier.assigned_axis is None

    # 3. L'agent RECEPTIONNISTE crée la tournée et lui affecte le colis
    tour = tour_uc.create_or_assign_tour(
        courier_id=1,
        tour_date=date.today().strftime("%Y-%m-%d"),
        parcel_ids=[p.id],
        user_role="RECEPTIONNISTE",
    )

    assert tour.courier_id == 1
    assert tour.status in ["ASSIGNE", "EN_COURS"]

    # Vérifier que le colis est bien rattaché dans le détail de la tournée
    tour_detail = tour_uc.get_tour_detail(tour.id)
    assert p.id in [item.id for item in tour_detail.parcels]


def test_create_dynamic_gare_and_association_to_axis(test_db):
    """Vérifie l'enregistrement dynamique d'une nouvelle gare par un réceptionniste et son association à un axe."""
    from backend.app.interfaces.rest.master_data_router import create_or_update_zone, CreateZoneInputDTO
    from backend.app.infrastructure.persistence.models import ZoneORM

    user = test_db.query(UserORM).filter(UserORM.role == "RECEPTIONNISTE").first()

    dto = CreateZoneInputDTO(
        nom="Coopérative MadaExpress Talatamaty",
        axe_code="AXE_IVATO",
        type="cooperative",
        tarif_livraison=4000,
        destinations="Majunga, Ambanja",
    )
    res = create_or_update_zone(data=dto, db=test_db, current_user=user)
    assert res.nom == "Coopérative MadaExpress Talatamaty"
    assert res.axe_code == "AXE_IVATO"
    assert res.type == "cooperative"

    # Vérification en base
    z = test_db.query(ZoneORM).filter(ZoneORM.nom == "Coopérative MadaExpress Talatamaty").first()
    assert z is not None
    assert z.axe.code == "AXE_IVATO"
    assert z.type == "cooperative"
