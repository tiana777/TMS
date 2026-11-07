"""Unit tests for Sender / Expediteur typologies and contacts (CDC Sections 1, 2, 3, 9 & 12)."""

import pytest
from backend.app.domain.exceptions import BusinessRuleViolationException
from backend.app.domain.models.parcel import FluxType, Parcel
from backend.app.domain.models.vendor import SenderType, Vendor
from backend.app.domain.value_objects.axis import LogisticAxis
from backend.app.domain.value_objects.money import Money
from backend.app.domain.value_objects.phone_number import Operator, PhoneNumber


class TestSenderCategoriesAndContacts:
    def test_create_cybermarchand_vendor_with_contacts(self):
        vendor = Vendor(
            name="Madagascar Tech Shop",
            sender_type=SenderType.CYBERMARCHAND,
            phone=PhoneNumber("034 55 667 78"),
            contact_person="Rivo Rasoanaivo",
            address="Box 12, Pavillon Analakely",
            email="techshop@gmail.com",
            payment_terms="COMPTANT",
        )
        assert vendor.sender_type == SenderType.CYBERMARCHAND
        assert vendor.phone.operator == Operator.TELMA
        assert vendor.contact_person == "Rivo Rasoanaivo"
        assert vendor.address == "Box 12, Pavillon Analakely"

    def test_create_particulier_vendor_with_contacts(self):
        particulier = Vendor(
            name="Rasoamalala Hanta",
            sender_type=SenderType.PARTICULIER,
            phone=PhoneNumber("032 11 223 34"),
            address="Lot IVC 45 Ambohimanarina",
            email="hanta@moov.mg",
            payment_terms="COMPTANT",
        )
        assert particulier.sender_type == SenderType.PARTICULIER
        assert particulier.phone.operator == Operator.ORANGE

    def test_create_entreprise_vendor_with_nif_stat(self):
        b2b = Vendor(
            name="Cabinet Juridique & Audit Tanà",
            sender_type=SenderType.ENTREPRISE,
            phone=PhoneNumber("033 12 345 67"),
            contact_person="Maître Andry",
            address="Immeuble ARO, Antsakaviro",
            email="contact@audit-tana.mg",
            nif_stat="4001234567/2021",
            payment_terms="FACTURE_MENSUELLE",
        )
        assert b2b.sender_type == SenderType.ENTREPRISE
        assert b2b.phone.operator == Operator.AIRTEL
        assert b2b.nif_stat == "4001234567/2021"

    def test_invalid_sender_type_raises_exception(self):
        with pytest.raises(BusinessRuleViolationException, match="Type d'expéditeur invalide"):
            Vendor(
                name="Invalide",
                sender_type="ASSOCIATION_NON_HOMOLOGUEE",  # Invalid type
            )

    def test_parcel_with_sender_details(self):
        sender_phone = PhoneNumber("034 99 887 76")
        recipient_phone = PhoneNumber("032 00 112 23")

        parcel = Parcel(
            tracking_number="0001",
            reception_date="2026-11-08",
            vendor_id=1,
            sender_type=SenderType.ENTREPRISE,
            sender_name="BDO Audit Madagascar",
            sender_phone=sender_phone,
            sender_address="Ankorondrano, Tour Redland",
            recipient_name="Directeur Administratif",
            recipient_phone=recipient_phone,
            delivery_address="Analakely",
            axis=LogisticAxis.AXE_CENTRE,
            flux_type=FluxType.SIMPLE,
            merchandise_amount=Money(0),
            delivery_fee=Money(6000),
        )

        assert parcel.sender_type == SenderType.ENTREPRISE
        assert parcel.sender_name == "BDO Audit Madagascar"
        assert parcel.sender_phone.operator == Operator.TELMA
        assert parcel.total_to_collect.amount == 6000
