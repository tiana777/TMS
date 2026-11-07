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
