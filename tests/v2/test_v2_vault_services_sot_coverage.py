from __future__ import annotations

from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo

import pytest

from app.v2.models.core.user import User
from app.v2.models.user import V2User
from app.v2.models.core.vault_ledger import VaultLedger
from app.v2.services.vault_service import V2VaultService
from app.v2.services.vault2_service import Vault2Service
from app.v2.models.core.vault2 import VaultProgram


def _add_user_pair(db, *, cc_id: str, created_at_utc: datetime | None = None, manual_suspend: int = 0) -> int:
    v2_user = V2User(
        cc_id=cc_id,
        vault_locked_balance=0,
        benefits_suspended_manual=manual_suspend,
    )
    if created_at_utc is not None:
        # vault_service는 naive면 UTC로 간주하므로 naive로 저장
        v2_user.created_at = created_at_utc.replace(tzinfo=None)
    db.add(v2_user)
    db.flush()

    legacy_user = User(
        id=v2_user.id,
        external_id=f"ext:{cc_id}",
        vault_locked_balance=int(v2_user.vault_locked_balance or 0),
    )
    db.add(legacy_user)
    db.flush()
    return int(v2_user.id)


def test_v2_vault_get_locked_balance_user_not_found_raises(db):
    with pytest.raises(ValueError):
        V2VaultService.get_locked_balance(db, user_id=999999)


def test_v2_vault_operational_date_kst_resets_at_9am(db):
    # 2026-02-06 08:59 KST == 2026-02-05 23:59 UTC
    before_reset = datetime(2026, 2, 5, 23, 59, tzinfo=timezone.utc)
    # 2026-02-06 09:00 KST == 2026-02-06 00:00 UTC
    at_reset = datetime(2026, 2, 6, 0, 0, tzinfo=timezone.utc)

    d1 = V2VaultService._operational_date_kst(before_reset)
    d2 = V2VaultService._operational_date_kst(at_reset)

    assert d1 == datetime(2026, 2, 5).date()
    assert d2 == datetime(2026, 2, 6).date()


def test_v2_vault_deposit_and_withdraw_updates_locked_balance_and_ledger(db):
    user_id = _add_user_pair(db, cc_id="cc-vault-basic")

    after_deposit = V2VaultService.deposit(db, user_id=user_id, amount=1000, reason="TEST_DEPOSIT")
    assert after_deposit == 1000

    after_withdraw = V2VaultService.withdraw(db, user_id=user_id, amount=400, reason="TEST_WITHDRAW")
    assert after_withdraw == 600

    v2_user = db.get(V2User, user_id)
    assert v2_user is not None
    assert int(v2_user.vault_locked_balance or 0) == 600

    ledgers = db.query(VaultLedger).filter(VaultLedger.user_id == user_id).order_by(VaultLedger.id.asc()).all()
    assert len(ledgers) >= 2
    assert ledgers[-2].amount == 1000
    assert ledgers[-1].amount == -400


def test_v2_vault_withdraw_insufficient_raises(db):
    user_id = _add_user_pair(db, cc_id="cc-vault-insufficient")
    V2VaultService.deposit(db, user_id=user_id, amount=100, reason="TEST")

    with pytest.raises(ValueError):
        V2VaultService.withdraw(db, user_id=user_id, amount=200, reason="TEST")


def test_v2_vault_deposit_caps_for_suspended_users(db):
    now_utc = datetime.now(timezone.utc)
    old_created_at = now_utc - timedelta(days=8)
    user_id = _add_user_pair(db, cc_id="cc-vault-cap", created_at_utc=old_created_at)

    # 최근 7일 입금 delta가 없으면 자동 제재(is_suspended=True)로 간주되어 30,000 cap 적용
    after = V2VaultService.deposit(db, user_id=user_id, amount=50000, reason="TEST_CAP")
    assert after == 30000


