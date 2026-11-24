"""Unit tests for Priorité 9: Modification d'adresse et de tarif selon le statut.

Règles métier :
- Si le colis est encore « En dépôt » (EN_DEPOT) : autoriser la modification du lieu de livraison (les frais restent verrouillés).
- Si le colis est déjà « En cours de livraison » (EN_COURS) : autoriser la modification du lieu ET des frais de livraison (3k, 4k, 5k Ar ou personnalisé).
"""

import pytest
from unittest.mock import MagicMock
from backend.app.application.use_cases.parcel_use_cases import ParcelUseCases
from backend.app.domain.models.parcel import FluxType, Parcel
from backend.app.domain.value_objects.axis import LogisticAxis
from backend.app.domain.value_objects.money import Money
from backend.app.domain.value_objects.phone_number import PhoneNumber
from backend.app.domain.state_machine.parcel_fsm import ParcelStatus
from backend.app.domain.exceptions import BusinessRuleViolationException


class TestParcelAddressAndFeeUpdate:
    def _create_mock_parcel(self, status: ParcelStatus, fee: int = 3000, address: str = "Analakely"):
        parcel = Parcel(
            id=1,
            tracking_number="TRK-001",
            reception_date="2026-11-24",
            flux_type=FluxType.COD,
            status=status,
            recipient_name="Jean Rakoto",
            recipient_phone=PhoneNumber("0340000001"),
            delivery_address=address,
            axis=LogisticAxis.AXE_CENTRE_1,
            merchandise_amount=Money(20000),
            delivery_fee=Money(fee),
            vendor_id=1,
        )
        return parcel

    def test_en_depot_can_update_address(self):
        repo_mock = MagicMock()
        parcel = self._create_mock_parcel(ParcelStatus.EN_DEPOT, fee=3000, address="Analakely")
        repo_mock.get_by_id.return_value = parcel
        repo_mock.save.side_effect = lambda p: p

        uc = ParcelUseCases(MagicMock())
        uc.repo = repo_mock
        res = uc.update_parcel_contact(parcel_id=1, delivery_address="Ankorondrano")

        assert res.delivery_address == "Ankorondrano"
        assert parcel.delivery_fee.amount == 3000

    def test_en_depot_cannot_update_delivery_fee(self):
        repo_mock = MagicMock()
        parcel = self._create_mock_parcel(ParcelStatus.EN_DEPOT, fee=3000, address="Analakely")
        repo_mock.get_by_id.return_value = parcel

        uc = ParcelUseCases(MagicMock())
        uc.repo = repo_mock
        with pytest.raises(BusinessRuleViolationException) as exc:
            uc.update_parcel_contact(parcel_id=1, delivery_fee=4000)

        assert "verrouillés" in str(exc.value)

    def test_en_depot_same_fee_does_not_raise(self):
        repo_mock = MagicMock()
        parcel = self._create_mock_parcel(ParcelStatus.EN_DEPOT, fee=3000, address="Analakely")
        repo_mock.get_by_id.return_value = parcel
        repo_mock.save.side_effect = lambda p: p

        uc = ParcelUseCases(MagicMock())
        uc.repo = repo_mock
        # Passing same fee (3000) should be allowed without error
        res = uc.update_parcel_contact(parcel_id=1, delivery_fee=3000, delivery_address="Analakely Gare")
        assert res.delivery_address == "Analakely Gare"
        assert parcel.delivery_fee.amount == 3000

    def test_en_cours_can_update_address_and_fee(self):
        repo_mock = MagicMock()
        parcel = self._create_mock_parcel(ParcelStatus.EN_COURS, fee=3000, address="Analakely")
        repo_mock.get_by_id.return_value = parcel
        repo_mock.save.side_effect = lambda p: p

        uc = ParcelUseCases(MagicMock())
        uc.repo = repo_mock
        res = uc.update_parcel_contact(
            parcel_id=1,
            delivery_address="Itaosy Hopitaly",
            delivery_fee=4000
        )

        assert res.delivery_address == "Itaosy Hopitaly"
        assert parcel.delivery_fee.amount == 4000

    def test_cannot_update_delivered_or_returned_parcel(self):
        repo_mock = MagicMock()
        parcel = self._create_mock_parcel(ParcelStatus.LIVRE, fee=3000, address="Analakely")
        repo_mock.get_by_id.return_value = parcel

        uc = ParcelUseCases(MagicMock())
        uc.repo = repo_mock
        with pytest.raises(BusinessRuleViolationException) as exc:
            uc.update_parcel_contact(parcel_id=1, delivery_address="Autre part")

        assert "Impossible de modifier" in str(exc.value)
