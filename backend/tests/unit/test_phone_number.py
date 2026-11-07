"""Unit tests for PhoneNumber Value Object."""

import pytest
from backend.app.domain.exceptions import InvalidPhoneNumberException
from backend.app.domain.value_objects.phone_number import Operator, PhoneNumber


class TestPhoneNumber:
    def test_valid_telma_numbers(self):
        p1 = PhoneNumber("0341234567")
        assert p1.operator == Operator.TELMA
        assert p1.raw_digits == "0341234567"
        assert p1.formatted == "034 12 345 67"

        p2 = PhoneNumber("0389988776")
        assert p2.operator == Operator.TELMA
        assert p2.formatted == "038 99 887 76"

    def test_valid_orange_numbers(self):
        p1 = PhoneNumber("0321122334")
        assert p1.operator == Operator.ORANGE
        assert p1.formatted == "032 11 223 34"

        p2 = PhoneNumber("0370011223")
        assert p2.operator == Operator.ORANGE
        assert p2.formatted == "037 00 112 23"

    def test_valid_airtel_number(self):
        p = PhoneNumber("0334455667")
        assert p.operator == Operator.AIRTEL
        assert p.formatted == "033 44 556 67"

    def test_cleaning_spaces_dashes_dots(self):
        p = PhoneNumber("034-12.345 67")
        assert p.raw_digits == "0341234567"
        assert p.operator == Operator.TELMA

    def test_international_formats(self):
        p1 = PhoneNumber("+261341234567")
        assert p1.raw_digits == "0341234567"

        p2 = PhoneNumber("00261321122334")
        assert p2.raw_digits == "0321122334"

        p3 = PhoneNumber("261334455667")
        assert p3.raw_digits == "0334455667"

    def test_invalid_length_too_short(self):
        with pytest.raises(InvalidPhoneNumberException) as exc:
            PhoneNumber("03412345")
        assert "exactement 10 chiffres" in str(exc.value)

    def test_invalid_length_too_long(self):
        with pytest.raises(InvalidPhoneNumberException) as exc:
            PhoneNumber("034123456789")
        assert "exactement 10 chiffres" in str(exc.value)

    def test_invalid_operator_prefix(self):
        with pytest.raises(InvalidPhoneNumberException) as exc:
            PhoneNumber("0391234567")
        assert "Préfixe opérateur inconnu" in str(exc.value)

    def test_non_digit_characters(self):
        with pytest.raises(InvalidPhoneNumberException):
            PhoneNumber("034ABCDEFG")

    def test_empty_phone(self):
        with pytest.raises(InvalidPhoneNumberException):
            PhoneNumber("")
