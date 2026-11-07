"""Money Value Object in Malagasy Ariary (MGA) according to CDC section 7.2."""

from dataclasses import dataclass
from typing import Union
from backend.app.domain.exceptions import InvalidAmountException


@dataclass(frozen=True)
class Money:
    """Immutable Value Object for amounts in Ariary (MGA).
    
    In operational practice in Madagascar, Ariary amounts are strictly integer values >= 0.
    """
    amount: int

    def __init__(self, value: Union[int, float, str, "Money"]):
        if isinstance(value, Money):
            amount_val = value.amount
        elif isinstance(value, (int, float)):
            if isinstance(value, float) and not value.is_integer():
                raise InvalidAmountException(f"Le montant en Ariary ne peut pas comporter de décimales : {value}")
            amount_val = int(value)
        elif isinstance(value, str):
            cleaned = value.replace("Ar", "").replace("MGA", "").replace(" ", "").replace("\xa0", "").strip()
            if not cleaned:
                amount_val = 0
            else:
                try:
                    amount_val = int(cleaned)
                except ValueError:
                    raise InvalidAmountException(f"Montant invalide : '{value}'")
        else:
            raise InvalidAmountException(f"Type de montant invalide : {type(value)}")

        if amount_val < 0:
            raise InvalidAmountException(f"Un montant monétaire ne peut pas être négatif ({amount_val} Ar).")

        object.__setattr__(self, "amount", amount_val)

    @classmethod
    def zero(cls) -> "Money":
        return cls(0)

    @property
    def formatted(self) -> str:
        """Returns standard format with thousands separator and 'Ar' suffix.
        Example: 125 000 Ar
        """
        # Format with spaces as thousand separators
        return f"{self.amount:,} Ar".replace(",", " ")

    def __add__(self, other: Union["Money", int]) -> "Money":
        other_amount = other.amount if isinstance(other, Money) else other
        return Money(self.amount + other_amount)

    def __radd__(self, other: Union["Money", int]) -> "Money":
        return self.__add__(other)

    def __sub__(self, other: Union["Money", int]) -> "Money":
        other_amount = other.amount if isinstance(other, Money) else other
        new_val = self.amount - other_amount
        if new_val < 0:
            raise InvalidAmountException(
                f"Soustraction impossible : le solde ne peut devenir négatif ({self.amount} - {other_amount} = {new_val} Ar)."
            )
        return Money(new_val)

    def __mul__(self, factor: Union[int, float]) -> "Money":
        if factor < 0:
            raise InvalidAmountException(f"Facteur multiplicatif négatif interdit : {factor}")
        return Money(round(self.amount * factor))

    def __rmul__(self, factor: Union[int, float]) -> "Money":
        return self.__mul__(factor)

    def __lt__(self, other: Union["Money", int]) -> bool:
        other_amount = other.amount if isinstance(other, Money) else other
        return self.amount < other_amount

    def __le__(self, other: Union["Money", int]) -> bool:
        other_amount = other.amount if isinstance(other, Money) else other
        return self.amount <= other_amount

    def __gt__(self, other: Union["Money", int]) -> bool:
        other_amount = other.amount if isinstance(other, Money) else other
        return self.amount > other_amount

    def __ge__(self, other: Union["Money", int]) -> bool:
        other_amount = other.amount if isinstance(other, Money) else other
        return self.amount >= other_amount

    def __eq__(self, other: object) -> bool:
        if isinstance(other, Money):
            return self.amount == other.amount
        if isinstance(other, int):
            return self.amount == other
        return False

    def __int__(self) -> int:
        return self.amount

    def __str__(self) -> str:
        return self.formatted

    def __repr__(self) -> str:
        return f"Money({self.amount})"
