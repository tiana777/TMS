"""Unit tests for Courier Disputes/Debts and Scorecard Performance Engine."""

import pytest
from backend.app.domain.exceptions import BusinessRuleViolationException
from backend.app.domain.models.dispute import CourierDebt, DebtStatus, IncidentType
from backend.app.domain.services.scorecard_engine import (
    ScorecardEngine,
    ScorecardTier,
)
from backend.app.domain.value_objects.money import Money


class TestDisputeAndDebt:
    def test_courier_debt_creation_and_balance(self):
        debt = CourierDebt(
            reference_litige="LIT-2026-0001",
            livreur_id=4,
            incident_type=IncidentType.DEFICIT_COD,
            initial_amount=Money(60000),
            reason="Déficit de caisse de 60 000 Ar lors de la clôture",
            incident_date="2026-11-07",
        )
        assert debt.initial_amount == Money(60000)
        assert debt.refunded_amount == Money(0)
        assert debt.remaining_balance == Money(60000)
        assert debt.status == DebtStatus.OUVERTE

    def test_repayment_installments_until_cleared(self):
        debt = CourierDebt(
            reference_litige="LIT-2026-0002",
            livreur_id=4,
            incident_type=IncidentType.CASSE_MARCHANDISE,
            initial_amount=Money(100000),
            reason="Chute du deux-roues et flacons brisés",
            incident_date="2026-11-07",
        )
        # 1st installment
        debt.record_repayment(Money(40000))
        assert debt.refunded_amount == Money(40000)
        assert debt.remaining_balance == Money(60000)
        assert debt.status == DebtStatus.EN_COURS

        # 2nd installment
        debt.record_repayment(Money(60000))
        assert debt.refunded_amount == Money(100000)
        assert debt.remaining_balance == Money(0)
        assert debt.status == DebtStatus.SOLDEE
        assert debt.closure_date is not None

    def test_reject_overpayment(self):
        debt = CourierDebt(
            reference_litige="LIT-2026-0003",
            livreur_id=4,
            incident_type=IncidentType.FAUX_BILLET,
            initial_amount=Money(20000),
            reason="Billet de 20 000 Ar faux accepté par inattention",
            incident_date="2026-11-07",
        )
        with pytest.raises(BusinessRuleViolationException) as exc:
            debt.record_repayment(Money(25000))
        assert "dépasse le solde restant" in str(exc.value)

    def test_max_legal_deduction_labor_law_30_percent_cap(self):
        debt = CourierDebt(
            reference_litige="LIT-2026-0004",
            livreur_id=4,
            incident_type=IncidentType.DEFICIT_COD,
            initial_amount=Money(250000),
            reason="Déficit important de caisse",
            incident_date="2026-11-07",
        )
        # Livreur with net monthly salary of 400 000 Ar
        # 30% of 400 000 Ar = 120 000 Ar
        net_salary = Money(400000)
        deduction = debt.calculate_max_legal_deduction(net_salary)
        assert deduction == Money(120000)

        # When remaining debt is smaller than the 30% cap
        debt.record_repayment(Money(200000))
        # Remaining balance is now 50 000 Ar (< 120 000 Ar)
        deduction_small = debt.calculate_max_legal_deduction(net_salary)
        assert deduction_small == Money(50000)

    def test_force_majeure_armed_assault_cancellation(self):
        debt = CourierDebt(
            reference_litige="LIT-2026-0005",
            livreur_id=4,
            incident_type=IncidentType.PERTE_COLIS,
            initial_amount=Money(150000),
            reason="Colis arraché sous menace d'arme blanche",
            incident_date="2026-11-07",
        )
        debt.cancel_under_force_majeure(police_report_reference="PV-POLICE-TANA-2026-8812")
        assert debt.status == DebtStatus.ANNULEE_FORCE_MAJEURE
        assert debt.closure_date is not None

    def test_priority7_reject_fuel_expenses_as_disputes(self):
        """Règle Métier 7 : Les dépenses de carburant et frais de route ne sont pas des litiges."""
        with pytest.raises(BusinessRuleViolationException) as exc:
            CourierDebt.open_new(
                reference_litige="LIT-2026-0006",
                livreur_id=4,
                incident_type=IncidentType.CASSE_MARCHANDISE,
                initial_amount=Money(20000),
                reason="Plein carburant moto SP95",
                incident_date="2026-11-24",
            )
        assert "dépenses d'exploitation" in str(exc.value)

        # Même sous le type DEFICIT_COD, une dépense ne peut pas être saisie comme litige
        with pytest.raises(BusinessRuleViolationException):
            CourierDebt.open_new(
                reference_litige="LIT-2026-0007",
                livreur_id=4,
                incident_type=IncidentType.DEFICIT_COD,
                initial_amount=Money(10000),
                reason="Frais de route + péage",
                incident_date="2026-11-24",
            )

    def test_priority7_legacy_dispute_with_fuel_reason_still_loads(self):
        """Les litiges historiques déjà en base doivent rester rechargeables (pas de blocage à la lecture)."""
        debt = CourierDebt(
            reference_litige="LIT-2025-0001",
            livreur_id=4,
            incident_type=IncidentType.PERTE_COLIS,
            initial_amount=Money(20000),
            reason="Ancien litige carburant saisi avant la règle 7",
            incident_date="2025-10-01",
        )
        assert debt.remaining_balance == Money(20000)

    def test_priority7_tour_expenses_deduction_prevents_dispute(self):
        """Règle Métier 7 : Les dépenses justifiées réduisent la créance et évitent l'ouverture d'un litige."""
        from backend.app.domain.models.tour import Tour, TourStatus
        from backend.app.domain.models.parcel import Parcel, FluxType
        from backend.app.domain.state_machine.parcel_fsm import ParcelStatus
        from backend.app.domain.value_objects.axis import LogisticAxis
        from backend.app.domain.value_objects.phone_number import PhoneNumber

        tour = Tour(tour_date="2026-11-24", courier_id=1, status=TourStatus.EN_COURS)
        p1 = Parcel(
            tracking_number="0001",
            reception_date="2026-11-24",
            vendor_id=1,
            recipient_name="Client A",
            recipient_phone=PhoneNumber("0341234567"),
            delivery_address="Analakely",
            axis=LogisticAxis.AXE_CENTRE_1,
            flux_type=FluxType.COD,
            merchandise_amount=Money(70000),
            delivery_fee=Money(5000),
            status=ParcelStatus.LIVRE,
        )
        tour.parcels = [p1]
        theor = tour.calculate_theoretical_total()
        assert theor == Money(75000)

        # Le livreur remet 60 000 Ar en espèces et un reçu de carburant de 15 000 Ar
        discrepancy = tour.compute_cash_discrepancy(
            cash_and_mobile_remitted=Money(60000),
            expenses_amount=Money(15000),
            expenses_reason="Plein essence Station Shell Ankorondrano",
        )
        # Total justifié = 60 000 + 15 000 = 75 000 Ar -> Écart = 0 Ar, aucun litige !
        assert discrepancy == 0
        assert tour.actual_remitted == Money(60000)
        assert tour.expenses_amount == Money(15000)
        assert tour.expenses_reason == "Plein essence Station Shell Ankorondrano"

    def test_priority7_tour_net_deficit_only_becomes_dispute(self):
        """Règle Métier 7 : Seul le déficit résiduel non justifié fait l'objet d'un litige."""
        from backend.app.domain.models.tour import Tour, TourStatus
        from backend.app.domain.models.parcel import Parcel, FluxType
        from backend.app.domain.state_machine.parcel_fsm import ParcelStatus
        from backend.app.domain.value_objects.axis import LogisticAxis
        from backend.app.domain.value_objects.phone_number import PhoneNumber

        tour = Tour(tour_date="2026-11-24", courier_id=1, status=TourStatus.EN_COURS)
        p1 = Parcel(
            tracking_number="0002",
            reception_date="2026-11-24",
            vendor_id=1,
            recipient_name="Client B",
            recipient_phone=PhoneNumber("0341234567"),
            delivery_address="Itaosy",
            axis=LogisticAxis.AXE_RN1,
            flux_type=FluxType.COD,
            merchandise_amount=Money(95000),
            delivery_fee=Money(5000),
            status=ParcelStatus.LIVRE,
        )
        tour.parcels = [p1]
        assert tour.calculate_theoretical_total() == Money(100000)

        # Remis 70 000 Ar cash + 15 000 Ar carburant = 85 000 Ar justifiés sur 100 000 Ar dus
        discrepancy = tour.compute_cash_discrepancy(
            cash_and_mobile_remitted=Money(70000),
            expenses_amount=Money(15000),
            expenses_reason="Ticket carburant SP95",
        )
        # Écart net = 85 000 - 100 000 = -15 000 Ar (déficit réel de 15 000 Ar, et non pas 30 000 Ar)
        assert discrepancy == -15000


