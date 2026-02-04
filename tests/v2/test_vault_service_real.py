"""V2 Vault 서비스 실동작 테스트.

도메인: 금고 서비스
커버리지 대상: vault_service.py
"""
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo

import pytest

from app.v2.models import V2User, ExternalRankingDailyDepositDelta
from app.v2.services.vault_service import V2VaultService


@pytest.fixture()
def no_circuit_breaker(monkeypatch):
    from app.v2.services.circuit_breaker_service import CircuitBreakerService

    monkeypatch.setattr(CircuitBreakerService, "check_and_incr", lambda *args, **kwargs: None)


def _create_user(db, *, cc_id: str, vault_locked_balance: int = 0, created_at=None) -> V2User:
    user = V2User(
        cc_id=cc_id,
        nickname="Vault User",
        vault_locked_balance=vault_locked_balance,
        created_at=created_at,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


class TestVaultServiceDeposit:
    def test_deposit_increases_balance(self, db, no_circuit_breaker):
        user = _create_user(db, cc_id="vault_user_1", vault_locked_balance=1000)

        new_balance = V2VaultService.deposit(db, user.id, 5000, reason="TEST_DEPOSIT")
        db.commit()

        refreshed = db.get(V2User, user.id)
        assert new_balance == 6000
        assert refreshed.vault_locked_balance == 6000

    def test_deposit_cap_for_suspended_user(self, db, no_circuit_breaker):
        created_at = datetime.now(timezone.utc) - timedelta(days=8)
        user = _create_user(db, cc_id="vault_user_2", vault_locked_balance=29000, created_at=created_at)

        new_balance = V2VaultService.deposit(db, user.id, 2000, reason="TEST_DEPOSIT")
        db.commit()

        refreshed = db.get(V2User, user.id)
        assert new_balance == 30000
        assert refreshed.vault_locked_balance == 30000


class TestVaultServiceSpend:
    def test_consume_locked_for_spend(self, db, no_circuit_breaker):
        user = _create_user(db, cc_id="vault_user_3", vault_locked_balance=10000)

        remaining = V2VaultService.consume_locked_for_spend(db, user.id, 3000)
        db.commit()

        refreshed = db.get(V2User, user.id)
        assert remaining == 7000
        assert refreshed.vault_locked_balance == 7000
        assert refreshed.vault_spent_total == 3000
        assert refreshed.vault_spent_today == 3000


class TestVaultServiceSuspension:
    def test_new_user_not_suspended(self, db, no_circuit_breaker):
        user = _create_user(db, cc_id="vault_user_4")

        is_suspended, deposit_7d = V2VaultService.is_benefits_suspended(db, user.id)
        assert is_suspended is False
        assert deposit_7d == 0

    def test_recent_deposit_not_suspended(self, db, no_circuit_breaker):
        created_at = datetime.now(timezone.utc) - timedelta(days=10)
        user = _create_user(db, cc_id="vault_user_5", created_at=created_at)

        tz = ZoneInfo("Asia/Seoul")
        kst_today = datetime.now(tz).date()
        db.add(
            ExternalRankingDailyDepositDelta(
                user_id=user.id,
                kst_date=kst_today,
                deposit_delta=5000,
            )
        )
        db.commit()

        is_suspended, deposit_7d = V2VaultService.is_benefits_suspended(db, user.id)
        assert is_suspended is False
        assert deposit_7d == 5000

    def test_get_locked_balance(self, db, no_circuit_breaker):
        user = _create_user(db, cc_id="vault_user_6", vault_locked_balance=12345)

        balance = V2VaultService.get_locked_balance(db, user.id)
        assert balance == 12345
