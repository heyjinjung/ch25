"""V2 Segment 서비스 테스트.

도메인: 유저 세그먼트
커버리지 대상: segment_service.py, segment_rules_engine.py
SoT 문서: v2_grade_segment_sot_ko.md
"""
from datetime import datetime, timezone

import pytest

from app.v2.services.segment_rules_engine import SegmentContext, matches_condition


def _base_ctx(**overrides) -> SegmentContext:
    defaults = dict(
        last_login_at=None,
        last_charge_at=None,
        last_play_at=None,
        last_active_at=None,
        days_since_last_login=5,
        days_since_last_charge=2,
        days_since_last_play=1,
        days_since_last_active=3,
        deposit_amount=150000,
        roulette_plays=10,
        dice_plays=5,
        lottery_plays=3,
        total_play_duration=120,
        level=5,
        xp=200,
        cash_balance=0.0,
        vault_balance=10000.0,
        login_streak=3,
        account_age_days=30,
        is_telegram_linked=True,
        has_charge_history=True,
    )
    defaults.update(overrides)
    return SegmentContext(**defaults)


class TestSegmentRulesEngineReal:
    def test_matches_simple_comparison(self):
        ctx = _base_ctx(deposit_amount=200000)
        condition = {"field": "deposit_amount", "op": ">=", "value": 100000}
        assert matches_condition(condition, ctx) is True

    def test_matches_any_all(self):
        ctx = _base_ctx(roulette_plays=0, dice_plays=10)
        condition = {
            "all": [
                {"field": "dice_plays", "op": ">=", "value": 5},
                {"any": [
                    {"field": "roulette_plays", "op": ">=", "value": 1},
                    {"field": "lottery_plays", "op": ">=", "value": 1},
                ]},
            ]
        }
        assert matches_condition(condition, ctx) is True

    def test_invalid_field_raises(self):
        ctx = _base_ctx()
        with pytest.raises(ValueError):
            matches_condition({"field": "unknown", "op": ">", "value": 1}, ctx)

    def test_datetime_compare_rejected(self):
        ctx = _base_ctx(last_login_at=datetime.now(timezone.utc))
        with pytest.raises(ValueError):
            matches_condition({"field": "last_login_at", "op": ">", "value": 1}, ctx)

    def test_new_segment_rule_requires_telegram_and_no_charge(self):
        ctx = _base_ctx(
            account_age_days=5,
            is_telegram_linked=True,
            has_charge_history=False,
        )
        condition = {
            "all": [
                {"field": "account_age_days", "op": "<=", "value": 7},
                {"field": "is_telegram_linked", "op": "==", "value": True},
                {"field": "has_charge_history", "op": "==", "value": False},
            ]
        }
        assert matches_condition(condition, ctx) is True

    def test_new_segment_rule_rejected_with_charge_history(self):
        ctx = _base_ctx(
            account_age_days=5,
            is_telegram_linked=True,
            has_charge_history=True,
        )
        condition = {
            "all": [
                {"field": "account_age_days", "op": "<=", "value": 7},
                {"field": "is_telegram_linked", "op": "==", "value": True},
                {"field": "has_charge_history", "op": "==", "value": False},
            ]
        }
        assert matches_condition(condition, ctx) is False

    def test_vip_whale_thresholds_updated(self):
        vip_ctx = _base_ctx(deposit_amount=3_000_000)
        whale_ctx = _base_ctx(deposit_amount=5_000_000)

        vip_condition = {"field": "deposit_amount", "op": ">=", "value": 3_000_000}
        whale_condition = {"field": "deposit_amount", "op": ">=", "value": 5_000_000}

        assert matches_condition(vip_condition, vip_ctx) is True
        assert matches_condition(whale_condition, whale_ctx) is True