class TestScorecardEngine:
    def test_tier_or_calculation(self):
        # High performer: 100 assigned, 98 delivered, 95 on time, 0 disputes, 25/25 perfect cash days
        res = ScorecardEngine.calculate(
            livreur_id=1,
            period="2026-11",
            total_assigned=100,
            total_delivered=98,
            total_on_time=95,
            total_disputes=0,
            total_days_worked=25,
            total_days_perfect_cash=25,
        )
        # Success = 98%, Punctuality = 96.94%, Quality = 100%, Cash = 100%
        # Score = 0.50*98 + 0.20*96.94 + 0.15*100 + 0.15*100 = 49 + 19.39 + 15 + 15 = 98.39
        assert res.global_score >= 95.0
        assert res.tier == ScorecardTier.OR
        assert res.bonus_amount == Money(150000)

    def test_tier_argent_calculation(self):
        # 100 assigned, 88 delivered, 80 on time, 1 dispute, 24/25 perfect cash
        res = ScorecardEngine.calculate(
            livreur_id=2,
            period="2026-11",
            total_assigned=100,
            total_delivered=88,
            total_on_time=80,
            total_disputes=1,
            total_days_worked=25,
            total_days_perfect_cash=24,
        )
        assert 85.0 <= res.global_score < 95.0
        assert res.tier == ScorecardTier.ARGENT
        assert res.bonus_amount == Money(80000)

    def test_tier_alerte_underperformance(self):
        # Poor performer: 100 assigned, 60 delivered, 40 on time, 5 disputes, 15/25 perfect cash
        res = ScorecardEngine.calculate(
            livreur_id=3,
            period="2026-11",
            total_assigned=100,
            total_delivered=60,
            total_on_time=40,
            total_disputes=5,
            total_days_worked=25,
            total_days_perfect_cash=15,
        )
        assert res.global_score < 75.0
        assert res.tier == ScorecardTier.ALERTE
        assert res.bonus_amount == Money(0)
