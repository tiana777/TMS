"""Domain exceptions for TMS EXPRESS."""


class DomainException(Exception):
    """Base domain exception."""
    pass


class InvalidPhoneNumberException(DomainException):
    """Raised when a phone number is not a valid Malagasy phone number."""
    pass


class InvalidAmountException(DomainException):
    """Raised when an amount is negative or invalid in MGA currency."""
    pass


class InvalidStateTransitionException(DomainException):
    """Raised when an illegal status transition is requested on a parcel."""
    pass


class MissingRequiredDataException(DomainException):
    """Raised when required data for a state transition or business operation is missing."""
    pass


class BusinessRuleViolationException(DomainException):
    """Raised when a business invariant is violated."""
    pass


class EntityNotFoundException(DomainException):
    """Raised when an entity is not found by ID or key."""
    def __init__(self, entity_name: str, entity_id: any):
        super().__init__(f"{entity_name} avec l'identifiant {entity_id} est introuvable.")
        self.entity_name = entity_name
        self.entity_id = entity_id

