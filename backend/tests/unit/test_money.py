"""Unit tests for Money Value Object in MGA (Ariary)."""

import pytest
from backend.app.domain.exceptions import InvalidAmountException
from backend.app.domain.value_objects.money import Money


class TestMoney:
    def test_instantiation_from_int(self):
        m = Money(150000)
        assert m.amount == 150000
        assert m.formatted == "150 000 Ar"
        assert int(m) == 150000

    def test_instantiation_from_string(self):
        m1 = Money("25 000 Ar")
        assert m1.amount == 25000

        m2 = Money("5000MGA")
        assert m2.amount == 5000

    def test_instantiation_from_float_integer(self):
        m = Money(10000.0)
        assert m.amount == 10000

    def test_reject_decimal_amounts(self):
        with pytest.raises(InvalidAmountException):
            Money(10500.50)

    def test_reject_negative_amount(self):
        with pytest.raises(InvalidAmountException):
            Money(-5000)

    def test_addition(self):
        m1 = Money(15000)
        m2 = Money(3000)
        res = m1 + m2
        assert res.amount == 18000
        assert res.formatted == "18 000 Ar"

    def test_subtraction_success(self):
        m1 = Money(20000)
        m2 = Money(5000)
        res = m1 - m2
        assert res.amount == 15000

    def test_subtraction_negative_fails(self):
        m1 = Money(5000)
        m2 = Money(10000)
        with pytest.raises(InvalidAmountException):
            _ = m1 - m2

    def test_multiplication(self):
        m = Money(5000)
        res = m * 3
        assert res.amount == 15000

    def test_comparisons(self):
        m1 = Money(10000)
        m2 = Money(20000)
        assert m1 < m2
        assert m1 <= m2
        assert m2 > m1
        assert m2 >= m1
        assert m1 == Money(10000)
        assert m1 == 10000
