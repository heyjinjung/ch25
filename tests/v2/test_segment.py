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

class TestSegmentServicePriority:
    """세그먼트 서비스 우선순위 테스트 (SoT 6.2)."""

    def test_first_match_wins_priority(self, db_session):
        """Priority 오름차순으로 첫 매칭 규칙이 결과를 결정 (SoT 4, 11)."""
        from app.v2.services.segment_service import V2SegmentService
        from app.v2.models.v2_segment_rule import V2SegmentRule
        
        # 1. High Priority (10) Rule: COMMON if deposit > 1000
        rule_high = V2SegmentRule(
            name="TEST_COMMON",
            segment="COMMON",
            priority=10,
            condition_json={"field": "deposit_amount", "op": ">=", "value": 1000},
            enabled=True
        )
        # 2. Low Priority (20) Rule: VIP if deposit > 5000
        rule_low = V2SegmentRule(
            name="TEST_VIP",
            segment="VIP",
            priority=20,
            condition_json={"field": "deposit_amount", "op": ">=", "value": 5000},
            enabled=True
        )
        db_session.add_all([rule_high, rule_low])
        db_session.commit()
        
        # User with 10000 deposit - matches both, but priority 10 wins (COMMON)
        ctx = _base_ctx(deposit_amount=10000)
        rules = V2SegmentService.list_enabled_rules(db_session)
        segment, rule_name = V2SegmentService._recommend_segment(rules, ctx)
        assert segment == "COMMON"
        assert rule_name == "TEST_COMMON"

class TestSegmentWinnerClassification:
    """마진 기반 WINNER 세그먼트 분류 테스트 (SoT 7.5)."""

    def test_classify_winner_if_margin_negative(self, db_session):
        """마진이 음수이면 WINNER로 분류 (SoT 7.5)."""
        from app.v2.services.segment_service import V2SegmentService
        
        # Margin is a context field in SegmentContext
        # margin_total < 0 -> WINNER
        ctx = _base_ctx(margin_total=-500)
        
        # In a real scenario, WINNER is often a special rule or direct logic
        # Based on SOT, margin < 0 is the criterion.
        # Ensure V2SegmentService respects this or has a rule for it.
        
        # Let's verify matches_condition first
        condition = {"field": "margin_total", "op": "<", "value": 0}
        assert matches_condition(condition, ctx) is True
        
        # Verify via service if rule exists
        from app.v2.models.v2_segment_rule import V2SegmentRule
        winner_rule = V2SegmentRule(
            name="TEST_WINNER",
            segment="WINNER",
            priority=5, # Highest priority
            condition_json={"field": "margin_total", "op": "<", "value": 0},
            enabled=True
        )
        db_session.add(winner_rule)
        db_session.commit()
        
        rules = V2SegmentService.list_enabled_rules(db_session)
        segment, rule_name = V2SegmentService._recommend_segment(rules, ctx)
        assert segment == "WINNER"
        assert rule_name == "TEST_WINNER"
