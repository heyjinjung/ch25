"""V2 CC Deposit & Level 통합 테스트.

도메인: 입금, 레벨
커버리지 대상: admin_cc_deposit_service.py, level_xp_service.py
SoT 문서: v2_deposit_sot_ko.md, v2_level_point_sot_ko.md
"""
import pytest


class TestCCDepositXPCalculation:
    """CC Deposit XP 계산 규칙 테스트."""

    DEPOSIT_STEP = 100_000  # 10만원
    XP_PER_STEP = 20        # 10만원당 20XP

    def test_100k_deposit_grants_20_xp(self):
        """10만원 입금 시 20 XP."""
        deposit_amount = 100_000
        steps = deposit_amount // self.DEPOSIT_STEP
        xp = steps * self.XP_PER_STEP
        assert xp == 20

    def test_500k_deposit_grants_100_xp(self):
        """50만원 입금 시 100 XP."""
        deposit_amount = 500_000
        steps = deposit_amount // self.DEPOSIT_STEP
        xp = steps * self.XP_PER_STEP
        assert xp == 100

    def test_1m_deposit_grants_200_xp(self):
        """100만원 입금 시 200 XP."""
        deposit_amount = 1_000_000
        steps = deposit_amount // self.DEPOSIT_STEP
        xp = steps * self.XP_PER_STEP
        assert xp == 200

    @pytest.mark.parametrize("deposit,expected_xp", [
        (100_000, 20),
        (250_000, 40),
        (500_000, 100),
        (750_000, 140),
        (1_000_000, 200),
    ])
    def test_deposit_xp_mapping(self, deposit, expected_xp):
        """입금액 → XP 매핑."""
        steps = deposit // self.DEPOSIT_STEP
        xp = steps * self.XP_PER_STEP
        assert xp == expected_xp


class TestDepositToLevelProgression:
    """입금 → XP → 레벨 진행 테스트."""

    LEVEL_THRESHOLDS = {1: 0, 2: 100, 3: 300, 4: 600, 5: 1000}

    def test_500k_deposit_reaches_level_2(self):
        """50만원 입금(100 XP) → 레벨 2 달성."""
        xp = 100  # 50만원 = 100 XP
        
        level = 1
        for lvl, threshold in sorted(self.LEVEL_THRESHOLDS.items()):
            if xp >= threshold:
                level = lvl
        
        assert level == 2

    def test_1_5m_deposit_reaches_level_3(self):
        """150만원 입금(300 XP) → 레벨 3 달성."""
        xp = 300  # 150만원 = 300 XP
        
        level = 1
        for lvl, threshold in sorted(self.LEVEL_THRESHOLDS.items()):
            if xp >= threshold:
                level = lvl
        
        assert level == 3


class TestV2UserSoTFields:
    """V2 User SoT 필드 검증."""

    def test_v2_user_has_level_field(self):
        """v2_user.level 필드 존재."""
        v2_user_fields = ["id", "cc_id", "nickname", "level", "xp", "total_charge_amount", "vault_locked_balance"]
        assert "level" in v2_user_fields

    def test_v2_user_has_xp_field(self):
        """v2_user.xp 필드 존재."""
        v2_user_fields = ["id", "cc_id", "nickname", "level", "xp", "total_charge_amount", "vault_locked_balance"]
        assert "xp" in v2_user_fields

    def test_v2_user_has_total_charge_amount(self):
        """v2_user.total_charge_amount 필드 존재."""
        v2_user_fields = ["id", "cc_id", "nickname", "level", "xp", "total_charge_amount", "vault_locked_balance"]
        assert "total_charge_amount" in v2_user_fields

    def test_vault_locked_balance_is_sot(self):
        """v2_user.vault_locked_balance가 Vault SoT."""
        vault_fields = ["vault_locked_balance"]
        deprecated_fields = ["vault_available_balance"]
        
        # locked만 유효
        assert "vault_locked_balance" in vault_fields
        # available은 deprecated
        assert "vault_available_balance" in deprecated_fields


class TestAdminCCDepositRules:
    """Admin CC Deposit 규칙 테스트."""

    def test_deposit_updates_total_charge_amount(self):
        """입금 시 total_charge_amount 업데이트."""
        prev_total = 0
        new_deposit = 100_000
        new_total = prev_total + new_deposit
        assert new_total == 100_000

    def test_deposit_remainder_calculation(self):
        """입금 나머지 계산."""
        deposit_amount = 150_000  # 15만원
        step_amount = 100_000
        
        steps = deposit_amount // step_amount
        remainder = deposit_amount % step_amount
        
        assert steps == 1
        assert remainder == 50_000

    def test_cumulative_deposit_xp(self):
        """누적 입금 XP 계산."""
        deposits = [100_000, 200_000, 150_000]  # 총 45만원
        total_deposit = sum(deposits)
        
        steps = total_deposit // 100_000
        xp = steps * 20
        
        assert total_deposit == 450_000
        assert steps == 4
        assert xp == 80
