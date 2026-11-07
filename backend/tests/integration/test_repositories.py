"""Integration tests for PostgreSQL Repositories."""

import pytest
from backend.app.domain.models.courier import Courier
from backend.app.domain.models.dispute import CourierDebt, IncidentType
from backend.app.domain.models.parcel import FluxType, Parcel
from backend.app.domain.models.tour import Tour, TourStatus
from backend.app.domain.models.vendor import Vendor
from backend.app.domain.state_machine.parcel_fsm import ParcelStatus
from backend.app.domain.value_objects.axis import LogisticAxis
from backend.app.domain.value_objects.money import Money
from backend.app.domain.value_objects.phone_number import PhoneNumber
from backend.app.infrastructure.database.connection import SessionLocal
from backend.app.infrastructure.persistence.repositories import (
    PostgresCourierRepository,
    PostgresDisputeRepository,
    PostgresParcelRepository,
    PostgresTourRepository,
    PostgresVendorRepository,
)


@pytest.fixture
def db_session():
    session = SessionLocal()
    yield session
    session.close()


class TestPostgresRepositories:
    def test_vendor_repository(self, db_session):
        import uuid
        repo = PostgresVendorRepository(db_session)
        unique_name = f"Test Cyber Boutique {uuid.uuid4().hex[:6]}"
        vendor = Vendor(
            name=unique_name,
            phone=PhoneNumber("0349988776"),
            contact_person="Mme Rasoa",
            payment_terms="COMPTANT",
        )
        saved = repo.save(vendor)
        assert saved.id is not None
        assert saved.name == unique_name

        fetched = repo.get_by_id(saved.id)
        assert fetched is not None
        assert fetched.name == saved.name

        fetched_by_name = repo.get_by_name(unique_name)
        assert fetched_by_name is not None
        assert fetched_by_name.id == saved.id

    def test_courier_repository(self, db_session):
        repo = PostgresCourierRepository(db_session)
        courier = Courier(
            name="Livreur Test Integration",
            phone=PhoneNumber("0325544332"),
            vehicle_type="Scooter 125cc",
            security_deposit=Money(150000),
        )
        saved = repo.save(courier)
        assert saved.id is not None
        assert saved.name == "Livreur Test Integration"
        assert saved.security_deposit == Money(150000)

        fetched = repo.get_by_id(saved.id)
        assert fetched is not None
        assert fetched.phone.raw_digits == "0325544332"

    def test_parcel_repository_lifecycle_and_bdr(self, db_session):
        repo = PostgresParcelRepository(db_session)
        vendor_repo = PostgresVendorRepository(db_session)
        vendors = vendor_repo.list_all()
        assert len(vendors) > 0
        v_id = vendors[0].id

        # 1. BDR sequence generation
        bdr = repo.generate_next_bdr()
        assert len(bdr) == 4
        assert bdr.isdigit()

        # 2. Save parcel
        parcel = Parcel(
            tracking_number=f"TEST-{bdr}",
            reception_date="2026-11-07",
            vendor_id=v_id,
            recipient_name="Andry Nirina",
            recipient_phone=PhoneNumber("0331122334"),
            delivery_address="Itaosy Cité Seimad",
            axis=LogisticAxis.AXE_RN1,
            flux_type=FluxType.COD,
            merchandise_amount=Money(60000),
            delivery_fee=Money(5000),
        )
        saved = repo.save(parcel)
        assert saved.id is not None
        assert saved.total_to_collect == Money(65000)
        assert saved.status == ParcelStatus.EN_DEPOT

        # 3. Fetch by ID and by tracking number
        fetched = repo.get_by_id(saved.id)
        assert fetched is not None
        assert fetched.tracking_number == saved.tracking_number
        assert fetched.recipient_phone.formatted == "033 11 223 34"

        fetched_by_tracking = repo.get_by_tracking_number(saved.tracking_number)
        assert fetched_by_tracking is not None
        assert fetched_by_tracking.id == saved.id

        # 4. Filter queries
        parcels_rn1 = repo.list_by_axis(LogisticAxis.AXE_RN1)
        assert any(p.id == saved.id for p in parcels_rn1)

        parcels_date = repo.list_by_date("2026-11-07")
        assert any(p.id == saved.id for p in parcels_date)

    def test_tour_repository(self, db_session):
        repo = PostgresTourRepository(db_session)
        courier_repo = PostgresCourierRepository(db_session)
        couriers = courier_repo.list_all()
        assert len(couriers) > 0
        c_id = couriers[0].id

        tour = Tour(
            tour_date="2026-11-07",
            courier_id=c_id,
            status=TourStatus.ASSIGNE,
            theoretical_total=Money(120000),
            actual_remitted=Money(120000),
        )
        saved = repo.save(tour)
        assert saved.id is not None
        assert saved.status == TourStatus.ASSIGNE

        fetched = repo.get_by_id(saved.id)
        assert fetched is not None
        assert fetched.courier_id == c_id

    def test_dispute_repository(self, db_session):
        repo = PostgresDisputeRepository(db_session)
        courier_repo = PostgresCourierRepository(db_session)
        couriers = courier_repo.list_all()
        c_id = couriers[0].id

        ref = repo.generate_next_litige_ref()
        assert ref.startswith("LIT-2026-")

        debt = CourierDebt(
            reference_litige=ref,
            livreur_id=c_id,
            incident_type=IncidentType.DEFICIT_COD,
            initial_amount=Money(40000),
            reason="Écart de caisse de 40 000 Ar au retour de tournée",
            incident_date="2026-11-07",
        )
        saved = repo.save(debt)
        assert saved.id is not None
        assert saved.reference_litige == ref

        fetched = repo.get_by_reference(ref)
        assert fetched is not None
        assert fetched.initial_amount == Money(40000)
