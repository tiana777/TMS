"""Domain Service: Courier Scorecard & Performance Engine according to CDC section 10."""

from dataclasses import dataclass
from enum import Enum
from backend.app.domain.value_objects.money import Money


class ScorecardTier(str, Enum):
    OR = "OR"
    ARGENT = "ARGENT"
    BRONZE = "BRONZE"
    ALERTE = "ALERTE"


@dataclass(frozen=True)
class ScorecardResult:
    livreur_id: int
    period: str  # YYYY-MM
    total_assigned: int
    total_delivered: int
    success_rate: float
    punctuality_rate: float
    quality_rate: float
    cash_rigor_rate: float
    global_score: float
    tier: ScorecardTier
    bonus_amount: Money


class ScorecardEngine:
    """Computes monthly performance evaluation of a courier according to CDC section 10."""

    BONUS_OR = Money(150_000)
    BONUS_ARGENT = Money(80_000)
    BONUS_ZERO = Money.zero()

    @classmethod
    def calculate(
        cls,
        livreur_id: int,
        period: str,
        total_assigned: int,
        total_delivered: int,
        total_on_time: int,
        total_disputes: int,
        total_days_worked: int,
        total_days_perfect_cash: int,
    ) -> ScorecardResult:
        # 1. Success rate
        if total_assigned <= 0:
            success_rate = 0.0
        else:
            success_rate = min(100.0, (total_delivered / total_assigned) * 100.0)

        # 2. Punctuality rate
        if total_delivered <= 0:
            punctuality_rate = 0.0
        else:
            punctuality_rate = min(100.0, (total_on_time / total_delivered) * 100.0)

        # 3. Quality rate (Zero litigation)
        if total_assigned <= 0:
            quality_rate = 100.0
        else:
            loss_ratio = (total_disputes / total_assigned) * 100.0
            quality_rate = max(0.0, min(100.0, 100.0 - loss_ratio))

        # 4. Cash rigor rate
        if total_days_worked <= 0:
            cash_rigor_rate = 100.0
        else:
            cash_rigor_rate = min(100.0, (total_days_perfect_cash / total_days_worked) * 100.0)

        # 5. Global Score (CDC section 10.2):
        # Score = 0.50*Succes + 0.20*Ponctualite + 0.15*Qualite + 0.15*Caisse
        global_score = round(
            (0.50 * success_rate)
            + (0.20 * punctuality_rate)
            + (0.15 * quality_rate)
            + (0.15 * cash_rigor_rate),
            2,
        )

        # 6. Incentive Tier & Bonus (CDC section 10.3)
        if global_score >= 95.0:
            tier = ScorecardTier.OR
            bonus = cls.BONUS_OR
        elif global_score >= 85.0:
            tier = ScorecardTier.ARGENT
            bonus = cls.BONUS_ARGENT
        elif global_score >= 75.0:
            tier = ScorecardTier.BRONZE
            bonus = cls.BONUS_ZERO
        else:
            tier = ScorecardTier.ALERTE
            bonus = cls.BONUS_ZERO

        return ScorecardResult(
            livreur_id=livreur_id,
            period=period,
            total_assigned=total_assigned,
            total_delivered=total_delivered,
            success_rate=round(success_rate, 2),
            punctuality_rate=round(punctuality_rate, 2),
            quality_rate=round(quality_rate, 2),
            cash_rigor_rate=round(cash_rigor_rate, 2),
            global_score=global_score,
            tier=tier,
            bonus_amount=bonus,
        )
