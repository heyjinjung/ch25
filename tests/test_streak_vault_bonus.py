from datetime import datetime, timedelta

import pytest

from app.core.config import get_settings
from app.models.game_wallet import GameTokenType
from app.models.user import User
from app.services.vault_service import VaultService


def _seed_user(db, user_id: int = 1) -> User:
    user = User(id=user_id, external_id=f"u{user_id}", nickname="tester")
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture(autouse=True)
def _enable_vault_earn_and_streak_bonus_flags():
    settings = get_settings()
    prev_earn = settings.enable_vault_game_earn_events
    prev_bonus = settings.streak_vault_bonus_enabled
    settings.enable_vault_game_earn_events = True
    settings.streak_vault_bonus_enabled = True
    yield
    settings.enable_vault_game_earn_events = prev_earn
    settings.streak_vault_bonus_enabled = prev_bonus


def test_day2_bonus_applies_for_1h_from_first_play(session_factory):
    db = session_factory()
    user = _seed_user(db, 1)

    # Day 2 streak state already achieved by the time we compute vault accrual.
    user.play_streak = 2
    db.add(user)
    db.commit()

    vs = VaultService()

    t0 = datetime(2026, 1, 4, 1, 0, 0)  # UTC (KST 10:00)
    a1 = vs.record_game_play_earn_event(
        db,
        user_id=1,
        game_type="DICE",
        game_log_id=100,
        token_type=GameTokenType.DICE_TOKEN.value,
        outcome="WIN",
        payout_raw={"reward_amount": 200, "mode": "NORMAL"},
        now=t0,
    )
    assert a1 == 240

    # Within 1 hour window -> still boosted
    a2 = vs.record_game_play_earn_event(
        db,
        user_id=1,
        game_type="DICE",
        game_log_id=101,
        token_type=GameTokenType.DICE_TOKEN.value,
        outcome="WIN",
        payout_raw={"reward_amount": 200, "mode": "NORMAL"},
        now=t0 + timedelta(minutes=30),
    )
    assert a2 == 240

    # After window -> base amount
    a3 = vs.record_game_play_earn_event(
        db,
        user_id=1,
        game_type="DICE",
        game_log_id=102,
        token_type=GameTokenType.DICE_TOKEN.value,
        outcome="WIN",
        payout_raw={"reward_amount": 200, "mode": "NORMAL"},
        now=t0 + timedelta(hours=2),
    )
    assert a3 == 200


def test_excluded_modes_do_not_receive_bonus(session_factory):
    db = session_factory()
    user = _seed_user(db, 1)
    user.play_streak = 7
    db.add(user)
    db.commit()

    vs = VaultService()
    now = datetime(2026, 1, 4, 1, 0, 0)

    # Excluded: GOLD_KEY roulette
    earn_gold = vs.record_game_play_earn_event(
        db,
        user_id=1,
        game_type="ROULETTE",
        game_log_id=200,
        token_type=GameTokenType.GOLD_KEY.value,
        outcome="SEGMENT_1",
        payout_raw={"reward_amount": 100},
        now=now,
    )
    assert earn_gold == 200

    # Excluded: DIAMOND_KEY roulette
    earn_diamond = vs.record_game_play_earn_event(
        db,
        user_id=1,
        game_type="ROULETTE",
        game_log_id=201,
        token_type=GameTokenType.DIAMOND_KEY.value,
        outcome="SEGMENT_1",
        payout_raw={"reward_amount": 100},
        now=now,
    )
    assert earn_diamond == 200

    # Excluded: TRIAL roulette
    earn_trial = vs.record_game_play_earn_event(
        db,
        user_id=1,
        game_type="ROULETTE",
        game_log_id=202,
        token_type=GameTokenType.TRIAL_TOKEN.value,
        outcome="SEGMENT_1",
        payout_raw={"reward_amount": 100},
        now=now,
    )
    assert earn_trial == 200

    # Excluded: non-normal dice mode
    earn_event_dice = vs.record_game_play_earn_event(
        db,
        user_id=1,
        game_type="DICE",
        game_log_id=203,
        token_type=GameTokenType.DICE_TOKEN.value,
        outcome="WIN",
        payout_raw={"reward_amount": 200, "mode": "EVENT"},
        now=now,
    )
    assert earn_event_dice == 200
