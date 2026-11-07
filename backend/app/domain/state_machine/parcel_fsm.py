"""Finite State Machine (FSM) for Parcel status transitions according to CDC section 8."""

from dataclasses import dataclass
from enum import Enum
from typing import Dict, List, Optional, Set
import re
from backend.app.domain.exceptions import (
    InvalidStateTransitionException,
    MissingRequiredDataException,
)


class ParcelStatus(str, Enum):
    EN_DEPOT = "EN_DEPOT"
    ASSIGNE = "ASSIGNE"
    EN_COURS = "EN_COURS"
    SOUS_TRAITE = "SOUS_TRAITE"
    LIVRE_ENCAISSE = "LIVRE_ENCAISSE"
    REPORTE = "REPORTE"
    ANNULE_RETOUR = "ANNULE_RETOUR"
    RETOUR_BOUTIQUE = "RETOUR_BOUTIQUE"
    CLOTURE_CAISSE = "CLOTURE_CAISSE"

    @property
    def label(self) -> str:
        labels = {
            ParcelStatus.EN_DEPOT: "En Dépôt (Hub Tsiazotafo)",
            ParcelStatus.ASSIGNE: "Assigné en Tournée",
            ParcelStatus.EN_COURS: "En Cours de Livraison",
            ParcelStatus.SOUS_TRAITE: "Sous-traité Gare (Province)",
            ParcelStatus.LIVRE_ENCAISSE: "Livré & Encaissé",
            ParcelStatus.REPORTE: "Reporté",
            ParcelStatus.ANNULE_RETOUR: "Annulé / Retour",
            ParcelStatus.RETOUR_BOUTIQUE: "Retourné à la Boutique",
            ParcelStatus.CLOTURE_CAISSE: "Clôturé en Caisse",
        }
        return labels.get(self, self.value)

    @property
    def color_theme(self) -> Dict[str, str]:
        """Universal pastel color codes according to CDC section 9 (Écran 06)."""
        themes = {
            ParcelStatus.LIVRE_ENCAISSE: {"bg": "#dcfce7", "text": "#065f46", "border": "#86efac"},
            ParcelStatus.EN_COURS: {"bg": "#dbeafe", "text": "#0369a1", "border": "#7dd3fc"},
            ParcelStatus.ASSIGNE: {"bg": "#e0e7ff", "text": "#1e40af", "border": "#a5b4fc"},
            ParcelStatus.EN_DEPOT: {"bg": "#fef3c7", "text": "#78350f", "border": "#fde68a"},
            ParcelStatus.REPORTE: {"bg": "#ffedd5", "text": "#92400e", "border": "#fed7aa"},
            ParcelStatus.ANNULE_RETOUR: {"bg": "#ffe4e6", "text": "#991b1b", "border": "#fecdd3"},
            ParcelStatus.SOUS_TRAITE: {"bg": "#f3e8ff", "text": "#6b21a8", "border": "#d8b4fe"},
            ParcelStatus.RETOUR_BOUTIQUE: {"bg": "#f1f5f9", "text": "#334155", "border": "#cbd5e1"},
            ParcelStatus.CLOTURE_CAISSE: {"bg": "#ecfdf5", "text": "#047857", "border": "#a7f3d0"},
        }
        return themes.get(self, {"bg": "#f3f4f6", "text": "#374151", "border": "#e5e7eb"})


class PaymentMethod(str, Enum):
    ESPECES = "ESPECES"
    MVOLA = "MVOLA"
    AIRTEL = "AIRTEL"
    ORANGE_MONEY = "ORANGE_MONEY"


