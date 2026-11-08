"""Unit tests for Parcel Finite State Machine (FSM)."""

import pytest
from backend.app.domain.exceptions import (
    InvalidStateTransitionException,
    MissingRequiredDataException,
)
from backend.app.domain.state_machine.parcel_fsm import (
    ParcelStateMachine,
    ParcelStatus,
    PaymentMethod,
    TransitionContext,
)


class TestParcelStateMachine:
    def test_initial_creation_to_en_depot(self):
        assert ParcelStateMachine.can_transition(None, ParcelStatus.EN_DEPOT)
        ParcelStateMachine.validate_transition(None, ParcelStatus.EN_DEPOT)

    def test_assign_to_courier_requires_courier_id(self):
        # Missing courier_id
        with pytest.raises(MissingRequiredDataException) as exc:
            ParcelStateMachine.validate_transition(ParcelStatus.EN_DEPOT, ParcelStatus.ASSIGNE)
        assert "identifiant du coursier" in str(exc.value)

        # With courier_id
        ctx = TransitionContext(courier_id=12)
        ParcelStateMachine.validate_transition(ParcelStatus.EN_DEPOT, ParcelStatus.ASSIGNE, ctx)

    def test_start_delivery_tour(self):
        assert ParcelStateMachine.can_transition(ParcelStatus.ASSIGNE, ParcelStatus.EN_COURS)
        ParcelStateMachine.validate_transition(ParcelStatus.ASSIGNE, ParcelStatus.EN_COURS)

    def test_delivery_requires_payment_method(self):
        # Missing payment method
        with pytest.raises(MissingRequiredDataException) as exc:
            ParcelStateMachine.validate_transition(ParcelStatus.EN_COURS, ParcelStatus.LIVRE_ENCAISSE)
        assert "mode de paiement" in str(exc.value)

        # With payment method
        ctx = TransitionContext(payment_method=PaymentMethod.MVOLA)
        ParcelStateMachine.validate_transition(ParcelStatus.EN_COURS, ParcelStatus.LIVRE_ENCAISSE, ctx)

    def test_separated_livre_and_encaisse_transitions(self):
        # 1. EN_COURS -> LIVRE: physical delivery does not require payment method
        assert ParcelStateMachine.can_transition(ParcelStatus.EN_COURS, ParcelStatus.LIVRE)
        ParcelStateMachine.validate_transition(ParcelStatus.EN_COURS, ParcelStatus.LIVRE)

        # 2. LIVRE -> ENCAISSE: cash collection requires payment method
        assert ParcelStateMachine.can_transition(ParcelStatus.LIVRE, ParcelStatus.ENCAISSE)
        with pytest.raises(MissingRequiredDataException) as exc:
            ParcelStateMachine.validate_transition(ParcelStatus.LIVRE, ParcelStatus.ENCAISSE)
        assert "mode de paiement" in str(exc.value)

        # With payment method
        ctx = TransitionContext(payment_method=PaymentMethod.ESPECES)
        ParcelStateMachine.validate_transition(ParcelStatus.LIVRE, ParcelStatus.ENCAISSE, ctx)

        # 3. EN_COURS -> ENCAISSE directly (delivery and payment in one step)
        assert ParcelStateMachine.can_transition(ParcelStatus.EN_COURS, ParcelStatus.ENCAISSE)
        ctx_mvola = TransitionContext(payment_method=PaymentMethod.MVOLA)
        ParcelStateMachine.validate_transition(ParcelStatus.EN_COURS, ParcelStatus.ENCAISSE, ctx_mvola)

        # 4. ENCAISSE -> CLOTURE_CAISSE
        assert ParcelStateMachine.can_transition(ParcelStatus.ENCAISSE, ParcelStatus.CLOTURE_CAISSE)
        ParcelStateMachine.validate_transition(ParcelStatus.ENCAISSE, ParcelStatus.CLOTURE_CAISSE)

        # 5. LIVRE -> CLOTURE_CAISSE (e.g. port payé / no cash to collect)
        assert ParcelStateMachine.can_transition(ParcelStatus.LIVRE, ParcelStatus.CLOTURE_CAISSE)
        ParcelStateMachine.validate_transition(ParcelStatus.LIVRE, ParcelStatus.CLOTURE_CAISSE)

    def test_reschedule_requires_iso_date_and_reason(self):
        # Missing date
        with pytest.raises(MissingRequiredDataException) as exc:
            ParcelStateMachine.validate_transition(
                ParcelStatus.EN_COURS,
                ParcelStatus.REPORTE,
                TransitionContext(incident_reason="Client indisponible"),
            )
        assert "date de reprogrammation" in str(exc.value)

        # Invalid date format
        with pytest.raises(MissingRequiredDataException):
            ParcelStateMachine.validate_transition(
                ParcelStatus.EN_COURS,
                ParcelStatus.REPORTE,
                TransitionContext(reschedule_date="08/11/2026", incident_reason="Client absent"),
            )

        # Missing reason
        with pytest.raises(MissingRequiredDataException) as exc:
            ParcelStateMachine.validate_transition(
                ParcelStatus.EN_COURS,
                ParcelStatus.REPORTE,
                TransitionContext(reschedule_date="2026-11-08"),
            )
        assert "motif circonstancié" in str(exc.value)

        # Valid reschedule
        ctx = TransitionContext(reschedule_date="2026-11-08", incident_reason="Client injoignable par téléphone")
        ParcelStateMachine.validate_transition(ParcelStatus.EN_COURS, ParcelStatus.REPORTE, ctx)

    def test_cancellation_requires_reason(self):
        with pytest.raises(MissingRequiredDataException) as exc:
            ParcelStateMachine.validate_transition(ParcelStatus.EN_COURS, ParcelStatus.ANNULE_RETOUR)
        assert "motif circonstancié" in str(exc.value)

        ctx = TransitionContext(incident_reason="Produit non conforme à la commande")
        ParcelStateMachine.validate_transition(ParcelStatus.EN_COURS, ParcelStatus.ANNULE_RETOUR, ctx)

    def test_outsource_to_province_requires_partner_details(self):
        # Missing all
        with pytest.raises(MissingRequiredDataException) as exc:
            ParcelStateMachine.validate_transition(ParcelStatus.ASSIGNE, ParcelStatus.SOUS_TRAITE)
        assert "coopérative" in str(exc.value)

        # Missing reference
        with pytest.raises(MissingRequiredDataException) as exc:
            ParcelStateMachine.validate_transition(
                ParcelStatus.ASSIGNE,
                ParcelStatus.SOUS_TRAITE,
                TransitionContext(partner_name="Cotisse"),
            )
        assert "récépissé" in str(exc.value)

        # Valid province handover
        ctx = TransitionContext(
            partner_name="Cotisse Transport",
            partner_reference="COT-7842",
            partner_fee=12000,
        )
        ParcelStateMachine.validate_transition(ParcelStatus.ASSIGNE, ParcelStatus.SOUS_TRAITE, ctx)

    def test_reassignment_transitions(self):
        # 1. Reassign before tour start: ASSIGNE -> ASSIGNE
        assert ParcelStateMachine.can_transition(ParcelStatus.ASSIGNE, ParcelStatus.ASSIGNE)
        ctx = TransitionContext(courier_id=5)
        ParcelStateMachine.validate_transition(ParcelStatus.ASSIGNE, ParcelStatus.ASSIGNE, ctx)

        # 2. Urgent reassignment during tour: EN_COURS -> ASSIGNE (Super Admin power)
        assert ParcelStateMachine.can_transition(ParcelStatus.EN_COURS, ParcelStatus.ASSIGNE)
        ctx_urgent = TransitionContext(courier_id=7, incident_reason="Panne de moto du livreur initial")
        ParcelStateMachine.validate_transition(ParcelStatus.EN_COURS, ParcelStatus.ASSIGNE, ctx_urgent)

    def test_illegal_transitions_rejected(self):
        illegal_cases = [
            (ParcelStatus.EN_DEPOT, ParcelStatus.LIVRE_ENCAISSE),  # Cannot deliver directly from stock
            (ParcelStatus.EN_DEPOT, ParcelStatus.EN_COURS),        # Must be assigned first
            (ParcelStatus.LIVRE_ENCAISSE, ParcelStatus.EN_COURS),  # Already delivered
            (ParcelStatus.CLOTURE_CAISSE, ParcelStatus.EN_DEPOT),  # Closed is terminal
            (ParcelStatus.RETOUR_BOUTIQUE, ParcelStatus.ASSIGNE),  # Returned to merchant is terminal
        ]
        for from_s, to_s in illegal_cases:
            assert not ParcelStateMachine.can_transition(from_s, to_s)
            with pytest.raises(InvalidStateTransitionException):
                ParcelStateMachine.validate_transition(from_s, to_s)
