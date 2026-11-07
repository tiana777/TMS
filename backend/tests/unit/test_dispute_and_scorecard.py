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
