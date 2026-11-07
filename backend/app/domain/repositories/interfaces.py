"""Domain Repository Interfaces (Abstract Base Classes) for Clean Architecture decoupling."""

from abc import ABC, abstractmethod
from typing import List, Optional
from backend.app.domain.models.courier import Courier
from backend.app.domain.models.dispute import CourierDebt
from backend.app.domain.models.parcel import Parcel
from backend.app.domain.models.tour import Tour
from backend.app.domain.models.vendor import Vendor
from backend.app.domain.state_machine.parcel_fsm import ParcelStatus
from backend.app.domain.value_objects.axis import LogisticAxis


class IParcelRepository(ABC):
    @abstractmethod
    def save(self, parcel: Parcel) -> Parcel:
        pass

    @abstractmethod
    def save_batch(self, parcels: List[Parcel]) -> List[Parcel]:
        pass

    @abstractmethod
    def get_by_id(self, parcel_id: int) -> Optional[Parcel]:
        pass

    @abstractmethod
    def get_by_tracking_number(self, tracking_number: str) -> Optional[Parcel]:
        pass

    @abstractmethod
    def list_by_status(self, status: ParcelStatus) -> List[Parcel]:
        pass

    @abstractmethod
    def list_by_date(self, date_str: str) -> List[Parcel]:
        pass

    @abstractmethod
    def list_by_axis(self, axis: LogisticAxis) -> List[Parcel]:
        pass

    @abstractmethod
    def generate_next_bdr(self) -> str:
        """Generates next sequential BDR number (e.g. '0001', '0002', etc.)."""
        pass


class ICourierRepository(ABC):
    @abstractmethod
    def save(self, courier: Courier) -> Courier:
        pass

    @abstractmethod
    def get_by_id(self, courier_id: int) -> Optional[Courier]:
        pass

    @abstractmethod
    def list_all(self, active_only: bool = True) -> List[Courier]:
        pass


class ITourRepository(ABC):
    @abstractmethod
    def save(self, tour: Tour) -> Tour:
        pass

    @abstractmethod
    def get_by_id(self, tour_id: int) -> Optional[Tour]:
        pass

    @abstractmethod
    def get_by_courier_and_date(self, courier_id: int, tour_date: str) -> Optional[Tour]:
        pass

    @abstractmethod
    def list_by_date(self, tour_date: str) -> List[Tour]:
        pass


class IDisputeRepository(ABC):
    @abstractmethod
    def save(self, debt: CourierDebt) -> CourierDebt:
        pass

    @abstractmethod
    def get_by_id(self, debt_id: int) -> Optional[CourierDebt]:
        pass

    @abstractmethod
    def get_by_reference(self, reference: str) -> Optional[CourierDebt]:
        pass

    @abstractmethod
    def list_by_courier(self, courier_id: int) -> List[CourierDebt]:
        pass

    @abstractmethod
    def generate_next_litige_ref(self) -> str:
        """Generates next sequential dispute reference (e.g. 'LIT-2026-0001')."""
        pass


class IVendorRepository(ABC):
    @abstractmethod
    def save(self, vendor: Vendor) -> Vendor:
        pass

    @abstractmethod
    def get_by_id(self, vendor_id: int) -> Optional[Vendor]:
        pass

    @abstractmethod
    def get_by_name(self, name: str) -> Optional[Vendor]:
        pass

    @abstractmethod
    def list_all(self, active_only: bool = True) -> List[Vendor]:
        pass
