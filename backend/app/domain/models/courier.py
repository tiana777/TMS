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
    max_parcels: int = 30
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
        if self.max_parcels > 30:
            raise BusinessRuleViolationException("Surcharge interdite : un livreur ne peut transporter que 30 colis au maximum.")

    def set_max_parcels(self, limit: int) -> None:
        if limit <= 0:
            raise BusinessRuleViolationException("La capacité maximale de colis doit être strictement positive.")
        if limit > 30:
            raise BusinessRuleViolationException("Surcharge interdite : un livreur ne peut transporter que 30 colis au maximum.")
        self.max_parcels = limit

    def set_assigned_axis(self, axis: Optional[str]) -> None:
        self.assigned_axis = axis

    def deactivate(self) -> None:
        self.active = False

    def activate(self) -> None:
        self.active = True

    def update_profile(
        self,
        name: Optional[str] = None,
        phone: Optional[PhoneNumber] = None,
        vehicle_type: Optional[str] = None,
        security_deposit: Optional[Money] = None,
        max_parcels: Optional[int] = None,
        assigned_axis: Optional[str] = None,
        active: Optional[bool] = None,
    ) -> None:
        if name is not None:
            if not name.strip():
                raise BusinessRuleViolationException("Le nom du coursier est obligatoire.")
            self.name = name.strip()
        if phone is not None:
            self.phone = phone
        if vehicle_type is not None:
            if not vehicle_type.strip():
                raise BusinessRuleViolationException("Le type de véhicule est obligatoire.")
            self.vehicle_type = vehicle_type.strip()
        if security_deposit is not None:
            self.security_deposit = security_deposit
        if max_parcels is not None:
            self.set_max_parcels(max_parcels)
        if assigned_axis is not None:
            self.assigned_axis = assigned_axis if assigned_axis != "NONE" else None
        if active is not None:
            self.active = active
