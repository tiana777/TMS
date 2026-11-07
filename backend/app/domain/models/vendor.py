"""Domain Entity: Vendor (Cybermarchand) according to CDC section 3, 9 & 12."""

from dataclasses import dataclass
from datetime import datetime
from typing import Optional
from backend.app.domain.exceptions import BusinessRuleViolationException
from backend.app.domain.value_objects.phone_number import PhoneNumber


@dataclass
class Vendor:
    """Rich Domain Entity representing a partnering merchant or e-commerce store."""
    name: str
    id: Optional[int] = None
    phone: Optional[PhoneNumber] = None
    contact_person: Optional[str] = None
    payment_terms: str = "COMPTANT"
    active: bool = True
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    def __post_init__(self):
        if not self.name or not self.name.strip():
            raise BusinessRuleViolationException("Le nom du cybermarchand est obligatoire.")
