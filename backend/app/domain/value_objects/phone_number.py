"""PhoneNumber Value Object according to CDC section 7.1."""

from dataclasses import dataclass
from enum import Enum
import re
from backend.app.domain.exceptions import InvalidPhoneNumberException


class Operator(str, Enum):
    TELMA = "TELMA"
    ORANGE = "ORANGE"
    AIRTEL = "AIRTEL"


# Prefix mapping according to Malagasy telecommunication regulation & CDC
PREFIX_OPERATOR_MAP = {
    "034": Operator.TELMA,
    "038": Operator.TELMA,
    "035": Operator.TELMA,
    "032": Operator.ORANGE,
    "037": Operator.ORANGE,
    "033": Operator.AIRTEL,
    "036": Operator.AIRTEL,
}

# Strict 10-digit Malagasy phone regex: starts with 03 followed by 2, 3, 4, 5, 6, 7, 8 and 7 digits
MALAGASY_PHONE_REGEX = re.compile(r"^03([2345678])\d{7}$")


@dataclass(frozen=True)
class PhoneNumber:
    """Immutable Value Object representing a strictly validated Malagasy phone number.
    
    Format: Exactly 10 digits starting with 03.
    Operators supported:
      - Telma: 034, 038
      - Orange: 032, 037
      - Airtel: 033
    """
    raw_digits: str
    operator: Operator

    def __init__(self, value: str):
        if not value or not isinstance(value, str):
            raise InvalidPhoneNumberException("Le numéro de téléphone est obligatoire.")

        # Clean non-digit characters except leading plus if any
        cleaned = re.sub(r"[\s\.\-_/()]", "", value.strip())

        # Handle international format conversions (+261, 00261, 261, +2610...)
        if cleaned.startswith("+2610"):
            cleaned = "0" + cleaned[5:]
        elif cleaned.startswith("+261"):
            cleaned = "0" + cleaned[4:]
        elif cleaned.startswith("002610"):
            cleaned = "0" + cleaned[6:]
        elif cleaned.startswith("00261"):
            cleaned = "0" + cleaned[5:]
        elif cleaned.startswith("2610") and len(cleaned) in (12, 13):
            cleaned = "0" + cleaned[4:]
        elif cleaned.startswith("261") and len(cleaned) == 12:
            cleaned = "0" + cleaned[3:]

        # Validate digits only
        if not cleaned.isdigit():
            raise InvalidPhoneNumberException(f"Numéro invalide (doit contenir uniquement des chiffres) : '{value}'")

        # Validate length
        if len(cleaned) != 10:
            raise InvalidPhoneNumberException(
                f"Numéro malgache invalide : doit comporter exactement 10 chiffres (reçu {len(cleaned)} chiffres : '{cleaned}')"
            )

        # Validate regex and prefix
        if not MALAGASY_PHONE_REGEX.match(cleaned):
            prefix = cleaned[:3]
            raise InvalidPhoneNumberException(
                f"Préfixe opérateur inconnu '{prefix}'. Les préfixes autorisés sont Telma (034, 038), Orange (032, 037), Airtel (033)."
            )

        prefix = cleaned[:3]

        object.__setattr__(self, "raw_digits", cleaned)
        object.__setattr__(self, "operator", PREFIX_OPERATOR_MAP[prefix])

    @property
    def formatted(self) -> str:
        """Returns standard display format: '03X XX XXX XX'."""
        d = self.raw_digits
        return f"{d[:3]} {d[3:5]} {d[5:8]} {d[8:10]}"

    def __str__(self) -> str:
        return self.raw_digits

    def __repr__(self) -> str:
        return f"PhoneNumber(digits='{self.raw_digits}', operator={self.operator.value})"
