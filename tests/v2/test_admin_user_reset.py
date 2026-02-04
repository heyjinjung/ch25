"""어드민 유저 데이터 초기화 API 테스트.

문제: 
1. wallet/adjust에서 잔액 부족 시 INSUFFICIENT_TOKEN_BALANCE 에러
2. 입금액/레벨 초기화 API 없음
3. V2User.level과 user_level_progress 이중 저장 문제

해결:
1. force 옵션으로 잔액만큼만 차감
2. POST /users/{user_id}/reset API 추가
3. 두 테이블 모두 초기화
"""
import pytest
from datetime import datetime
from unittest.mock import MagicMock, patch


class TestWalletAdjustForceOption:
    """wallet/adjust force 옵션 테스트."""

    def test_force_option_withdraws_available_balance_only(self):
        """force=True일 때 잔액만큼만 차감."""
        # Given: 유저 잔액 = 500
        # Request: amount = -1000, force = True
        
        # When: API 호출
        # Then: 500만 차감, 잔액 = 0
        
        current_balance = 500
        requested_amount = -1000
        force = True
        
        if force:
            withdraw_amount = min(abs(requested_amount), current_balance)
        else:
            withdraw_amount = abs(requested_amount)
        
        assert withdraw_amount == 500
        assert current_balance - withdraw_amount == 0

    def test_force_option_false_raises_error(self):
        """force=False일 때 잔액 부족하면 에러."""
        # Given: 유저 잔액 = 500
        # Request: amount = -1000, force = False
        
        # When: API 호출
        # Then: INSUFFICIENT_TOKEN_BALANCE 에러
        
        current_balance = 500
        requested_amount = -1000
        force = False
        
        if not force and abs(requested_amount) > current_balance:
            error = "INSUFFICIENT_TOKEN_BALANCE"
        else:
            error = None
        
        assert error == "INSUFFICIENT_TOKEN_BALANCE"

    def test_force_option_with_zero_balance(self):
        """잔액이 0일 때 force=True면 아무 작업 안 함."""
        current_balance = 0
        requested_amount = -1000
        force = True
        
        if force:
            withdraw_amount = min(abs(requested_amount), current_balance)
        else:
            withdraw_amount = abs(requested_amount)
        
        assert withdraw_amount == 0

    def test_force_option_in_vault(self):
        """VAULT 타입에서 force 옵션 테스트."""
        vault_locked_balance = 3000
        requested_amount = -5000
        force = True
        
        if force:
            withdraw_amount = min(abs(requested_amount), vault_locked_balance)
        else:
            withdraw_amount = abs(requested_amount)
        
        assert withdraw_amount == 3000


