"""Unit tests for Courier Capacity and Urban vs Province limit rules."""

import pytest
from backend.app.domain.exceptions import BusinessRuleViolationException
from backend.app.domain.models.courier import Courier
from backend.app.domain.models.parcel import FluxType, Parcel
from backend.app.domain.value_objects.axis import LogisticAxis
from backend.app.domain.value_objects.money import Money
from backend.app.domain.value_objects.phone_number import PhoneNumber


class TestCourierCapacityRules:
    def test_courier_max_parcels_limit(self):
        c = Courier(name="Test Livreur", phone=PhoneNumber("0341234567"), vehicle_type="Moto", max_parcels=30)
        assert c.max_parcels == 30

        with pytest.raises(BusinessRuleViolationException):
            c.set_max_parcels(31)

    def test_parcel_creation_optional_recipient_name(self):
        # Recipient name can be omitted and defaults to 'Client'
        p = Parcel(
            tracking_number="BDR-TEST-01",
            reception_date="2026-11-12",
            vendor_id=1,
            recipient_name="",  # Empty
            recipient_phone=PhoneNumber("0351234567"),
            delivery_address="Ampandrana",
            axis=LogisticAxis.AXE_CENTRE,
            flux_type=FluxType.COD,
            merchandise_amount=Money(20000),
            delivery_fee=Money(3000),
        )
        assert p.recipient_name == "Client"
        assert p.recipient_phone.operator.value == "TELMA"
