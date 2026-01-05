from datetime import datetime, timedelta

from zoneinfo import ZoneInfo

import pytest

from app.core.config import get_settings
from app.models.app_ui_config import AppUiConfig
from app.models.game_wallet import GameTokenType
from app.models.user import User
from app.services.game_wallet_service import GameWalletService
from app.services.mission_service import MissionService


def _seed_user(db, user_id: int = 1) -> User:
    user = User(id=user_id, external_id=f"u{user_id}", nickname="tester")
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture(autouse=True)
def _enable_streak_ticket_bonus_flag():
    settings = get_settings()
    prev = getattr(settings, "streak_ticket_bonus_enabled", False)
    settings.streak_ticket_bonus_enabled = True
    yield
    settings.streak_ticket_bonus_enabled = prev


def test_day4_grants_lottery1_and_roulette2_once_per_operational_day(session_factory):
    db = session_factory()
    _seed_user(db, 1)

    # Phase 2: ticket bonuses are granted via manual claim rules.
    db.add(
        AppUiConfig(
            key="streak_reward_rules",
            value_json={
                "rules": [
                    {
                        "day": 4,
                        "enabled": True,
                        "grants": [
                            {"kind": "WALLET", "token_type": "LOTTERY_TICKET", "amount": 1},
                            {"kind": "WALLET", "token_type": "ROULETTE_COIN", "amount": 2},
                        ],
                    }
                ]
            },
        )
    )
    db.commit()

    ws = GameWalletService()
    ms = MissionService(db)

    now_kst = datetime(2026, 1, 4, 10, 0, 0, tzinfo=ZoneInfo("Asia/Seoul"))
    play_day = ms._operational_play_date(now_kst)

    # Prepare: yesterday was day3
    user = db.query(User).filter(User.id == 1).one()
    user.play_streak = 3
    user.last_play_date = play_day - timedelta(days=1)
    db.add(user)
    db.commit()

    before_lottery = ws.get_balance(db, 1, GameTokenType.LOTTERY_TICKET)
    before_roulette = ws.get_balance(db, 1, GameTokenType.ROULETTE_COIN)

    ms.sync_play_streak(user_id=1, now_tz=now_kst)
    db.commit()

    claim = ms.claim_streak_reward(user_id=1)
    assert claim.get("success") is True
    assert int(claim.get("day")) == 4
    db.commit()

    after_lottery = ws.get_balance(db, 1, GameTokenType.LOTTERY_TICKET)
    after_roulette = ws.get_balance(db, 1, GameTokenType.ROULETTE_COIN)

    assert after_lottery - before_lottery == 1
    assert after_roulette - before_roulette == 2

    # Same operational day -> no additional grant (claim should fail)
    again_claim = ms.claim_streak_reward(user_id=1)
    assert again_claim.get("success") is False

    again_lottery = ws.get_balance(db, 1, GameTokenType.LOTTERY_TICKET)
    again_roulette = ws.get_balance(db, 1, GameTokenType.ROULETTE_COIN)

    assert again_lottery == after_lottery
    assert again_roulette == after_roulette


def test_day5_grants_again_on_next_operational_day(session_factory):
    db = session_factory()
    _seed_user(db, 1)

    # Phase 2: ticket bonuses are granted via manual claim rules.
    db.add(
        AppUiConfig(
            key="streak_reward_rules",
            value_json={
                "rules": [
                    {
                        "day": 5,
                        "enabled": True,
                        "grants": [
                            {"kind": "WALLET", "token_type": "LOTTERY_TICKET", "amount": 1},
                            {"kind": "WALLET", "token_type": "ROULETTE_COIN", "amount": 2},
                        ],
                    }
                ]
            },
        )
    )
    db.commit()

    ws = GameWalletService()
    ms = MissionService(db)

    day5_kst = datetime(2026, 1, 5, 10, 0, 0, tzinfo=ZoneInfo("Asia/Seoul"))
    play_day = ms._operational_play_date(day5_kst)

    # Prepare: yesterday was day4
    user = db.query(User).filter(User.id == 1).one()
    user.play_streak = 4
    user.last_play_date = play_day - timedelta(days=1)
    db.add(user)
    db.commit()

    before_lottery = ws.get_balance(db, 1, GameTokenType.LOTTERY_TICKET)
    before_roulette = ws.get_balance(db, 1, GameTokenType.ROULETTE_COIN)

    ms.sync_play_streak(user_id=1, now_tz=day5_kst)
    db.commit()

    claim = ms.claim_streak_reward(user_id=1)
    assert claim.get("success") is True
    assert int(claim.get("day")) == 5
    db.commit()

    after_lottery = ws.get_balance(db, 1, GameTokenType.LOTTERY_TICKET)
    after_roulette = ws.get_balance(db, 1, GameTokenType.ROULETTE_COIN)

    assert after_lottery - before_lottery == 1
    assert after_roulette - before_roulette == 2


def test_day6_does_not_grant_tickets(session_factory):
    db = session_factory()
    _seed_user(db, 1)

    ws = GameWalletService()
    ms = MissionService(db)

    now_kst = datetime(2026, 1, 6, 10, 0, 0, tzinfo=ZoneInfo("Asia/Seoul"))
    play_day = ms._operational_play_date(now_kst)

    user = db.query(User).filter(User.id == 1).one()
    user.play_streak = 5
    user.last_play_date = play_day - timedelta(days=1)
    db.add(user)
    db.commit()

    before_lottery = ws.get_balance(db, 1, GameTokenType.LOTTERY_TICKET)
    before_roulette = ws.get_balance(db, 1, GameTokenType.ROULETTE_COIN)

    ms.sync_play_streak(user_id=1, now_tz=now_kst)
    db.commit()

    after_lottery = ws.get_balance(db, 1, GameTokenType.LOTTERY_TICKET)
    after_roulette = ws.get_balance(db, 1, GameTokenType.ROULETTE_COIN)

    assert after_lottery == before_lottery
    assert after_roulette == before_roulette
