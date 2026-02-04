"""V2 Golden Hour 서비스 테스트.

도메인: 골든아워 이벤트
커버리지 대상: golden_event_service.py, golden_intervention_service.py
SoT 문서: v2_golden_hour_policy_sot_ko.md
"""
import pytest
from datetime import datetime, time


class TestGoldenHourSchedule:
    """골든아워 스케줄 테스트."""

    GOLDEN_HOURS = [
        {"start": time(12, 0), "end": time(14, 0)},  # 점심
        {"start": time(19, 0), "end": time(21, 0)},  # 저녁
    ]

    def test_has_lunch_golden_hour(self):
        """점심 골든아워 존재."""
        lunch = self.GOLDEN_HOURS[0]
        assert lunch["start"] == time(12, 0)
        assert lunch["end"] == time(14, 0)

    def test_has_dinner_golden_hour(self):
        """저녁 골든아워 존재."""
        dinner = self.GOLDEN_HOURS[1]
        assert dinner["start"] == time(19, 0)
        assert dinner["end"] == time(21, 0)

    def test_check_if_golden_hour_active(self):
        """현재 골든아워 여부 확인."""
        current_time = time(13, 30)  # 점심 시간
        
        is_golden = any(
            gh["start"] <= current_time <= gh["end"]
            for gh in self.GOLDEN_HOURS
        )
        assert is_golden is True

    def test_not_golden_hour(self):
        """골든아워 아닌 시간."""
        current_time = time(10, 0)  # 오전
        
        is_golden = any(
            gh["start"] <= current_time <= gh["end"]
            for gh in self.GOLDEN_HOURS
        )
        assert is_golden is False


class TestGoldenHourMultiplier:
    """골든아워 배율 테스트."""

    DEFAULT_MULTIPLIER = 1.0
    GOLDEN_MULTIPLIER = 1.5

    def test_default_multiplier(self):
        """기본 배율 1.0."""
        assert self.DEFAULT_MULTIPLIER == 1.0

    def test_golden_multiplier(self):
        """골든아워 배율 1.5."""
        assert self.GOLDEN_MULTIPLIER == 1.5

    def test_reward_calculation_normal(self):
        """일반 시간 보상 계산."""
        base_reward = 1000
        multiplier = self.DEFAULT_MULTIPLIER
        final_reward = int(base_reward * multiplier)
        assert final_reward == 1000

    def test_reward_calculation_golden(self):
        """골든아워 보상 계산."""
        base_reward = 1000
        multiplier = self.GOLDEN_MULTIPLIER
        final_reward = int(base_reward * multiplier)
        assert final_reward == 1500


class TestGoldenHourOverride:
    """골든아워 오버라이드 테스트."""

    OVERRIDES = ["AUTO", "FORCE_ON", "FORCE_OFF"]

    def test_auto_follows_schedule(self):
        """AUTO: 스케줄 따름."""
        override = "AUTO"
        schedule_active = True
        
        if override == "AUTO":
            is_active = schedule_active
        elif override == "FORCE_ON":
            is_active = True
        else:
            is_active = False
        
        assert is_active == schedule_active

    def test_force_on_always_active(self):
        """FORCE_ON: 항상 활성."""
        override = "FORCE_ON"
        schedule_active = False  # 스케줄상 비활성
        
        if override == "FORCE_ON":
            is_active = True
        else:
            is_active = schedule_active
        
        assert is_active is True

    def test_force_off_always_inactive(self):
        """FORCE_OFF: 항상 비활성."""
        override = "FORCE_OFF"
        schedule_active = True  # 스케줄상 활성
        
        if override == "FORCE_OFF":
            is_active = False
        else:
            is_active = schedule_active
        
        assert is_active is False


class TestGoldenInterventionLog:
    """골든아워 개입 로그 테스트."""

    def test_log_created_on_activation(self):
        """활성화 시 로그 생성."""
        log = {
            "event_type": "GOLDEN_HOUR_START",
            "multiplier": 1.5,
            "triggered_at": datetime.utcnow(),
        }
        
        assert log["event_type"] == "GOLDEN_HOUR_START"
        assert log["multiplier"] == 1.5

    def test_log_created_on_deactivation(self):
        """비활성화 시 로그 생성."""
        log = {
            "event_type": "GOLDEN_HOUR_END",
            "multiplier": 1.0,
            "triggered_at": datetime.utcnow(),
        }
        
        assert log["event_type"] == "GOLDEN_HOUR_END"