def test_v2_vault_is_benefits_suspended_new_user_exempt_unless_manual(db):
    now_utc = datetime.now(timezone.utc)
    created_at = now_utc - timedelta(days=1)

    user_id = _add_user_pair(db, cc_id="cc-new-user", created_at_utc=created_at, manual_suspend=0)
    suspended, deposit_7d = V2VaultService.is_benefits_suspended(db, user_id=user_id, now_dt=now_utc)
    assert suspended is False
    assert deposit_7d == 0

    user_id2 = _add_user_pair(db, cc_id="cc-new-user-manual", created_at_utc=created_at, manual_suspend=1)
    suspended2, deposit_7d_2 = V2VaultService.is_benefits_suspended(db, user_id=user_id2, now_dt=now_utc)
    assert suspended2 is True
    assert deposit_7d_2 == 0


def test_v2_vault_consume_locked_for_spend_tracks_daily_reset_kst_9am(db):
    user_id = _add_user_pair(db, cc_id="cc-spend")
    V2VaultService.deposit(db, user_id=user_id, amount=1000, reason="FUND")

    # 첫 소비 (운영일 2026-02-06)
    now1 = datetime(2026, 2, 6, 0, 30, tzinfo=timezone.utc)  # 09:30 KST
    after1 = V2VaultService.consume_locked_for_spend(db, v2_user_id=user_id, amount=200, now=now1)
    assert after1 == 800

    v2_user = db.get(V2User, user_id)
    assert v2_user is not None
    assert int(v2_user.vault_spent_today or 0) == 200
    assert int(v2_user.vault_spent_total or 0) == 200
    assert v2_user.vault_spent_reset_date == "2026-02-06"

    # 다음 운영일로 넘어가면 spent_today가 리셋된 뒤 다시 누적
    now2 = datetime(2026, 2, 7, 0, 30, tzinfo=timezone.utc)  # 09:30 KST 다음날
    after2 = V2VaultService.consume_locked_for_spend(db, v2_user_id=user_id, amount=50, now=now2)
    assert after2 == 750

    v2_user2 = db.get(V2User, user_id)
    assert v2_user2 is not None
    assert int(v2_user2.vault_spent_today or 0) == 50
    assert int(v2_user2.vault_spent_total or 0) == 250
    assert v2_user2.vault_spent_reset_date == "2026-02-07"


def test_vault2_service_deep_merge_and_effective_config(db):
    base = {"a": 1, "b": {"c": 2, "d": 3}}
    override = {"b": {"c": 999}, "x": True}

    merged = Vault2Service._deep_merge_dict(base, override)
    assert merged["a"] == 1
    assert merged["b"]["c"] == 999
    assert merged["b"]["d"] == 3
    assert merged["x"] is True

    eff = Vault2Service._build_effective_config({"golden_hour_config": {"enabled": False}})
    assert isinstance(eff, dict)
    assert "golden_hour_config" in eff
    assert eff["golden_hour_config"]["enabled"] is False


def test_vault2_service_is_expiry_enabled(db):
    program = VaultProgram(key="K", name="N", duration_hours=24, expire_policy="FIXED_24H", is_active=True)
    assert Vault2Service._is_expiry_enabled(program) is True

    program2 = VaultProgram(key="K2", name="N2", duration_hours=0, expire_policy="FIXED_24H", is_active=True)
    assert Vault2Service._is_expiry_enabled(program2) is False

    program3 = VaultProgram(key="K3", name="N3", duration_hours=24, expire_policy="NONE", is_active=True)
    assert Vault2Service._is_expiry_enabled(program3) is False


def test_vault2_service_compute_expires_at(db):
    v = Vault2Service()
    locked_at = datetime(2026, 2, 6, 0, 0)
    assert v.compute_expires_at(locked_at, duration_hours=0) is None
    assert v.compute_expires_at(locked_at, duration_hours=-1) is None

    expires = v.compute_expires_at(locked_at, duration_hours=24)
    assert expires == locked_at + timedelta(hours=24)
