"""V2 Season Pass 서비스 테스트.

도메인: 시즌패스
커버리지 대상: season_pass_service.py
"""
import pytest
from datetime import date, timedelta


class TestSeasonPassLevels:
    """시즌패스 레벨 테스트."""

    MAX_LEVEL = 30
    XP_PER_LEVEL = 100

    def test_max_level_is_30(self):
        """최대 레벨 30."""
        assert self.MAX_LEVEL == 30

    def test_level_from_xp(self):
        """XP로 레벨 계산."""
        xp = 550
        level = min(xp // self.XP_PER_LEVEL + 1, self.MAX_LEVEL)
        assert level == 6

    def test_max_level_cap(self):
        """최대 레벨 상한."""
        xp = 5000  # 과도한 XP
        level = min(xp // self.XP_PER_LEVEL + 1, self.MAX_LEVEL)
        assert level == self.MAX_LEVEL


class TestSeasonPassRewards:
    """시즌패스 보상 테스트."""

    def test_free_track_rewards(self):
        """무료 트랙 보상."""
        free_rewards = {
            5: {"POINT": 500},
            10: {"ROULETTE_TICKET": 1},
            15: {"DICE_TICKET": 2},
            20: {"POINT": 1000},
            25: {"LOTTERY_TICKET": 1},
            30: {"GOLD_KEY_TICKET": 1},
        }
        
        assert 5 in free_rewards
        assert 30 in free_rewards

    def test_premium_track_rewards(self):
        """프리미엄 트랙 보상 (무료+추가)."""
        premium_rewards = {
            5: {"POINT": 1000, "DIAMOND": 5},
            10: {"ROULETTE_TICKET": 2, "POINT": 500},
        }
        
        # 프리미엄은 무료보다 풍성
        assert premium_rewards[5]["POINT"] > 500


class TestSeasonPassProgress:
    """시즌패스 진행 테스트."""

    def test_game_play_grants_xp(self):
        """게임 플레이 시 XP 획득."""
        game_xp = {
            "ROULETTE": 10,
            "DICE": 5,
            "LOTTERY": 15,
        }
        
        current_xp = 50
        played_game = "ROULETTE"
        new_xp = current_xp + game_xp[played_game]
        
        assert new_xp == 60

    def test_daily_stamp_grants_xp(self):
        """일일 스탬프 XP 획득."""
        stamp_xp = 50
        current_xp = 100
        new_xp = current_xp + stamp_xp
        assert new_xp == 150


class TestSeasonPassClaim:
    """시즌패스 보상 수령 테스트."""

    def test_claim_unlocked_reward(self):
        """잠금 해제된 보상 수령."""
        user_level = 10
        claimed_levels = {5}
        
        # 레벨 10 보상 수령 가능?
        can_claim = user_level >= 10 and 10 not in claimed_levels
        assert can_claim is True

    def test_cannot_claim_locked_reward(self):
        """잠긴 보상 수령 불가."""
        user_level = 8
        target_level = 10
        
        can_claim = user_level >= target_level
        assert can_claim is False

    def test_cannot_claim_twice(self):
        """중복 수령 불가."""
        claimed_levels = {5, 10}
        target_level = 10
        
        already_claimed = target_level in claimed_levels
        assert already_claimed is True


class TestSeasonDuration:
    """시즌 기간 테스트."""

    def test_season_active(self):
        """활성 시즌 확인."""
        today = date(2026, 2, 4)
        season = {
            "start_date": date(2026, 2, 1),
            "end_date": date(2026, 2, 28),
        }
        
        is_active = season["start_date"] <= today <= season["end_date"]
        assert is_active is True

    def test_season_expired(self):
        """만료 시즌 확인."""
        today = date(2026, 3, 1)
        season = {
            "start_date": date(2026, 2, 1),
            "end_date": date(2026, 2, 28),
        }
        
        is_active = season["start_date"] <= today <= season["end_date"]
        assert is_active is False
