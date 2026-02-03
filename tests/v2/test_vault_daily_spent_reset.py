"""Tests for daily vault spent reset in get_vault_info (KST 09:00 operational day)."""
from __future__ import annotations

from datetime import datetime, timedelta

import pytest

from app.v2.models.user import V2User
from app.v2.services.vault_service import V2VaultService


def create_user(db, *, cc_id: str) -> V2User:
    user = V2User(
        cc_id=cc_id,
        nickname="reset_test",
        vault_spent_today=10000,
        vault_spent_reset_date="2000-01-01",
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def test_get_vault_info_resets_daily_spent(db):
    user = create_user(db, cc_id="RESET001")
    service = V2VaultService()

    # 현재 시각 기준으로 get_vault_info 호출
    info = service.get_vault_info(db=db, user_id=user.id, now=datetime.utcnow())

    # 응답에 리셋 반영
    assert info["daily_vault_spent"] == 0

    # DB에도 리셋 반영
    refreshed = db.get(V2User, user.id)
    assert refreshed.vault_spent_today == 0
    assert refreshed.vault_spent_reset_date is not None
