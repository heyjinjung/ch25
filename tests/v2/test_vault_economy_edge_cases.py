"""금고/경제 영역 엣지케이스 + 통합 시나리오 테스트.

목표:
- 운영일(KST 09:00) 리셋 로직 커버
- 출금 최소금액 티어(승인 횟수 기반) 커버
- request_withdrawal 통합 시나리오(NEW 세그먼트) 커버

주의:
- request_withdrawal 내부에서 datetime.now(timezone.utc)를 사용하므로 테스트에서 시간 고정이 필요하다.
"""

from __future__ import annotations

from datetime import date, datetime, timedelta, timezone
from zoneinfo import ZoneInfo

import pytest
from fastapi import HTTPException

from app.v2.models import (
    ExternalRankingDailyDepositDelta,
    V2DiceConfig,
    V2DiceLog,
    V2User,
    V2UserSegment,
    VaultWithdrawalRequest,
)
from app.v2.services.vault_service import V2VaultService


@pytest.fixture()
def vault_service() -> V2VaultService:
    return V2VaultService()


def _create_user(
    db,
    *,
    cc_id: str,
    vault_locked_balance: int = 0,
    vault_spent_today: int = 0,
    vault_spent_reset_date: str | None = None,
) -> V2User:
    user = V2User(
        cc_id=cc_id,
        nickname=cc_id,
        vault_locked_balance=vault_locked_balance,
        vault_spent_today=vault_spent_today,
        vault_spent_reset_date=vault_spent_reset_date,
        created_at=datetime.now(timezone.utc) - timedelta(days=30),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def _freeze_vault_service_now(monkeypatch: pytest.MonkeyPatch, fixed_now_utc: datetime) -> None:
    """vault_service 모듈의 datetime.now()를 고정한다."""
    import app.v2.services.vault_service as vault_service_module

    if fixed_now_utc.tzinfo is None:
        raise ValueError("fixed_now_utc must be timezone-aware")

    class FrozenDateTime(datetime):
        @classmethod
        def now(cls, tz=None):
            if tz is None:
                return fixed_now_utc.replace(tzinfo=None)
            return fixed_now_utc.astimezone(tz)

        @classmethod
        def utcnow(cls):
            return fixed_now_utc.astimezone(timezone.utc).replace(tzinfo=None)

    monkeypatch.setattr(vault_service_module, "datetime", FrozenDateTime)


class TestOperationalDayReset:
    def test_operational_date_boundary_before_reset_is_previous_day(self):
        kst = ZoneInfo("Asia/Seoul")
        # 08:59 KST는 리셋(09:00) 이전이므로 운영일은 전일
        now_kst = datetime(2026, 2, 4, 8, 59, 0, tzinfo=kst)
        op_date = V2VaultService._operational_date_kst(now_kst)
        assert op_date == date(2026, 2, 3)

    def test_operational_date_boundary_at_reset_is_today(self):
        kst = ZoneInfo("Asia/Seoul")
        now_kst = datetime(2026, 2, 4, 9, 0, 0, tzinfo=kst)
        op_date = V2VaultService._operational_date_kst(now_kst)
        assert op_date == date(2026, 2, 4)

    def test_consume_locked_for_spend_resets_spent_today_on_new_op_day(self, db, vault_service: V2VaultService):
        # Given: 전일 reset_date로 고정 + spent_today가 남아있는 상태
        user = _create_user(
            db,
            cc_id="spent_reset_user",
            vault_locked_balance=50_000,
            vault_spent_today=9_999,
            vault_spent_reset_date="2026-02-03",
        )

        # When: 2026-02-04 10:00 KST(=01:00 UTC) 시점에 소비 발생
        now_utc = datetime(2026, 2, 4, 1, 0, 0, tzinfo=timezone.utc)
        remaining = V2VaultService.consume_locked_for_spend(db, user.id, 1_000, now=now_utc)
        db.commit()

        # Then: 운영일이 바뀌었으므로 spent_today는 리셋 후 +1000
        refreshed = db.get(V2User, user.id)
        assert remaining == 49_000
        assert refreshed.vault_spent_today == 1_000
        assert refreshed.vault_spent_reset_date == "2026-02-04"


class TestVaultInfoEconomyFields:
    def test_get_vault_info_minimum_withdrawal_amount_tiers(self, db, vault_service: V2VaultService):
        user = _create_user(db, cc_id="tier_user", vault_locked_balance=0)

        # 0회 승인 → 10,000
        info0 = vault_service.get_vault_info(db, user.id)
        assert info0["minimum_withdrawal_amount"] == 10_000

        # 2회 승인 → 30,000
        db.add(VaultWithdrawalRequest(user_id=user.id, amount=10_000, status="APPROVED"))
        db.add(VaultWithdrawalRequest(user_id=user.id, amount=10_000, status="APPROVED"))
        db.commit()

        info2 = vault_service.get_vault_info(db, user.id)
        assert info2["minimum_withdrawal_amount"] == 30_000

        # 3회 이상 승인 → 50,000
        db.add(VaultWithdrawalRequest(user_id=user.id, amount=10_000, status="APPROVED"))
        db.add(VaultWithdrawalRequest(user_id=user.id, amount=10_000, status="APPROVED"))
        db.commit()

        info4 = vault_service.get_vault_info(db, user.id)
        assert info4["minimum_withdrawal_amount"] == 50_000


class TestWithdrawalIntegrationNewSegment:
    def _seed_new_segment_user_with_plays(self, db, *, locked_balance: int = 50_000) -> V2User:
        user = _create_user(db, cc_id="new_withdraw_user", vault_locked_balance=locked_balance)
        db.add(V2UserSegment(user_id=user.id, segment="NEW"))
        db.commit()

        cfg = V2DiceConfig(name="withdraw_test_cfg", ticket_type="DICE_TICKET")
        db.add(cfg)
        db.commit()
        db.refresh(cfg)

        # request_withdrawal은 최근 3일 play count를 본다. created_at을 최근으로 강제.
        now_utc = datetime(2026, 2, 4, 0, 30, 0, tzinfo=timezone.utc)
        for _ in range(5):
            db.add(
                V2DiceLog(
                    user_id=user.id,
                    config_id=cfg.id,
                    user_dice_1=1,
                    user_dice_2=1,
                    user_sum=2,
                    dealer_dice_1=2,
                    dealer_dice_2=2,
                    dealer_sum=4,
                    result="LOSE",
                    created_at=now_utc.replace(tzinfo=None),
                )
            )
        db.commit()
        return user

    def test_request_withdrawal_success_creates_pending_and_affects_available(self, db, vault_service: V2VaultService, monkeypatch: pytest.MonkeyPatch):
        user = self._seed_new_segment_user_with_plays(db, locked_balance=50_000)

        fixed_now_utc = datetime(2026, 2, 4, 0, 30, 0, tzinfo=timezone.utc)
        _freeze_vault_service_now(monkeypatch, fixed_now_utc)

        # When
        result = vault_service.request_withdrawal(db, user.id, 10_000)

        # Then
        assert result["status"] == "PENDING"
        assert result["amount"] == 10_000
        assert result["balance_after"] == 40_000

        info = vault_service.get_vault_info(db, user.id, now=fixed_now_utc)
        # Strict Vault Policy SoT: vaultBalance(표시/총액)는 lockedBalance와 동일하며 합산 금지
        assert info["vaultBalance"] == 50_000
        assert info["lockedBalance"] == 50_000
        # PENDING 출금 예약금은 locked를 깎지 않고, 출금가능액(available)만 줄어든다.
        assert info["availableBalance"] == 40_000

    def test_request_withdrawal_rejects_when_pending_exists(self, db, vault_service: V2VaultService, monkeypatch: pytest.MonkeyPatch):
        user = self._seed_new_segment_user_with_plays(db, locked_balance=50_000)

        fixed_now_utc = datetime(2026, 2, 4, 0, 30, 0, tzinfo=timezone.utc)
        _freeze_vault_service_now(monkeypatch, fixed_now_utc)

        vault_service.request_withdrawal(db, user.id, 10_000)

        with pytest.raises(HTTPException) as excinfo:
            vault_service.request_withdrawal(db, user.id, 10_000)
        assert excinfo.value.status_code == 409
        assert excinfo.value.detail == "WITHDRAWAL_REQUEST_ALREADY_PENDING"

    def test_request_withdrawal_rejects_when_insufficient_funds(self, db, vault_service: V2VaultService, monkeypatch: pytest.MonkeyPatch):
        user = self._seed_new_segment_user_with_plays(db, locked_balance=5_000)

        fixed_now_utc = datetime(2026, 2, 4, 0, 30, 0, tzinfo=timezone.utc)
        _freeze_vault_service_now(monkeypatch, fixed_now_utc)

        with pytest.raises(HTTPException) as excinfo:
            vault_service.request_withdrawal(db, user.id, 10_000)
        assert excinfo.value.status_code == 400
        assert excinfo.value.detail == "INSUFFICIENT_FUNDS"

    def test_request_withdrawal_rejects_when_tier_minimum_not_met(self, db, vault_service: V2VaultService, monkeypatch: pytest.MonkeyPatch):
        user = self._seed_new_segment_user_with_plays(db, locked_balance=100_000)

        # 승인 2회 → required_min_balance = 30,000
        db.add(VaultWithdrawalRequest(user_id=user.id, amount=10_000, status="APPROVED"))
        db.add(VaultWithdrawalRequest(user_id=user.id, amount=10_000, status="APPROVED"))
        db.commit()

        fixed_now_utc = datetime(2026, 2, 4, 0, 30, 0, tzinfo=timezone.utc)
        _freeze_vault_service_now(monkeypatch, fixed_now_utc)

        with pytest.raises(HTTPException) as excinfo:
            vault_service.request_withdrawal(db, user.id, 10_000)

        assert excinfo.value.status_code == 400
        assert excinfo.value.detail == "MIN_WITHDRAWAL_AMOUNT_30000"


class TestDeposit7dEconomy:
    def test_deposit_7d_changes_play_target_threshold_branch(self, db, vault_service: V2VaultService, monkeypatch: pytest.MonkeyPatch):
        """세그먼트가 없고 최근 7일 입금이 50만원 이상이면 COMMON 기준(play 15/spend 5000)으로 분기한다.

        이 테스트는 분기 자체가 실행되는지(에러 코드)가 바뀌는지를 확인한다.
        """
        user = _create_user(db, cc_id="deposit7d_user", vault_locked_balance=100_000, vault_spent_today=0)

        fixed_now_utc = datetime(2026, 2, 6, 0, 30, 0, tzinfo=timezone.utc)
        _freeze_vault_service_now(monkeypatch, fixed_now_utc)

        # 최근 7일 입금을 50만원 이상으로 맞춤 (kst_date는 UTC date 기준으로도 범위에 포함되도록 단순히 오늘로 둠)
        db.add(ExternalRankingDailyDepositDelta(user_id=user.id, deposit_delta=500_000, kst_date=fixed_now_utc.date()))
        db.commit()

        # play 로그를 심지 않았으므로, COMMON 분기라면 PLAY_COUNT_INSUFFICIENT_15가 먼저 떠야 한다.
        with pytest.raises(HTTPException) as excinfo:
            vault_service.request_withdrawal(db, user.id, 10_000)

        assert excinfo.value.status_code == 403
        assert excinfo.value.detail == "PLAY_COUNT_INSUFFICIENT_15"
