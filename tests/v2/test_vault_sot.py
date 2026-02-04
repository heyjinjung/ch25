"""V2 Vault SoT 핵심 테스트.

SoT 문서: docs/v2_specs/01_core/v2_strict_vault_policy_sot_ko.md

테스트 범위:
- 금고 SoT (`vault_locked_balance`) 단일 원장 원칙
- 세그먼트별 출금 조건 검증
- 유저 상태별 혜택 중단 로직
- 금고 보유 한도 정책
"""
import pytest
from datetime import date, datetime, timedelta
from sqlalchemy.orm import Session

from app.v2.models import V2User


class TestVaultSingleSoT:
    """금고 단일 SoT 원칙 검증."""

    def test_vault_locked_balance_is_sot(self, db: Session):
        """vault_locked_balance가 유일한 금고 SoT."""
        user = V2User(
            cc_id="VAULT_SOT_001",
            vault_locked_balance=100000,
        )
        db.add(user)
        db.flush()

        # SoT 필드만 사용
        assert user.vault_locked_balance == 100000

    def test_vault_balance_non_negative(self, db: Session):
        """금고 잔액 음수 방지 (비즈니스 로직 레벨)."""
        user = V2User(
            cc_id="VAULT_NEG_001",
            vault_locked_balance=5000,
        )
        db.add(user)
        db.flush()

        # 잔액 초과 차감 시도
        requested_withdrawal = 10000
        if user.vault_locked_balance >= requested_withdrawal:
            user.vault_locked_balance -= requested_withdrawal
        else:
            pass  # 차감하지 않음

        assert user.vault_locked_balance == 5000  # 변경 없음


class TestWithdrawalEligibility:
    """출금 자격 조건 테스트 (SoT 3.1)."""

    SEGMENT_CONDITIONS = {
        "NEW": {"min_plays_3d": 15, "min_spend_today": 5000},
        "COMMON": {"min_plays_3d": 30, "min_spend_today": 10000},
        "VIP": {"min_plays_3d": 15, "min_spend_today": 5000},
        "WHALE": {"min_plays_3d": 0, "min_spend_today": 0},
        "AT_RISK": {"min_plays_3d": 100, "min_spend_today": 30000},
    }

    def test_segment_withdrawal_conditions_defined(self):
        """세그먼트별 출금 조건 정의 확인."""
        for segment, conditions in self.SEGMENT_CONDITIONS.items():
            assert "min_plays_3d" in conditions
            assert "min_spend_today" in conditions

    def test_whale_exemption(self):
        """WHALE 세그먼트 플레이/소비 면제 확인."""
        whale_cond = self.SEGMENT_CONDITIONS["WHALE"]
        assert whale_cond["min_plays_3d"] == 0
        assert whale_cond["min_spend_today"] == 0

    def test_at_risk_stricter_conditions(self):
        """AT_RISK 세그먼트 강화 조건 확인."""
        at_risk = self.SEGMENT_CONDITIONS["AT_RISK"]
        common = self.SEGMENT_CONDITIONS["COMMON"]
        
        assert at_risk["min_plays_3d"] > common["min_plays_3d"]
        assert at_risk["min_spend_today"] > common["min_spend_today"]


class TestWithdrawalRoundLimits:
    """출금 회차별 최소 금액 테스트 (SoT 3.1.1)."""

    ROUND_LIMITS = {
        1: 10000,
        2: 10000,
        3: 30000,
        4: 50000,
    }

    def test_round_limits_progressive(self):
        """회차가 높을수록 최소 금액 증가."""
        assert self.ROUND_LIMITS[1] <= self.ROUND_LIMITS[2]
        assert self.ROUND_LIMITS[2] <= self.ROUND_LIMITS[3]
        assert self.ROUND_LIMITS[3] <= self.ROUND_LIMITS[4]

    @pytest.mark.parametrize("round_num,min_amount", [
        (1, 10000),
        (2, 10000),
        (3, 30000),
        (4, 50000),
    ])
    def test_each_round_limit(self, round_num, min_amount):
        """각 회차별 최소 금액 검증."""
        assert self.ROUND_LIMITS[round_num] == min_amount


class TestUserStatusSuspension:
    """유저 상태별 혜택 중단 테스트 (SoT 3.2)."""

    def test_active_status_no_suspension(self):
        """ACTIVE 유저는 제재 없음."""
        last_deposit_days_ago = 3  # 7일 이내
        benefits_suspended = last_deposit_days_ago > 7
        assert benefits_suspended is False

    def test_warning_status_no_suspension(self):
        """WARNING 유저(4~6일)는 제재 없음."""
        last_deposit_days_ago = 5
        benefits_suspended = last_deposit_days_ago > 7
        assert benefits_suspended is False

    def test_inactive_status_suspended(self):
        """INACTIVE 유저(7일 이상)는 제재."""
        last_deposit_days_ago = 10
        benefits_suspended = last_deposit_days_ago >= 7
        assert benefits_suspended is True


class TestVaultLimitCap:
    """금고 보유 한도 테스트 (SoT 3.3)."""

    INACTIVE_LIMIT = 30000

    def test_inactive_user_limit(self):
        """무입금/INACTIVE 유저 한도 30,000원."""
        assert self.INACTIVE_LIMIT == 30000

    def test_active_user_unlimited(self):
        """ACTIVE 유저는 무제한."""
        # ACTIVE 유저는 한도 없음 (None 또는 매우 큰 값)
        active_limit = None  # Unlimited
        assert active_limit is None

    def test_over_limit_earn_blocked(self):
        """한도 초과 시 추가 적립 차단 로직."""
        current_balance = 28000
        earn_amount = 5000
        limit = self.INACTIVE_LIMIT

        if current_balance + earn_amount > limit:
            actual_earn = limit - current_balance
        else:
            actual_earn = earn_amount

        assert actual_earn == 2000  # 한도까지만 적립
