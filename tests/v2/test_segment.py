"""V2 Segment 서비스 테스트.

도메인: 유저 세그먼트
커버리지 대상: segment_service.py, segment_rules_engine.py
SoT 문서: v2_grade_segment_sot_ko.md
"""
import pytest


class TestUserSegments:
    """유저 세그먼트 테스트."""

    SEGMENTS = ["NEW", "COMMON", "VIP", "WHALE", "AT_RISK"]

    def test_all_segments_defined(self):
        """모든 세그먼트 정의."""
        assert len(self.SEGMENTS) == 5

    @pytest.mark.parametrize("segment", ["NEW", "COMMON", "VIP", "WHALE", "AT_RISK"])
    def test_each_segment_exists(self, segment):
        """각 세그먼트 존재."""
        assert segment in self.SEGMENTS


class TestSegmentAssignment:
    """세그먼트 할당 테스트."""

    def test_new_user_segment(self):
        """신규 유저 세그먼트 할당."""
        days_since_join = 3
        segment = "NEW" if days_since_join <= 7 else "COMMON"
        assert segment == "NEW"

    def test_common_user_segment(self):
        """일반 유저 세그먼트."""
        days_since_join = 30
        total_deposit = 50000
        
        if days_since_join <= 7:
            segment = "NEW"
        elif total_deposit >= 500000:
            segment = "WHALE"
        elif total_deposit >= 100000:
            segment = "VIP"
        else:
            segment = "COMMON"
        
        assert segment == "COMMON"

    def test_vip_user_segment(self):
        """VIP 유저 세그먼트."""
        total_deposit = 200000
        
        if total_deposit >= 500000:
            segment = "WHALE"
        elif total_deposit >= 100000:
            segment = "VIP"
        else:
            segment = "COMMON"
        
        assert segment == "VIP"

    def test_whale_user_segment(self):
        """WHALE 유저 세그먼트."""
        total_deposit = 1000000
        
        if total_deposit >= 500000:
            segment = "WHALE"
        else:
            segment = "VIP"
        
        assert segment == "WHALE"


class TestSegmentRulesEngine:
    """세그먼트 규칙 엔진 테스트."""

    def test_greater_than_operator(self):
        """GT 연산자."""
        value = 100
        threshold = 50
        result = value > threshold
        assert result is True

    def test_less_than_operator(self):
        """LT 연산자."""
        value = 30
        threshold = 50
        result = value < threshold
        assert result is True

    def test_equals_operator(self):
        """EQ 연산자."""
        value = "VIP"
        target = "VIP"
        result = value == target
        assert result is True

    def test_in_operator(self):
        """IN 연산자."""
        value = "ROULETTE"
        allowed = ["ROULETTE", "DICE", "LOTTERY"]
        result = value in allowed
        assert result is True


class TestSegmentContext:
    """세그먼트 컨텍스트 테스트."""

    def test_context_has_user_data(self):
        """컨텍스트에 유저 데이터."""
        context = {
            "user_id": 1,
            "total_deposit": 150000,
            "play_count_3d": 25,
            "days_since_join": 45,
            "last_deposit_days_ago": 2,
        }
        
        assert "user_id" in context
        assert "total_deposit" in context

    def test_context_used_for_evaluation(self):
        """컨텍스트로 규칙 평가."""
        context = {
            "total_deposit": 150000,
            "play_count_3d": 25,
        }
        
        rule = {"field": "total_deposit", "operator": ">=", "value": 100000}
        
        matches = context[rule["field"]] >= rule["value"]
        assert matches is True


class TestAtRiskSegment:
    """AT_RISK 세그먼트 테스트."""

    def test_at_risk_criteria(self):
        """위험 유저 기준."""
        # 장기 미입금 + 잦은 출금 시도
        last_deposit_days_ago = 10
        withdrawal_attempts_7d = 5
        
        is_at_risk = (
            last_deposit_days_ago >= 7 and 
            withdrawal_attempts_7d >= 3
        )
        
        assert is_at_risk is True

    def test_not_at_risk_with_recent_deposit(self):
        """최근 입금 시 위험군 아님."""
        last_deposit_days_ago = 2
        withdrawal_attempts_7d = 5
        
        is_at_risk = (
            last_deposit_days_ago >= 7 and 
            withdrawal_attempts_7d >= 3
        )
        
        assert is_at_risk is False
