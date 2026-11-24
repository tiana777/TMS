"""Domain Entity: Tour (Tournée de Livraison) according to CDC section 3, 12 & 13."""

from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import List, Optional
from backend.app.domain.exceptions import BusinessRuleViolationException
from backend.app.domain.models.parcel import Parcel
from backend.app.domain.state_machine.parcel_fsm import ParcelStatus
from backend.app.domain.value_objects.money import Money


class TourStatus(str, Enum):
    ASSIGNE = "ASSIGNE"
    EN_COURS = "EN_COURS"
    CLOTURE = "CLOTURE"


@dataclass
class Tour:
    """Rich Domain Entity for a delivery run conducted by a courier."""
    tour_date: str
    courier_id: int
    id: Optional[int] = None
    status: TourStatus = TourStatus.ASSIGNE
    parcels: List[Parcel] = field(default_factory=list)
    theoretical_total: Money = field(default_factory=Money.zero)
    actual_remitted: Money = field(default_factory=Money.zero)
    expenses_amount: Money = field(default_factory=Money.zero)
    expenses_reason: Optional[str] = None
    closed_at: Optional[datetime] = None
    created_at: Optional[datetime] = None

    def calculate_theoretical_total(self) -> Money:
        """Calculates theoretical total due by summing all delivered parcels in tour:
        Total = sum(merchandise_amount + delivery_fee) for all parcels with status LIVRE, ENCAISSE, LIVRE_ENCAISSE
        (CDC section 13.1).
        Si le COD est récupéré au siège (encaissement_lieu == 'SIEGE'), le coursier n'encaisse pas ce montant :
        il est donc exclu du total théorique dû par le livreur lors de la décharge.
        """
        total = Money.zero()
        for p in self.parcels:
            if p.status in [
                ParcelStatus.LIVRE,
                ParcelStatus.ENCAISSE,
                ParcelStatus.LIVRE_ENCAISSE,
                ParcelStatus.CLOTURE_CAISSE,
                ParcelStatus.SOUS_TRAITE,
            ]:
                if getattr(p, "encaissement_lieu", "LIVREUR") == "SIEGE":
                    continue
                total += p.total_to_collect
        self.theoretical_total = total
        return total

    def compute_cash_discrepancy(
        self,
        cash_and_mobile_remitted: Money,
        expenses_amount: Optional[Money] = None,
        expenses_reason: Optional[str] = None,
    ) -> int:
        """Computes discrepancy: (Remitted Cash/Mobile + Justified Expenses) - Theoretical Due.
        Règle Métier 7 : Les dépenses d'exploitation (carburant, frais de route/fret) justifiées
        sont des charges de la société. Elles viennent justifier la décharge et réduire le montant
        net à verser sans AUCUN litige ni dette imputable au livreur.
        Ecart = (Remitted + Expenses) - Theoretical
        Si < 0, il s'agit d'un vrai déficit net injustifié (Déficit de caisse).
        """
        theor = self.calculate_theoretical_total().amount
        actual = cash_and_mobile_remitted.amount
        exp = expenses_amount.amount if expenses_amount else 0

        self.actual_remitted = cash_and_mobile_remitted
        if expenses_amount:
            self.expenses_amount = expenses_amount
        if expenses_reason:
            self.expenses_reason = expenses_reason

        total_justified = actual + exp
        return total_justified - theor
