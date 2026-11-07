"""Unit tests for Parcel Domain Entity."""

import pytest
from backend.app.domain.exceptions import (
    BusinessRuleViolationException,
    InvalidStateTransitionException,
    MissingRequiredDataException,
)
from backend.app.domain.models.parcel import FluxType, Parcel
from backend.app.domain.state_machine.parcel_fsm import ParcelStatus, PaymentMethod
from backend.app.domain.value_objects.axis import LogisticAxis
from backend.app.domain.value_objects.money import Money
from backend.app.domain.value_objects.phone_number import PhoneNumber


class TestParcelEntity:
    def _create_sample_parcel(self, flux: FluxType = FluxType.COD) -> Parcel:
        return Parcel(
            tracking_number="0001",
            reception_date="2026-11-07",
            vendor_id=1,
            recipient_name="Rasoa Nirina",
            recipient_phone=PhoneNumber("0341234567"),
            delivery_address="Itaosy Cité Seimad",
            axis=LogisticAxis.AXE_RN1,
            flux_type=flux,
            merchandise_amount=Money(45000),
            delivery_fee=Money(5000),
        )

    def test_total_to_collect_formula(self):
        parcel = self._create_sample_parcel(FluxType.COD)
        # Inviolable formula: Merchandise (45 000) + Delivery Fee (5 000) = 50 000 Ar
        assert parcel.total_to_collect == Money(50000)
        assert parcel.total_to_collect.formatted == "50 000 Ar"

    def test_course_simple_must_have_zero_merchandise(self):
        with pytest.raises(BusinessRuleViolationException) as exc:
            Parcel(
                tracking_number="0002",
                reception_date="2026-11-07",
                vendor_id=1,
                recipient_name="Rakoto Jean",
                recipient_phone=PhoneNumber("0321122334"),
                delivery_address="Analakely",
                axis=LogisticAxis.AXE_CENTRE,
                flux_type=FluxType.SIMPLE,
                merchandise_amount=Money(10000),  # Not allowed for Course Simple
                delivery_fee=Money(4000),
            )
        assert "valeur marchandise de 0 Ar" in str(exc.value)

    def test_successful_urban_delivery_lifecycle(self):
        parcel = self._create_sample_parcel()
        assert parcel.status == ParcelStatus.EN_DEPOT

        # 1. Assign to courier
        parcel.assign_to_courier(courier_id=5, tour_id=101)
        assert parcel.status == ParcelStatus.ASSIGNE
        assert parcel.courier_id == 5
        assert parcel.tour_id == 101

        # 2. Start delivery tour
        parcel.start_delivery()
        assert parcel.status == ParcelStatus.EN_COURS

        # 3. Deliver and collect cash
        parcel.mark_as_delivered(payment_method=PaymentMethod.ESPECES)
        assert parcel.status == ParcelStatus.LIVRE_ENCAISSE
        assert parcel.payment_method == PaymentMethod.ESPECES

        # 4. Cash closure in evening
        parcel.close_in_cash()
        assert parcel.status == ParcelStatus.CLOTURE_CAISSE

    def test_reschedule_and_reintegrate_lifecycle(self):
        parcel = self._create_sample_parcel()
        parcel.assign_to_courier(courier_id=3)
        parcel.start_delivery()

        # Customer requests reschedule
        parcel.reschedule(new_date="2026-11-08", reason="Client absent jusqu'à demain")
        assert parcel.status == ParcelStatus.REPORTE
        assert parcel.reschedule_date == "2026-11-08"

        # Reintegrate into Hub stock in evening
        parcel.reintegrate_to_hub()
        assert parcel.status == ParcelStatus.EN_DEPOT

    def test_cancellation_and_return_to_merchant(self):
        parcel = self._create_sample_parcel()
        parcel.assign_to_courier(courier_id=3)
        parcel.start_delivery()

        # Customer refuses parcel
        parcel.cancel_and_return(reason="Article non conforme")
        assert parcel.status == ParcelStatus.ANNULE_RETOUR

        # Handover back to vendor
        parcel.return_to_merchant()
        assert parcel.status == ParcelStatus.RETOUR_BOUTIQUE

    def test_province_outsource_lifecycle(self):
        parcel = Parcel(
            tracking_number="0003",
            reception_date="2026-11-07",
            vendor_id=2,
            recipient_name="Randria Paul",
            recipient_phone=PhoneNumber("0334455667"),
            delivery_address="Toamasina Bazar Be",
            axis=LogisticAxis.AXE_PROVINCE,
            flux_type=FluxType.PROVINCE,
            merchandise_amount=Money(80000),
            delivery_fee=Money(6000),
        )
        # Assign to shuttle driver
        parcel.assign_to_courier(courier_id=8)

        # Handover at bus station
        parcel.outsource_to_province(
            partner_name="Cotisse Transport",
            partner_reference="COT-9901",
            partner_fee=Money(15000),
        )
        assert parcel.status == ParcelStatus.SOUS_TRAITE
        assert parcel.partner_name == "Cotisse Transport"
        assert parcel.partner_fee == Money(15000)

        # Regional pickup confirmed
        parcel.confirm_province_pickup()
        assert parcel.status == ParcelStatus.LIVRE_ENCAISSE