# Strict Legal Transition Matrix (CDC section 8.1)
ALLOWED_TRANSITIONS: Dict[Optional[ParcelStatus], Set[ParcelStatus]] = {
    None: {ParcelStatus.EN_DEPOT},
    ParcelStatus.EN_DEPOT: {ParcelStatus.ASSIGNE, ParcelStatus.SOUS_TRAITE},
    ParcelStatus.ASSIGNE: {
        ParcelStatus.EN_COURS,
        ParcelStatus.SOUS_TRAITE,
        ParcelStatus.EN_DEPOT,
    },
    ParcelStatus.EN_COURS: {
        ParcelStatus.LIVRE_ENCAISSE,
        ParcelStatus.REPORTE,
        ParcelStatus.ANNULE_RETOUR,
    },
    ParcelStatus.SOUS_TRAITE: {
        ParcelStatus.LIVRE_ENCAISSE,
        ParcelStatus.ANNULE_RETOUR,
    },
    ParcelStatus.REPORTE: {ParcelStatus.EN_DEPOT},
    ParcelStatus.ANNULE_RETOUR: {ParcelStatus.RETOUR_BOUTIQUE},
    ParcelStatus.LIVRE_ENCAISSE: {ParcelStatus.CLOTURE_CAISSE},
    ParcelStatus.RETOUR_BOUTIQUE: set(),
    ParcelStatus.CLOTURE_CAISSE: set(),
}


@dataclass
class TransitionContext:
    """Contextual data passed during a state transition to satisfy mandatory business rules."""
    courier_id: Optional[int] = None
    payment_method: Optional[PaymentMethod] = None
    reschedule_date: Optional[str] = None  # ISO format YYYY-MM-DD
    incident_reason: Optional[str] = None
    partner_name: Optional[str] = None
    partner_reference: Optional[str] = None
    partner_fee: Optional[int] = None


class ParcelStateMachine:
    """Encapsulates State Pattern & FSM logic ensuring inviolable status transitions."""

    @classmethod
    def can_transition(cls, from_status: Optional[ParcelStatus], to_status: ParcelStatus) -> bool:
        allowed = ALLOWED_TRANSITIONS.get(from_status, set())
        return to_status in allowed

    @classmethod
    def validate_transition(
        cls,
        from_status: Optional[ParcelStatus],
        to_status: ParcelStatus,
        context: Optional[TransitionContext] = None,
    ) -> None:
        """Validates that transition is legally permitted AND that mandatory data is provided."""
        ctx = context or TransitionContext()

        if not cls.can_transition(from_status, to_status):
            from_name = from_status.value if from_status else "INITIAL"
            raise InvalidStateTransitionException(
                f"Transition d'état interdite : '{from_name}' ➔ '{to_status.value}' n'est pas autorisée par la FSM."
            )

        # Transition specific data requirements according to CDC section 8.1
        if to_status == ParcelStatus.ASSIGNE:
            if not ctx.courier_id:
                raise MissingRequiredDataException(
                    "L'assignation d'un colis nécessite obligatoirement l'identifiant du coursier ou de la navette."
                )

        elif to_status == ParcelStatus.SOUS_TRAITE:
            if not ctx.partner_name or not ctx.partner_name.strip():
                raise MissingRequiredDataException(
                    "La sous-traitance en gare requiert obligatoirement le nom de la coopérative de transport."
                )
            if not ctx.partner_reference or not ctx.partner_reference.strip():
                raise MissingRequiredDataException(
                    "La sous-traitance en gare requiert obligatoirement le numéro de récépissé officiel."
                )
            if ctx.partner_fee is None or ctx.partner_fee < 0:
                raise MissingRequiredDataException(
                    "La sous-traitance en gare requiert obligatoirement le montant des frais de fret (>= 0 Ar)."
                )

        elif to_status == ParcelStatus.LIVRE_ENCAISSE:
            if from_status == ParcelStatus.EN_COURS:
                if not ctx.payment_method:
                    raise MissingRequiredDataException(
                        "La validation de livraison et encaissement requiert obligatoirement le mode de paiement (Espèces ou Mobile Money)."
                    )

        elif to_status == ParcelStatus.REPORTE:
            if not ctx.reschedule_date or not re.match(r"^\d{4}-\d{2}-\d{2}$", ctx.reschedule_date):
                raise MissingRequiredDataException(
                    "Le report d'un colis requiert obligatoirement une date de reprogrammation valide au format YYYY-MM-DD."
                )
            if not ctx.incident_reason or not ctx.incident_reason.strip():
                raise MissingRequiredDataException(
                    "Le report d'un colis requiert obligatoirement un motif circonstancié."
                )

        elif to_status == ParcelStatus.ANNULE_RETOUR:
            if not ctx.incident_reason or not ctx.incident_reason.strip():
                raise MissingRequiredDataException(
                    "L'annulation ou le refus d'un colis requiert obligatoirement un motif circonstancié explicite."
                )
