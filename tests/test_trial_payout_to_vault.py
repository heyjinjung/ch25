"""Tests for trial payout routing into Vault and trial token bookkeeping."""

import os
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models.game_wallet import GameTokenType, UserGameWallet
from app.models.new_member_dice import NewMemberDiceEligibility
from app.models.trial_token_bucket import TrialTokenBucket
from app.models.user import User
from app.models.vault_earn_event import VaultEarnEvent
from app.services.game_wallet_service import GameWalletService
from app.services.vault_service import VaultService


def _enable_trial_payout(valuation_json: str | None = None) -> None:
    os.environ["ENABLE_TRIAL_PAYOUT_TO_VAULT"] = "true"
    if valuation_json is not None:
        os.environ["TRIAL_REWARD_VALUATION"] = valuation_json
    get_settings.cache_clear()


def test_trial_token_bucket_consumed_flag(session_factory) -> None:
    session: Session = session_factory()

    # Ensure user wallet exists and set known balance.
    wallet = (
        session.query(UserGameWallet)
        .filter(UserGameWallet.user_id == 1, UserGameWallet.token_type == GameTokenType.DICE_TOKEN)
        .one_or_none()
    )
    if wallet is None:
        wallet = UserGameWallet(user_id=1, token_type=GameTokenType.DICE_TOKEN, balance=1)
        session.add(wallet)
    else:
        wallet.balance = 1
        session.add(wallet)
    session.commit()

    svc = GameWalletService()
    # Mark 1 trial-origin token.
    svc.mark_trial_grant(session, user_id=1, token_type=GameTokenType.DICE_TOKEN, amount=1)

    balance_after, consumed_trial = svc.require_and_consume_token(
        session,
        user_id=1,
        token_type=GameTokenType.DICE_TOKEN,
        amount=1,
        reason="DICE_PLAY",
        label="trial",
        meta={},
    )
    assert balance_after == 0
    assert consumed_trial is True

    bucket = (
        session.query(TrialTokenBucket)
        .filter(TrialTokenBucket.user_id == 1, TrialTokenBucket.token_type == GameTokenType.DICE_TOKEN)
        .one()
    )
    assert bucket.balance == 0


def test_trial_reward_routed_to_vault_with_skip_logging(session_factory) -> None:
    _enable_trial_payout('{"ITEM:1": 777}')

    session: Session = session_factory()
    session.add(User(id=1, external_id="tester", status="ACTIVE", cash_balance=0, vault_locked_balance=0, vault_balance=0))
    session.add(NewMemberDiceEligibility(user_id=1, is_eligible=True, campaign_key="test"))
    session.commit()

    vault = VaultService()

    # Non-POINT reward uses valuation map.
    added = vault.record_trial_result_earn_event(
        session,
        user_id=1,
        game_type="DICE",
        game_log_id=500,
        token_type="DICE_TOKEN",
        reward_type="ITEM",
        reward_amount=1,
        payout_raw={"case": "valued"},
    )
    session.expire_all()
    user = session.get(User, 1)
    assert user is not None
    assert added == 777
    assert user.vault_locked_balance == 777

    # Missing valuation: should record SKIP event but not change vault.
    added2 = vault.record_trial_result_earn_event(
        session,
        user_id=1,
        game_type="DICE",
        game_log_id=501,
        token_type="DICE_TOKEN",
        reward_type="ITEM",
        reward_amount=2,
        payout_raw={"case": "missing"},
    )
    session.expire_all()
    user2 = session.get(User, 1)
    assert user2 is not None
    assert added2 == 0
    assert user2.vault_locked_balance == 777

    events = session.query(VaultEarnEvent).order_by(VaultEarnEvent.id).all()
    assert len(events) == 2
    assert events[0].earn_type == "TRIAL_PAYOUT"
    assert events[0].amount == 777
    assert events[1].earn_type == "TRIAL_PAYOUT"
    assert events[1].amount == 0


def test_trial_reward_routed_to_vault_applies_multiplier(session_factory, monkeypatch) -> None:
    monkeypatch.setenv("ENABLE_TRIAL_PAYOUT_TO_VAULT", "true")
    monkeypatch.setenv("TRIAL_REWARD_VALUATION", '{"ITEM:1": 777}')
    monkeypatch.setenv("VAULT_ACCRUAL_MULTIPLIER_ENABLED", "true")
    monkeypatch.setenv("VAULT_ACCRUAL_MULTIPLIER_VALUE", "2.0")
    monkeypatch.setenv("VAULT_ACCRUAL_MULTIPLIER_START_KST", "2025-12-25")
    monkeypatch.setenv("VAULT_ACCRUAL_MULTIPLIER_END_KST", "2025-12-27")
    get_settings.cache_clear()

    session: Session = session_factory()
    session.add(User(id=1, external_id="tester", status="ACTIVE", cash_balance=0, vault_locked_balance=0, vault_balance=0))
    session.add(NewMemberDiceEligibility(user_id=1, is_eligible=True, campaign_key="test"))
    session.commit()

    vault = VaultService()
    now = datetime(2025, 12, 25, 0, 0, 0, tzinfo=timezone.utc)

    added = vault.record_trial_result_earn_event(
        session,
        user_id=1,
        game_type="DICE",
        game_log_id=900,
        token_type="DICE_TOKEN",
        reward_type="ITEM",
        reward_amount=1,
        payout_raw={"case": "valued"},
        now=now,
    )
    session.expire_all()
    user = session.get(User, 1)
    assert user is not None
    assert added == 1554
    assert user.vault_locked_balance == 1554

    ev = session.query(VaultEarnEvent).filter(VaultEarnEvent.earn_event_id.like("TRIAL:DICE:900:%")).one()
    assert ev.amount == 1554
