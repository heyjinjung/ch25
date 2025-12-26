"""Tests for VaultEarnEvent idempotent game accrual."""

import os
from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models.new_member_dice import NewMemberDiceEligibility
from app.models.user import User
from app.models.vault_earn_event import VaultEarnEvent
from app.services.vault_service import VaultService


def _enable_game_earn_events() -> None:
    os.environ["ENABLE_VAULT_GAME_EARN_EVENTS"] = "true"
    get_settings.cache_clear()


def test_vault_game_earn_event_idempotent_and_expires_not_refreshed(session_factory) -> None:
    _enable_game_earn_events()

    session: Session = session_factory()
    user = User(id=2001, external_id="tester", status="ACTIVE", cash_balance=0, vault_locked_balance=0, vault_balance=0)
    session.add(user)
    session.add(NewMemberDiceEligibility(user_id=user.id, is_eligible=True, campaign_key="test"))
    session.commit()

    svc = VaultService()

    added1 = svc.record_game_play_earn_event(
        session,
        user_id=2001,
        game_type="DICE",
        game_log_id=100,
        token_type="DICE_TOKEN",
        outcome="WIN",
        payout_raw={"result": "WIN"},
    )
    session.expire_all()
    user = session.get(User, 2001)
    assert user is not None
    assert added1 == 200
    assert user.vault_locked_balance == 200
    # Milestone not reached (200 < 10,000), so no timer yet.
    assert user.vault_locked_expires_at is None

    # Now reach the milestone (10,000)
    user.vault_locked_balance = 10000
    svc._ensure_locked_expiry(user, datetime.utcnow())
    session.add(user)
    session.commit()
    
    expires1 = user.vault_locked_expires_at
    assert expires1 is not None

    # Duplicate earn_event_id should not re-add.
    added_dup = svc.record_game_play_earn_event(
        session,
        user_id=2001,
        game_type="DICE",
        game_log_id=100,
        token_type="DICE_TOKEN",
        outcome="WIN",
        payout_raw={"result": "WIN"},
    )
    session.expire_all()
    user2 = session.get(User, 2001)
    assert user2 is not None
    assert added_dup == 0
    assert user2.vault_locked_balance == 10000
    # Duplicate call should not refresh expiration.
    assert user2.vault_locked_expires_at == expires1
    assert session.query(VaultEarnEvent).count() == 1

    # A new game_log_id should accrue again but should NOT refresh expires_at (Policy Restored).
    # Advance time slightly to ensure diff.
    added2 = svc.record_game_play_earn_event(
        session,
        user_id=2001,
        game_type="DICE",
        game_log_id=101,
        token_type="DICE_TOKEN",
        outcome="WIN",
        payout_raw={"result": "WIN"},
        now=datetime.utcnow() + timedelta(seconds=10) # Simulate time passing
    )
    session.expire_all()
    user3 = session.get(User, 2001)
    assert user3 is not None
    assert added2 == 200
    assert user3.vault_locked_balance == 10200
    # Expiration should remain the same (original start time + 24h).
    assert user3.vault_locked_expires_at == expires1
    assert session.query(VaultEarnEvent).count() == 2


def test_vault_game_earn_event_lose_bonus(session_factory) -> None:
    _enable_game_earn_events()

    session: Session = session_factory()
    session.add(User(id=1, external_id="tester", status="ACTIVE", cash_balance=0, vault_locked_balance=0, vault_balance=0))
    session.add(NewMemberDiceEligibility(user_id=1, is_eligible=True, campaign_key="test"))
    session.commit()

    svc = VaultService()
    added = svc.record_game_play_earn_event(
        session,
        user_id=1,
        game_type="DICE",
        game_log_id=200,
        token_type="DICE_TOKEN",
        outcome="LOSE",
        payout_raw={"result": "LOSE"},
    )
    session.expire_all()
    user = session.get(User, 1)
    assert user is not None
    assert added == 300
    assert user.vault_locked_balance == 300


def test_vault_game_earn_event_applies_multiplier_when_enabled(session_factory, monkeypatch) -> None:
    monkeypatch.setenv("ENABLE_VAULT_GAME_EARN_EVENTS", "true")
    monkeypatch.setenv("VAULT_ACCRUAL_MULTIPLIER_ENABLED", "true")
    monkeypatch.setenv("VAULT_ACCRUAL_MULTIPLIER_VALUE", "2.0")
    monkeypatch.setenv("VAULT_ACCRUAL_MULTIPLIER_START_KST", "2025-12-25")
    monkeypatch.setenv("VAULT_ACCRUAL_MULTIPLIER_END_KST", "2025-12-27")
    get_settings.cache_clear()

    session: Session = session_factory()
    session.add(User(id=1, external_id="tester", status="ACTIVE", cash_balance=0, vault_locked_balance=0, vault_balance=0))
    session.add(NewMemberDiceEligibility(user_id=1, is_eligible=True, campaign_key="test"))
    session.commit()

    now = datetime(2025, 12, 25, 0, 0, 0, tzinfo=timezone.utc)
    svc = VaultService()
    added = svc.record_game_play_earn_event(
        session,
        user_id=1,
        game_type="DICE",
        game_log_id=999,
        token_type="DICE_TOKEN",
        outcome="WIN",
        payout_raw={"result": "WIN"},
        now=now,
    )
    session.expire_all()
    user = session.get(User, 1)
    assert user is not None
    assert added == 400
    assert user.vault_locked_balance == 400
