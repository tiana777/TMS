"""Unit tests for Priorité 6: Déduction des frais de livraison prépayés au vendeur."""

from unittest.mock import MagicMock
from backend.app.application.dtos.parcel_dtos import MarkPrepaidDTO
from backend.app.application.dtos.payout_dtos import CreatePayoutDTO
from backend.app.application.use_cases.parcel_use_cases import ParcelUseCases
from backend.app.application.use_cases.payout_use_cases import PayoutUseCases
from backend.app.domain.models.parcel import FluxType, Parcel, PaymentMethod
from backend.app.domain.models.tour import Tour
from backend.app.domain.state_machine.parcel_fsm import ParcelStatus
from backend.app.domain.value_objects.axis import LogisticAxis
from backend.app.domain.value_objects.money import Money
from backend.app.domain.value_objects.phone_number import PhoneNumber


def _make_parcel(
    *,
    parcel_id: int = 1,
    merchandise: int = 50000,
    fee: int = 3000,
    status: ParcelStatus = ParcelStatus.EN_DEPOT,
    frais_prepayes_vendeur: bool = False,
) -> Parcel:
    return Parcel(
        id=parcel_id,
        tracking_number=f"TRK-{parcel_id:03d}",
        reception_date="2026-11-26",
        flux_type=FluxType.COD,
        status=status,
        recipient_name="Client Test",
        recipient_phone=PhoneNumber("0340000001"),
        delivery_address="Analakely",
        axis=LogisticAxis.AXE_CENTRE_1,
        merchandise_amount=Money(merchandise),
        delivery_fee=Money(fee),
        vendor_id=10,
        frais_prepayes_vendeur=frais_prepayes_vendeur,
    )


class TestFraisPrepayesVendeur:
    def test_total_to_collect_excludes_fee_when_prepaid_to_vendor(self):
        standard = _make_parcel(merchandise=50000, fee=3000, frais_prepayes_vendeur=False)
        prepaid_fee = _make_parcel(merchandise=50000, fee=3000, frais_prepayes_vendeur=True)

        assert standard.total_to_collect.amount == 53000
        assert prepaid_fee.total_to_collect.amount == 50000

    def test_mark_as_prepaid_delivery_fee_only_sets_flag_and_keeps_merchandise(self):
        parcel = _make_parcel(merchandise=45000, fee=4000, status=ParcelStatus.EN_COURS)
        parcel.mark_as_prepaid("DELIVERY_FEE_ONLY", PaymentMethod.MVOLA, "MV-123")

        assert parcel.frais_prepayes_vendeur is True
        assert parcel.merchandise_amount.amount == 45000
        assert parcel.delivery_fee.amount == 4000
        assert parcel.total_to_collect.amount == 45000
        assert "Frais de livraison (4000 Ar) payés d'avance au vendeur" in (parcel.observation or "")

    def test_tour_theoretical_total_excludes_prepaid_vendor_fees(self):
        p1 = _make_parcel(parcel_id=1, merchandise=50000, fee=3000, status=ParcelStatus.LIVRE_ENCAISSE, frais_prepayes_vendeur=True)
        p2 = _make_parcel(parcel_id=2, merchandise=20000, fee=3000, status=ParcelStatus.LIVRE_ENCAISSE, frais_prepayes_vendeur=False)

        tour = Tour(tour_date="2026-11-26", courier_id=1, parcels=[p1, p2])
        theor = tour.calculate_theoretical_total()

        # p1: 50000 (frais déjà payés au vendeur) + p2: 23000 = 73000
        assert theor.amount == 73000

    def test_update_parcel_contact_can_toggle_frais_prepayes_vendeur(self):
        repo_mock = MagicMock()
        parcel = _make_parcel(merchandise=30000, fee=3000, status=ParcelStatus.EN_DEPOT, frais_prepayes_vendeur=False)
        repo_mock.get_by_id.return_value = parcel
        repo_mock.save.side_effect = lambda p: p

        uc = ParcelUseCases(MagicMock())
        uc.repo = repo_mock

        res = uc.update_parcel_contact(parcel_id=1, frais_prepayes_vendeur=True)
        assert res.frais_prepayes_vendeur is True
        assert res.total_to_collect == 30000

    def test_mark_as_prepaid_use_case_delivery_fee_only(self):
        repo_mock = MagicMock()
        parcel = _make_parcel(merchandise=60000, fee=5000, status=ParcelStatus.EN_COURS)
        repo_mock.get_by_id.return_value = parcel
        repo_mock.save.side_effect = lambda p: p

        uc = ParcelUseCases(MagicMock())
        uc.repo = repo_mock

        res = uc.mark_as_prepaid(
            parcel_id=1,
            dto=MarkPrepaidDTO(prepaid_type="DELIVERY_FEE_ONLY", payment_method="MVOLA"),
        )
        assert res.frais_prepayes_vendeur is True
        assert res.total_to_collect == 60000

    def test_payout_deducts_prepaid_delivery_fees_from_vendor_remittance(self):
        """When frais_prepayes_vendeur=True, courier collected only merchandise (50k),
        and payout still deducts delivery_fee (3k) -> vendor receives 47k net."""
        p_orm = MagicMock()
        p_orm.id = 1
        p_orm.vendeur_id = 10
        p_orm.numero_bordereau = "TRK-001"
        p_orm.client_nom = "Client Test"
        p_orm.montant_marchandise = 50000.0
        p_orm.frais_livraison = 3000.0
        p_orm.statut = "CLOTURE_CAISSE"
        p_orm.statut_reversement = "NON_REVERSE"
        p_orm.date_reception = "2026-11-26"
        p_orm.frais_prepayes_vendeur = True

        vendor_orm = MagicMock()
        vendor_orm.id = 10
        vendor_orm.nom = "Boutique Test"
        vendor_orm.type_expediteur = "CYBERMARCHAND"
        vendor_orm.telephone = "0340000000"
        vendor_orm.adresse = "Analakely"

        session = MagicMock()
        parcel_query = MagicMock()
        parcel_query.filter.return_value = parcel_query
        parcel_query.all.return_value = [p_orm]
        vendor_query = MagicMock()
        vendor_query.filter.return_value = vendor_query
        vendor_query.all.return_value = [vendor_orm]

        def query_side_effect(model):
            name = getattr(model, "__name__", "")
            if "ParcelORM" in name:
                return parcel_query
            return vendor_query

        session.query.side_effect = query_side_effect

        uc = PayoutUseCases(session)
        pending = uc.get_pending_payouts(vendor_id=10)

        assert len(pending) == 1
        assert pending[0].total_merchandise == 50000
        assert pending[0].total_delivery_fees == 3000
        assert pending[0].net_payable == 47000
        assert pending[0].eligible_parcels[0].frais_prepayes_vendeur is True
