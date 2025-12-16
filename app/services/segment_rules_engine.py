"""Minimal rule engine for DB-managed segmentation rules.

Design goals:
- Keep JSON format simple but extensible (all/any + predicates)
- First-match-wins ordering based on priority

Condition JSON formats supported:
- {"all": [cond, cond, ...]}
- {"any": [cond, cond, ...]}
- {"field": "deposit_amount", "op": ">=", "value": 1000000}
- {"field": "last_charge_at", "op": "is_null"}

Supported fields:
- last_login_at, last_charge_at, last_active_at (datetime or None)
- days_since_last_login, days_since_last_charge, days_since_last_active (int or None)
- deposit_amount (int)
- roulette_plays, dice_plays, lottery_plays, total_play_duration (int)

Supported ops:
- ==, !=, >, >=, <, <=
- is_null, not_null
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Any


@dataclass(frozen=True)
class SegmentContext:
    last_login_at: datetime | None
    last_charge_at: datetime | None
    last_active_at: datetime | None

    days_since_last_login: int | None
    days_since_last_charge: int | None
    days_since_last_active: int | None

    deposit_amount: int
    roulette_plays: int
    dice_plays: int
    lottery_plays: int
    total_play_duration: int


def _coerce_number(value: Any) -> float | None:
    if value is None:
        return None
    if isinstance(value, (int, float)):
        return float(value)
    if isinstance(value, str) and value.strip() != "":
        try:
            return float(value)
        except ValueError:
            return None
    return None


def _get_field(ctx: SegmentContext, field: str) -> Any:
    if not hasattr(ctx, field):
        raise ValueError(f"UNKNOWN_FIELD:{field}")
    return getattr(ctx, field)


def matches_condition(condition: dict[str, Any], ctx: SegmentContext) -> bool:
    if "all" in condition:
        items = condition.get("all")
        if not isinstance(items, list):
            raise ValueError("INVALID_ALL")
        return all(matches_condition(c, ctx) for c in items)

    if "any" in condition:
        items = condition.get("any")
        if not isinstance(items, list):
            raise ValueError("INVALID_ANY")
        return any(matches_condition(c, ctx) for c in items)

    field = condition.get("field")
    op = condition.get("op")

    if not isinstance(field, str) or not isinstance(op, str):
        raise ValueError("INVALID_PREDICATE")

    actual = _get_field(ctx, field)

    if op == "is_null":
        return actual is None
    if op == "not_null":
        return actual is not None

    expected = condition.get("value")

    # Datetime comparisons: expect ISO strings or datetime? For admin input, treat as unsupported for now.
    if isinstance(actual, datetime):
        raise ValueError("DATETIME_COMPARE_UNSUPPORTED")

    # Numeric comparisons
    a_num = _coerce_number(actual)
    e_num = _coerce_number(expected)

    if a_num is None or e_num is None:
        return False

    if op == "==":
        return a_num == e_num
    if op == "!=":
        return a_num != e_num
    if op == ">":
        return a_num > e_num
    if op == ">=":
        return a_num >= e_num
    if op == "<":
        return a_num < e_num
    if op == "<=":
        return a_num <= e_num

    raise ValueError(f"UNKNOWN_OP:{op}")
