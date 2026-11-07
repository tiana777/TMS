"""Domain Entity: Vendor / Sender (Donneur d'Ordre / Expéditeur) according to CDC section 3, 9 & 12."""

from dataclasses import dataclass
from datetime import datetime
from enum import Enum
from typing import Optional
from backend.app.domain.exceptions import BusinessRuleViolationException
from backend.app.domain.value_objects.phone_number import PhoneNumber


class SenderType(str, Enum):
    """The 3 categories of senders / order givers."""
    CYBERMARCHAND = "CYBERMARCHAND"
    PARTICULIER = "PARTICULIER"
    ENTREPRISE = "ENTREPRISE"


@dataclass
class Vendor:
    """Rich Domain Entity representing an order giver (Cybermarchand, Particulier, Entreprise)."""
    name: str
    id: Optional[int] = None
    sender_type: SenderType = SenderType.CYBERMARCHAND
    phone: Optional[PhoneNumber] = None
    address: Optional[str] = None
    email: Optional[str] = None
    contact_person: Optional[str] = None
    nif_stat: Optional[str] = None
    payment_terms: str = "COMPTANT"
    active: bool = True
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    def __post_init__(self):
        if not self.name or not self.name.strip():
            raise BusinessRuleViolationException("Le nom de l'expéditeur / donneur d'ordre est obligatoire.")
        if isinstance(self.sender_type, str):
            try:
                self.sender_type = SenderType(self.sender_type)
            except ValueError:
                raise BusinessRuleViolationException(
                    f"Type d'expéditeur invalide: '{self.sender_type}'. Valides: CYBERMARCHAND, PARTICULIER, ENTREPRISE"
                )
