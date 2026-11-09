"""Domain Entity: Courier (Livreur / Chauffeur Navette) according to CDC section 3 & 12."""

from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional
from backend.app.domain.exceptions import BusinessRuleViolationException
from backend.app.domain.value_objects.money import Money
from backend.app.domain.value_objects.phone_number import PhoneNumber


@dataclass
class Courier:
    """Rich Domain Entity representing a delivery courier or station shuttle driver."""
    name: str
    phone: PhoneNumber
    vehicle_type: str
    id: Optional[int] = None
    security_deposit: Money = field(default_factory=Money.zero)
    max_parcels: int = 15
    assigned_axis: Optional[str] = None
    active: bool = True
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    def __post_init__(self):
        if not self.name or not self.name.strip():
            raise BusinessRuleViolationException("Le nom du coursier est obligatoire.")
        if not self.vehicle_type or not self.vehicle_type.strip():
            raise BusinessRuleViolationException("Le type de véhicule est obligatoire.")
        if self.max_parcels <= 0:
            raise BusinessRuleViolationException("La capacité maximale de colis doit être strictement positive.")

    def set_max_parcels(self, limit: int) -> None:
        if limit <= 0:
            raise BusinessRuleViolationException("La capacité maximale de colis doit être strictement positive.")
        self.max_parcels = limit

    def set_assigned_axis(self, axis: Optional[str]) -> None:
        self.assigned_axis = axis

    def deactivate(self) -> None:
        self.active = False
