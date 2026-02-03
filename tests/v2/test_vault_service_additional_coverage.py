"""Additional coverage for V2VaultService core methods."""
from __future__ import annotations

from datetime import datetime, timedelta, timezone

import pytest

from app.v2.models.user import V2User
from app.models.user import User as LegacyUser
from app.v2.models import ExternalRankingData, VaultLedger
from app.v2.models import VaultWithdrawalRequest
from app.v2.services.vault_service import V2VaultService


def create_v2_user(db, *, cc_id: str, locked_balance: int = 0) -> V2User:
    user = V2User(
        cc_id=cc_id,
        nickname="coverage_user",
        vault_locked_balance=locked_balance,
        vault_available_balance=0,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def create_legacy_user(db, *, user_id: int, external_id: str) -> LegacyUser:
    legacy = LegacyUser(
        id=user_id,
        external_id=external_id,
        nickname="legacy",
        vault_locked_balance=0,
        vault_balance=0,
    )
    db.add(legacy)
    db.commit()
    db.refresh(legacy)
    return legacy


def test_deposit_and_withdraw_updates_legacy_mirror(db, monkeypatch):
    user = create_v2_user(db, cc_id="COV001", locked_balance=0)
    create_legacy_user(db, user_id=user.id, external_id="COV001")

    # Circuit breaker no-op
    monkeypatch.setattr(
        "app.v2.services.circuit_breaker_service.CircuitBreakerService.check_and_incr",
        lambda *args, **kwargs: None,
    )

    svc = V2VaultService()
    balance = svc.deposit(db, user_id=user.id, amount=5000, reason="ADMIN", ref_type="SYSTEM")
    assert balance == 5000

    balance = svc.withdraw(db, user_id=user.id, amount=2000, reason="WITHDRAW", ref_type="SYSTEM")
    assert balance == 3000

    refreshed = db.get(V2User, user.id)
    legacy = db.get(LegacyUser, user.id)
    assert refreshed.vault_locked_balance == 3000
    assert legacy.vault_locked_balance == 3000


def test_consume_locked_for_spend_records_ledger(db):
    user = create_v2_user(db, cc_id="COV002", locked_balance=10000)

    now = datetime.now(timezone.utc)
    svc = V2VaultService()
    new_balance = svc.consume_locked_for_spend(db, v2_user_id=user.id, amount=3000, now=now)

    refreshed = db.get(V2User, user.id)
    assert new_balance == 7000
    assert refreshed.vault_spent_today == 3000

    ledger = db.query(VaultLedger).filter(VaultLedger.user_id == user.id).order_by(VaultLedger.id.desc()).first()
    assert ledger is not None
    assert ledger.amount == -3000
    assert ledger.ref_type == "SHOP"


def test_get_user_vault_policy_inactive_after_7d(db):
    user = create_v2_user(db, cc_id="COV003", locked_balance=0)
    # 가입 10일 전
    user.created_at = datetime.now(timezone.utc) - timedelta(days=10)

    db.add(
        ExternalRankingData(
            user_id=user.id,
            deposit_amount=1000,
            updated_at=datetime.now(timezone.utc) - timedelta(days=8),
        )
    )
    db.commit()

    policy = V2VaultService.get_user_vault_policy(db, user, now=datetime.now(timezone.utc))
    assert policy["status"] in ("INACTIVE", "WARNING", "ACTIVE")
    assert "benefits_suspended" in policy


def test_admin_stats_and_user_ledger(db):
    user = create_v2_user(db, cc_id="COV004", locked_balance=20000)
    now = datetime.now(timezone.utc)

    db.add(VaultWithdrawalRequest(user_id=user.id, amount=5000, status="PENDING"))
    db.add(VaultWithdrawalRequest(user_id=user.id, amount=3000, status="APPROVED", processed_at=now))
    db.add(VaultWithdrawalRequest(user_id=user.id, amount=1000, status="REJECTED", processed_at=now))
    db.add(VaultLedger(user_id=user.id, amount=7000, balance_after=20000, reason="ADMIN", ref_type="SYSTEM"))
    db.add(VaultLedger(user_id=user.id, amount=-2000, balance_after=18000, reason="WITHDRAW", ref_type="SYSTEM"))
    db.commit()

    svc = V2VaultService()
    stats = svc.get_admin_stats(db)
    assert "today_total_vault" in stats
    assert stats["total_pending_count"] >= 1

    ledger = svc.get_admin_user_ledger(db, user_id=user.id, limit=10, offset=0)
    assert ledger["user_id"] == user.id
    assert ledger["total_in"] >= 7000
    assert ledger["total_out"] <= 0
    assert len(ledger["items"]) >= 2


def test_admin_users_and_force_edit(db):
    user_a = create_v2_user(db, cc_id="COV005", locked_balance=1000)
    user_b = create_v2_user(db, cc_id="COV006", locked_balance=5000)
    user_a.total_charge_amount = 5_000_000
    user_b.total_charge_amount = 12_000_000
    db.commit()

    svc = V2VaultService()
    users_by_deposit = svc.get_admin_users(db, sort_by="total_deposit")
    assert any(u["tier"] == "VIP" for u in users_by_deposit)
    assert any(u["tier"] == "VVIP" for u in users_by_deposit)

    users_by_updated = svc.get_admin_users(db, sort_by="updated_at")
    assert len(users_by_updated) >= 2

    # Force edit: negative delta triggers locked/available split
    user_a.vault_available_balance = 500
    db.commit()
    result = svc.force_edit(db, admin_id=1, user_id=user_a.id, amount=-1200, reason="ADJUST")
    refreshed = db.get(V2User, user_a.id)
    assert refreshed.vault_locked_balance == 0
    assert refreshed.vault_available_balance == 300