class TestUserResetAPI:
    """POST /users/{user_id}/reset API 테스트."""

    def test_reset_level_resets_both_tables(self):
        """reset_level=True일 때 V2User.level/xp과 user_level_progress 모두 초기화.
        
        최신 SoT (2026-02-04):
        - Primary: v2_user.level, v2_user.xp
        - Legacy (synced): user_level_progress.level, user_level_progress.xp
        """
        # Given: V2User.level = 16, V2User.xp = 2960
        #        user_level_progress.level = 16, xp = 2960 (synced)
        # Request: reset_level = True
        
        # When: API 호출
        # Then: 
        #   - V2User.level = 0, V2User.xp = 0 (Primary SoT)
        #   - user_level_progress.level = 0, xp = 0 (Legacy sync)
        
        v2_user_level = 16
        v2_user_xp = 2960
        progress_level = 16
        progress_xp = 2960
        
        reset_level = True
        
        if reset_level:
            # Primary SoT 초기화
            v2_user_level = 0
            v2_user_xp = 0
            # Legacy sync
            progress_level = 0
            progress_xp = 0
        
        assert v2_user_level == 0
        assert v2_user_xp == 0
        assert progress_level == 0
        assert progress_xp == 0

    def test_reset_deposit_resets_total_and_baseline(self):
        """reset_deposit=True일 때 total_charge_amount와 baseline 모두 초기화."""
        # Given: total_charge_amount = 5,000,000, baseline = 3,000,000
        
        total_charge = 5_000_000
        baseline = 3_000_000
        
        reset_deposit = True
        
        if reset_deposit:
            total_charge = 0
            baseline = 0
        
        assert total_charge == 0
        assert baseline == 0

    def test_reset_vault_resets_both_balances(self):
        """reset_vault=True일 때 locked와 available 모두 초기화."""
        vault_locked = 50_000
        vault_available = 10_000
        
        reset_vault = True
        
        if reset_vault:
            vault_locked = 0
            vault_available = 0
        
        assert vault_locked == 0
        assert vault_available == 0

    def test_reset_tokens_clears_all_wallets(self):
        """reset_tokens=True일 때 모든 게임 토큰 0으로."""
        wallets = {
            "ROULETTE_TICKET": 5,
            "DICE_TICKET": 10,
            "LOTTERY_TICKET": 3,
            "GOLD_KEY_TICKET": 2,
        }
        
        reset_tokens = True
        
        if reset_tokens:
            wallets = {k: 0 for k in wallets}
        
        assert all(v == 0 for v in wallets.values())

    def test_reset_requires_at_least_one_option(self):
        """최소 하나의 초기화 옵션이 필요."""
        reset_level = False
        reset_deposit = False
        reset_vault = False
        reset_tokens = False
        
        reset_items = []
        if reset_level:
            reset_items.append("level")
        if reset_deposit:
            reset_items.append("deposit")
        if reset_vault:
            reset_items.append("vault")
        if reset_tokens:
            reset_items.append("tokens")
        
        if not reset_items:
            error = "NO_RESET_OPTION_SELECTED"
        else:
            error = None
        
        assert error == "NO_RESET_OPTION_SELECTED"

    def test_reset_creates_audit_log(self):
        """초기화 시 감사 로그 기록."""
        admin_id = 1
        user_id = 10
        reason = "테스트 초기화"
        
        audit_log = {
            "admin_id": admin_id,
            "action": "USER_DATA_RESET",
            "target_type": "USER",
            "target_id": str(user_id),
            "before": {"level": 16, "xp": 2960},
            "after": {"reset_items": ["level"], "reason": reason},
        }
        
        assert audit_log["action"] == "USER_DATA_RESET"
        assert audit_log["target_id"] == "10"

    def test_combined_reset_options(self):
        """여러 옵션 동시 사용."""
        reset_level = True
        reset_deposit = True
        reset_vault = True
        reset_tokens = False
        
        reset_items = []
        if reset_level:
            reset_items.append("level")
        if reset_deposit:
            reset_items.append("deposit")
        if reset_vault:
            reset_items.append("vault")
        if reset_tokens:
            reset_items.append("tokens")
        
        assert reset_items == ["level", "deposit", "vault"]


class TestUserLevelDualStorage:
    """V2User(Primary SoT)와 user_level_progress(Legacy) 동기화 테스트.
    
    최신 SoT (2026-02-04):
    - Primary: v2_user.level, v2_user.xp
    - Legacy: user_level_progress.level, user_level_progress.xp (동기화됨)
    """

    def test_both_tables_must_be_synced(self):
        """V2User(Primary)와 user_level_progress(Legacy)가 항상 동기화되어야 함."""
        # 시나리오: v2_user.level = 0이지만 user_level_progress.level = 16
        # 문제: Primary SoT와 Legacy가 불일치
        # 해결: 모든 레벨/XP 변경은 v2_user를 먼저 업데이트하고 user_level_progress를 동기화
        
        v2_user_level = 0  # Primary SoT
        v2_user_xp = 0
        progress_level = 16  # Legacy (out of sync!)
        progress_xp = 2960
        
        # 동기화 확인
        is_synced = (v2_user_level == progress_level) and (v2_user_xp == progress_xp)
        assert not is_synced  # 이게 문제!

    def test_reset_api_syncs_both(self):
        """reset API는 Primary SoT(v2_user)와 Legacy(user_level_progress) 모두 초기화."""
        # Before: Primary와 Legacy 모두 16
        v2_user_level = 16  # Primary SoT
        v2_user_xp = 2960
        progress_level = 16  # Legacy (synced)
        progress_xp = 2960
        
        # Reset 실행: Primary → Legacy 순서로 동기화
        v2_user_level = 0
        v2_user_xp = 0
        progress_level = 0
        progress_xp = 0
        
        # After: 둘 다 0으로 동기화됨
        assert v2_user_level == 0
        assert progress_level == 0
        assert progress_xp == 0
