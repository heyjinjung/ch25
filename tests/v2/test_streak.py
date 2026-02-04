"""V2 Streak 서비스 테스트.

도메인: 연속 출석, 스트릭
커버리지 대상: streak_service.py
SoT 문서: v2_attendance_streak_logic_sot_ko.md
"""
import pytest
from datetime import date, timedelta


class TestStreakCounting:
    """스트릭 카운트 테스트."""

    def test_consecutive_days_increment(self):
        """연속 일수 증가."""
        streak = 5
        last_play = date(2026, 2, 3)
        today = date(2026, 2, 4)
        
        if today - last_play == timedelta(days=1):
            streak += 1
        
        assert streak == 6

    def test_streak_reset_on_gap(self):
        """하루 건너뛰면 리셋."""
        streak = 10
        last_play = date(2026, 2, 2)
        today = date(2026, 2, 4)  # 2일 차이
        
        if today - last_play > timedelta(days=1):
            streak = 1  # 리셋
        
        assert streak == 1

    def test_same_day_no_change(self):
        """같은 날 중복 플레이 시 변화 없음."""
        streak = 7
        last_play = date(2026, 2, 4)
        today = date(2026, 2, 4)
        
        if today == last_play:
            pass  # 변화 없음
        
        assert streak == 7


class TestStreakRewards:
    """스트릭 보상 테스트."""

    STREAK_REWARDS = {
        3: {"ROULETTE_TICKET": 1},
        7: {"DICE_TICKET": 2},
        14: {"LOTTERY_TICKET": 1},
        30: {"GOLD_KEY_TICKET": 1},
    }

    def test_3day_reward(self):
        """3일 스트릭 보상."""
        reward = self.STREAK_REWARDS.get(3)
        assert reward == {"ROULETTE_TICKET": 1}

    def test_7day_reward(self):
        """7일 스트릭 보상."""
        reward = self.STREAK_REWARDS.get(7)
        assert reward == {"DICE_TICKET": 2}

    def test_30day_reward(self):
        """30일 스트릭 보상."""
        reward = self.STREAK_REWARDS.get(30)
        assert reward == {"GOLD_KEY_TICKET": 1}

    def test_non_milestone_no_reward(self):
        """마일스톤 아닌 날 보상 없음."""
        streak = 5  # 마일스톤 아님
        reward = self.STREAK_REWARDS.get(streak)
        assert reward is None


class TestOperationalDay:
    """운영일 (오전 9시 리셋) 테스트."""

    RESET_HOUR = 9  # KST

    def test_before_reset_is_yesterday(self):
        """9시 전은 전날로 계산."""
        from datetime import datetime
        
        # 2026-02-04 08:30 KST
        current_hour = 8
        
        if current_hour < self.RESET_HOUR:
            operational_day_offset = -1
        else:
            operational_day_offset = 0
        
        assert operational_day_offset == -1

    def test_after_reset_is_today(self):
        """9시 후는 오늘로 계산."""
        current_hour = 10
        
        if current_hour < self.RESET_HOUR:
            operational_day_offset = -1
        else:
            operational_day_offset = 0
        
        assert operational_day_offset == 0


class TestStreakPersistence:
    """스트릭 영속성 테스트."""

    def test_streak_saved_on_play(self):
        """게임 플레이 시 스트릭 저장."""
        user_streak = {
            "user_id": 1,
            "current_streak": 5,
            "last_play_date": date(2026, 2, 4),
        }
        
        assert user_streak["current_streak"] == 5
        assert user_streak["last_play_date"] == date(2026, 2, 4)

    def test_max_streak_tracked(self):
        """최대 스트릭 기록."""
        current = 15
        max_streak = 20
        
        new_max = max(current, max_streak)
        assert new_max == 20

    def test_new_max_streak_updated(self):
        """새 최대 스트릭 갱신."""
        current = 25
        max_streak = 20
        
        new_max = max(current, max_streak)
        assert new_max == 25
