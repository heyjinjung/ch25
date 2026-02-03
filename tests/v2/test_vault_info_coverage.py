"""Additional coverage for V2VaultService.get_vault_info golden hour and wallet paths."""
from __future__ import annotations

from datetime import datetime, timezone, timedelta

import pytest

from app.v2.models.user import V2User
from app.v2.models import (
    ExternalRankingDailyDepositDelta,
    ExternalRankingData,
    VaultWithdrawalRequest,
    VaultLedger,
    UserActivity,
)
from app.v2.services.vault_service import V2VaultService


def create_user(db, *, cc_id: str) -> V2User:
    user = V2User(
        cc_id=cc_id,
        nickname="vault_user",
        vault_locked_balance=50000,
        vault_available_balance=0,
        vault_spent_today=0,
        vault_spent_reset_date="2000-01-01",
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def test_get_vault_info_golden_hour_force_on(db, monkeypatch):
    user = create_user(db, cc_id="VH_FORCE_ON")
    now = datetime.now(timezone.utc)

    # 오늘 입금 델타 추가
    db.add(
        ExternalRankingDailyDepositDelta(
            user_id=user.id,
            kst_date=V2VaultService._operational_date_kst(now),
            deposit_delta=10000,
        )
    )
    db.add(VaultWithdrawalRequest(user_id=user.id, amount=1000, status="PENDING"))
    db.add(VaultLedger(user_id=user.id, amount=5000, balance_after=50000, reason="SHOP", ref_type="SHOP"))
    db.commit()

    # Golden Hour FORCE_ON 설정
    def _get_config_value(_self, _db, key, default=None):
        if key == "golden_hour_config":
            return {"enabled": True, "manual_override": "FORCE_ON", "multiplier": 3.0}
        if key == "show_modal_override":
            return True
        return default

    monkeypatch.setattr("app.v2.services.vault_service.Vault2Service.get_config_value", _get_config_value)

    # Wallet balance mock
    def _get_wallet_balances(_db, _user_id):
        return {
            "ROULETTE_TICKET": 1,
            "DICE_TICKET": 2,
            "LOTTERY_TICKET": 3,
            "TRIAL_TICKET": 4,
            "ROULETTE_COIN": 5,
            "DICE_TOKEN": 6,
            "TRIAL_TOKEN": 7,
        }

    monkeypatch.setattr("app.v2.services.inventory_service.V2InventoryService.get_wallet_balances", _get_wallet_balances)

    info = V2VaultService().get_vault_info(db=db, user_id=user.id, now=now)

    assert info["is_golden_hour_active"] is True
    assert info["golden_hour_multiplier"] == 3.0
    assert info["ticketCount"] == (1 + 2 + 3 + 4 + 5 + 6 + 7)
    assert info["daily_deposit_confirmed"] is True
    assert info["today_earnings"] >= 5000


def test_get_vault_info_golden_hour_auto_window(db, monkeypatch):
    user = create_user(db, cc_id="VH_AUTO")
    now = datetime.now(timezone.utc)

    # 입금 데이터는 없고, rank/activity fallback만 테스트
    db.add(
        ExternalRankingData(
            user_id=user.id,
            deposit_amount=500000,
            daily_base_deposit=0,
            updated_at=now,
        )
    )
    db.add(UserActivity(user_id=user.id, last_charge_at=now))
    db.commit()

    # Golden Hour AUTO (현재 시간 포함되도록 설정)
    now_kst = now.astimezone(timezone(timedelta(hours=9)))
    start_str = (now_kst - timedelta(minutes=1)).strftime("%H:%M:%S")
    end_str = (now_kst + timedelta(minutes=5)).strftime("%H:%M:%S")

    def _get_config_value(_self, _db, key, default=None):
        if key == "golden_hour_config":
            return {
                "enabled": True,
                "manual_override": "AUTO",
                "start_time_kst": start_str,
                "end_time_kst": end_str,
                "multiplier": 2.5,
            }
        if key == "show_modal_override":
            return False
        return default

    monkeypatch.setattr("app.v2.services.vault_service.Vault2Service.get_config_value", _get_config_value)

    # Wallet balance empty
    monkeypatch.setattr(
        "app.v2.services.inventory_service.V2InventoryService.get_wallet_balances",
        lambda _db, _user_id: {},
    )

    info = V2VaultService().get_vault_info(db=db, user_id=user.id, now=now)

    assert info["is_golden_hour_active"] is True
    assert info["golden_hour_multiplier"] == 2.5
    assert info["golden_hour_remaining_seconds"] >= 0
    assert info["daily_deposit_confirmed"] is True
