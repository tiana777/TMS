"""Domain Entity: Courier Debt & Dispute (Dette Livreur & Litige) according to CDC section 11 & 12."""

from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Optional
from backend.app.domain.exceptions import BusinessRuleViolationException
from backend.app.domain.value_objects.money import Money


class IncidentType(str, Enum):
    """The 6 official categories of disputes from CDC section 11 & 12.2."""
    DEFICIT_COD = "DEFICIT_COD"                    # Cash deficit at evening close
    CASSE_MARCHANDISE = "CASSE_MARCHANDISE"        # Damaged or broken item in transit
    PERTE_COLIS = "PERTE_COLIS"                    # Lost or stolen parcel without violence
    FAUX_BILLET = "FAUX_BILLET"                    # Counterfeit banknotes accepted
    CREDIT_NON_AUTORISE = "CREDIT_NON_AUTORISE"    # Delivery left on promise without advance payment
    LITIGE_GARE = "LITIGE_GARE"                    # Lost freight advance or missing receipt in station


class DebtStatus(str, Enum):
    OUVERTE = "OUVERTE"
    EN_COURS = "EN_COURS"
    SOLDEE = "SOLDEE"
    ANNULEE_FORCE_MAJEURE = "ANNULEE_FORCE_MAJEURE"


# Règle Métier 7 : mots-clés caractérisant une dépense d'exploitation (et non un litige)
OPERATING_EXPENSE_KEYWORDS = (
    "carburant",
    "essence",
    "gazole",
    "gasoil",
    "frais de route",
    "frais annexes",
    "péage",
    "peage",
    "stationnement",
)


def is_operating_expense_reason(reason: str) -> bool:
    reason_lower = (reason or "").lower()
    return any(kw in reason_lower for kw in OPERATING_EXPENSE_KEYWORDS)


def assert_not_operating_expense(reason: str) -> None:
    if is_operating_expense_reason(reason):
        raise BusinessRuleViolationException(
            "Les dépenses d'exploitation (carburant, frais annexes de route) relèvent de la décharge de tournée "
            "et ne doivent pas être comptabilisées comme des litiges à la charge du livreur (Règle Métier 7)."
        )


@dataclass
class CourierDebt:
    """Rich Domain Entity managing courier financial liability and debt recovery."""
    reference_litige: str  # ex: LIT-2026-0042
    livreur_id: int
    incident_type: IncidentType
    initial_amount: Money
    reason: str
    incident_date: str  # YYYY-MM-DD
    id: Optional[int] = None
    colis_id: Optional[int] = None
    tournee_id: Optional[int] = None
    refunded_amount: Money = field(default_factory=Money.zero)
    status: DebtStatus = DebtStatus.OUVERTE
    closure_date: Optional[str] = None
    created_at: Optional[datetime] = None

    def __post_init__(self):
        if not self.reference_litige:
            raise BusinessRuleViolationException("La référence du litige est obligatoire.")
        if self.initial_amount.amount <= 0:
            raise BusinessRuleViolationException("Le montant initial de la dette doit être strictement positif.")
        if not self.reason or not self.reason.strip():
            raise BusinessRuleViolationException("Le motif circonstancié est obligatoire pour tout litige.")

    @classmethod
    def open_new(cls, **kwargs) -> "CourierDebt":
        """Ouvre un NOUVEAU litige en appliquant les règles de création.

        Règle Métier 7 : les dépenses d'exploitation (carburant, frais de route, péages...)
        sont des charges de la société, saisies dans la décharge de tournée (caisse).
        Elles ne doivent jamais être enregistrées comme litiges à la charge du livreur.
        La vérification n'est faite qu'à la création (et non dans __post_init__) afin de ne
        pas bloquer le rechargement des litiges historiques déjà présents en base.
        """
        assert_not_operating_expense(kwargs.get("reason") or "")
        return cls(**kwargs)

    @property
    def remaining_balance(self) -> Money:
        """Solde restant à recouvrer."""
        rem = self.initial_amount.amount - self.refunded_amount.amount
        return Money(max(0, rem))

    def calculate_max_legal_deduction(self, monthly_net_salary: Money) -> Money:
        """Calculates the maximum monthly deduction allowed by Malagasy labor regulations (30% max of net salary).
        Formula: Retenue = min(Solde Restant, 0.30 * Salaire Net)
        (CDC section 11.2 - Option B)
        """
        max_legal = round(0.30 * monthly_net_salary.amount)
        deduction = min(self.remaining_balance.amount, max_legal)
        return Money(deduction)

    def record_repayment(self, payment_amount: Money, closure_date: Optional[str] = None) -> None:
        """Registers a repayment instalment. If remaining balance reaches zero, marks debt as SOLDEE."""
        if payment_amount.amount <= 0:
            raise BusinessRuleViolationException("Le montant remboursé doit être strictement supérieur à 0 Ar.")

        if payment_amount > self.remaining_balance:
            raise BusinessRuleViolationException(
                f"Le montant versé ({payment_amount}) dépasse le solde restant ({self.remaining_balance})."
            )

        new_refunded = self.refunded_amount + payment_amount
        self.refunded_amount = new_refunded

        if self.remaining_balance.amount == 0:
            self.status = DebtStatus.SOLDEE
            self.closure_date = closure_date or datetime.now().strftime("%Y-%m-%d")
        else:
            self.status = DebtStatus.EN_COURS

    def cancel_under_force_majeure(self, police_report_reference: str) -> None:
        """Cancels debt entirely when verified armed assault/force majeure is proven with official police report.
        (CDC section 11.1 - Cas 3.3)
        """
        if not police_report_reference or not police_report_reference.strip():
            raise BusinessRuleViolationException("L'annulation pour force majeure requiert le numéro de procès-verbal de police.")
        self.status = DebtStatus.ANNULEE_FORCE_MAJEURE
        self.closure_date = datetime.now().strftime("%Y-%m-%d")
