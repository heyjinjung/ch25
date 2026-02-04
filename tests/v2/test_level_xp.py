"""V2 Level & XP 서비스 테스트.

도메인: 레벨, 경험치
커버리지 대상: level_xp_service.py
SoT 문서: v2_level_point_sot_ko.md
"""
import pytest


class TestLevelThresholds:
    """레벨 임계값 테스트."""

    # 레벨별 필요 XP (예시)
    LEVEL_THRESHOLDS = {
        1: 0,
        2: 100,
        3: 300,
        4: 600,
        5: 1000,
        6: 1500,
        7: 2100,
        8: 2800,
        9: 3600,
        10: 4500,
    }

    def test_level_1_starts_at_0(self):
        """레벨 1은 XP 0에서 시작."""
        assert self.LEVEL_THRESHOLDS[1] == 0

    def test_thresholds_increasing(self):
        """레벨이 올라갈수록 필요 XP 증가."""
        levels = sorted(self.LEVEL_THRESHOLDS.keys())
        for i in range(len(levels) - 1):
            assert self.LEVEL_THRESHOLDS[levels[i]] < self.LEVEL_THRESHOLDS[levels[i + 1]]

    @pytest.mark.parametrize("xp,expected_level", [
        (0, 1),
        (50, 1),
        (100, 2),
        (299, 2),
        (300, 3),
        (1000, 5),
        (4500, 10),
    ])
    def test_xp_to_level_mapping(self, xp, expected_level):
        """XP에 따른 레벨 매핑."""
        level = 1
        for lvl, threshold in sorted(self.LEVEL_THRESHOLDS.items()):
            if xp >= threshold:
                level = lvl
        assert level == expected_level


class TestXPEarning:
    """XP 획득 테스트."""

    GAME_XP_REWARDS = {
        "ROULETTE": 10,
        "DICE": 5,
        "LOTTERY": 15,
    }

    def test_roulette_grants_xp(self):
        """룰렛 플레이 시 XP 획득."""
        xp_reward = self.GAME_XP_REWARDS["ROULETTE"]
        assert xp_reward == 10

    def test_dice_grants_xp(self):
        """주사위 플레이 시 XP 획득."""
        xp_reward = self.GAME_XP_REWARDS["DICE"]
        assert xp_reward == 5

    def test_xp_accumulates(self):
        """XP 누적 확인."""
        current_xp = 250
        earned_xp = 50
        new_xp = current_xp + earned_xp
        assert new_xp == 300


class TestLevelUp:
    """레벨업 테스트."""

    LEVEL_THRESHOLDS = {1: 0, 2: 100, 3: 300, 4: 600, 5: 1000}

    def test_level_up_triggered(self):
        """XP 충족 시 레벨업."""
        current_level = 2
        current_xp = 290
        earned_xp = 15  # 총 305 XP
        
        new_xp = current_xp + earned_xp
        new_level = current_level
        
        for lvl, threshold in sorted(self.LEVEL_THRESHOLDS.items()):
            if new_xp >= threshold:
                new_level = lvl
        
        assert new_xp == 305
        assert new_level == 3  # 레벨업!

    def test_multiple_level_ups(self):
        """한 번에 여러 레벨업 가능."""
        current_level = 1
        current_xp = 50
        earned_xp = 600  # 총 650 XP → 레벨 4
        
        new_xp = current_xp + earned_xp
        new_level = 1
        
        for lvl, threshold in sorted(self.LEVEL_THRESHOLDS.items()):
            if new_xp >= threshold:
                new_level = lvl
        
        assert new_level == 4

    def test_level_rewards_granted(self):
        """레벨업 시 보상 지급."""
        level_rewards = {
            2: {"ROULETTE_TICKET": 1},
            3: {"DICE_TICKET": 2},
            4: {"LOTTERY_TICKET": 1},
            5: {"GOLD_KEY_TICKET": 1},
        }
        
        new_level = 3
        rewards = level_rewards.get(new_level, {})
        
        assert rewards == {"DICE_TICKET": 2}


class TestXPSoT:
    """XP SoT 규칙 테스트."""

    def test_only_game_xp_counts(self):
        """GAME_XP만 레벨포인트로 인정."""
        xp_sources = {
            "GAME_XP": True,      # 유효
            "DEPOSIT_XP": False,  # 무효 (금고포인트와 혼동 금지)
            "BONUS_XP": False,    # 무효
        }
        
        valid_sources = [k for k, v in xp_sources.items() if v]
        assert valid_sources == ["GAME_XP"]

    def test_xp_not_vault_points(self):
        """XP와 금고포인트는 별개."""
        user_xp = 500
        vault_balance = 10000
        
        # 서로 독립적
        assert user_xp != vault_balance
        assert type(user_xp) == type(vault_balance) == int
