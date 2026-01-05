from datetime import datetime, time

import pytest

from app.core.config import get_settings
from app.models.app_ui_config import AppUiConfig
from app.models.feature import UserEventLog
from app.models.game_wallet import GameTokenType, UserGameWallet
from app.models.mission import Mission, MissionCategory, MissionRewardType
from app.models.inventory import UserInventoryItem
from app.models.user import User
from app.services.mission_service import MissionService


def _seed_user(db, *, user_id: int = 1):
    user = User(id=user_id, external_id=f"u{user_id}", nickname="tester")
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def _seed_play_game_mission(db, logic_key: str):
    mission = Mission(
        title="Play once",
        description="",
        category=MissionCategory.DAILY,
        logic_key=logic_key,
        action_type="PLAY_GAME",
        target_value=1,
        reward_type=MissionRewardType.DIAMOND,
        reward_amount=0,
        xp_reward=0,
        start_time=time(0, 0, 0),
        end_time=time(23, 59, 59),
        is_active=True,
    )
    db.add(mission)
    db.commit()
    db.refresh(mission)
    return mission


@pytest.fixture()
def _streak_milestone_rewards_enabled():
    settings = get_settings()
    prev = getattr(settings, "streak_milestone_rewards_enabled", False)
    settings.streak_milestone_rewards_enabled = True
    yield
    settings.streak_milestone_rewards_enabled = prev


@pytest.fixture()
def _midnight_reset_hour():
    settings = get_settings()
    prev = settings.streak_day_reset_hour_kst
    settings.streak_day_reset_hour_kst = 0
    yield
    settings.streak_day_reset_hour_kst = prev


def test_spec_a_basic_increment_once_per_day(session_factory, monkeypatch, _midnight_reset_hour):
    db = session_factory()
    _seed_user(db)
    _seed_play_game_mission(db, "streak_spec_basic")

    ms = MissionService(db)

    # First play: should set to 1
    monkeypatch.setattr(MissionService, "_now_tz", lambda self: datetime(2026, 1, 4, 10, 0, 0))
    ms.update_progress(user_id=1, action_type="PLAY_GAME", delta=1)
    user = db.query(User).filter(User.id == 1).first()
    assert user.play_streak == 1

    # Same day replay: should NOT increment
    monkeypatch.setattr(MissionService, "_now_tz", lambda self: datetime(2026, 1, 4, 22, 0, 0))
    ms.update_progress(user_id=1, action_type="PLAY_GAME", delta=1)
    user = db.query(User).filter(User.id == 1).first()
    assert user.play_streak == 1


def test_spec_a_midnight_boundary_increments(session_factory, monkeypatch, _midnight_reset_hour):
    db = session_factory()
    _seed_user(db)
    _seed_play_game_mission(db, "streak_spec_midnight")

    ms = MissionService(db)

    # 23:59 counts for that day
    monkeypatch.setattr(MissionService, "_now_tz", lambda self: datetime(2026, 1, 4, 23, 59, 0))
    ms.update_progress(user_id=1, action_type="PLAY_GAME", delta=1)

    # 00:01 next day should increment to 2
    monkeypatch.setattr(MissionService, "_now_tz", lambda self: datetime(2026, 1, 5, 0, 1, 0))
    ms.update_progress(user_id=1, action_type="PLAY_GAME", delta=1)

    user = db.query(User).filter(User.id == 1).first()
    assert user.play_streak == 2


def test_spec_a_breaks_if_day_missed(session_factory, monkeypatch, _midnight_reset_hour):
    db = session_factory()
    _seed_user(db)
    _seed_play_game_mission(db, "streak_spec_break")

    ms = MissionService(db)

    monkeypatch.setattr(MissionService, "_now_tz", lambda self: datetime(2026, 1, 4, 12, 0, 0))
    ms.update_progress(user_id=1, action_type="PLAY_GAME", delta=1)

    # Skip Jan 5 entirely, play on Jan 6 => resets to 1
    monkeypatch.setattr(MissionService, "_now_tz", lambda self: datetime(2026, 1, 6, 12, 0, 0))
    ms.update_progress(user_id=1, action_type="PLAY_GAME", delta=1)

    user = db.query(User).filter(User.id == 1).first()
    assert user.play_streak == 1


def test_spec_login_only_does_not_increment_streak(session_factory, monkeypatch, _midnight_reset_hour):
    """Current implementation ties streak to PLAY_GAME, not just login.

    This matches current backend behavior, but conflicts with an event spec that says
    "1 login per day increments streak".
    """

    db = session_factory()
    _seed_user(db)

    ms = MissionService(db)

    monkeypatch.setattr(MissionService, "_now_tz", lambda self: datetime(2026, 1, 4, 10, 0, 0))
    ms.update_progress(user_id=1, action_type="daily_gift", delta=1)

    user = db.query(User).filter(User.id == 1).first()
    assert user.play_streak == 0


def test_streak_milestone_rewards_day3_and_day7(session_factory, monkeypatch, _midnight_reset_hour, _streak_milestone_rewards_enabled):
    db = session_factory()
    _seed_user(db)
    _seed_play_game_mission(db, "streak_spec_rewards")

    # Phase 2: milestone rewards are claimed manually based on UI config rules.
    db.add(
        AppUiConfig(
            key="streak_reward_rules",
            value_json={
                "rules": [
                    {
                        "day": 3,
                        "enabled": True,
                        "grants": [
                            {"kind": "WALLET", "token_type": "ROULETTE_COIN", "amount": 1},
                            {"kind": "WALLET", "token_type": "DICE_TOKEN", "amount": 1},
                            {"kind": "WALLET", "token_type": "LOTTERY_TICKET", "amount": 1},
                        ],
                    },
                    {
                        "day": 7,
                        "enabled": True,
                        "grants": [{"kind": "INVENTORY", "item_type": "DIAMOND", "amount": 1}],
                    },
                ]
            },
        )
    )
    db.commit()

    ms = MissionService(db)

    # Play 7 consecutive operational days.
    for i in range(7):
        day = 4 + i
        monkeypatch.setattr(MissionService, "_now_tz", lambda self, d=day: datetime(2026, 1, d, 12, 0, 0))
        ms.update_progress(user_id=1, action_type="PLAY_GAME", delta=1)

    # Phase 2: claim rewards after reaching milestones.
    # With rules [3,7], first claim should grant day7, second should grant day3.
    claim7 = ms.claim_streak_reward(user_id=1)
    assert claim7.get("success") is True
    assert int(claim7.get("day")) == 7

    claim3 = ms.claim_streak_reward(user_id=1)
    assert claim3.get("success") is True
    assert int(claim3.get("day")) == 3

    # Day3 milestone is reached on Jan 6.
    day3_event = "streak.reward_grant.3.2026-01-06"
    assert (
        db.query(UserEventLog)
        .filter(UserEventLog.user_id == 1, UserEventLog.event_name == day3_event)
        .one_or_none()
        is not None
    )

    # Verify tickets were granted (bundle: 1 roulette coin + 1 dice token + 1 lottery ticket)
    def _balance(token: GameTokenType) -> int:
        row = (
            db.query(UserGameWallet)
            .filter(UserGameWallet.user_id == 1, UserGameWallet.token_type == token)
            .one_or_none()
        )
        return int(row.balance) if row is not None else 0

    assert _balance(GameTokenType.ROULETTE_COIN) >= 1
    assert _balance(GameTokenType.DICE_TOKEN) >= 1
    assert _balance(GameTokenType.LOTTERY_TICKET) >= 1

    # Day7 milestone is reached on Jan 10.
    day7_event = "streak.reward_grant.7.2026-01-10"
    assert (
        db.query(UserEventLog)
        .filter(UserEventLog.user_id == 1, UserEventLog.event_name == day7_event)
        .one_or_none()
        is not None
    )

    diamond_item = (
        db.query(UserInventoryItem)
        .filter(UserInventoryItem.user_id == 1, UserInventoryItem.item_type == "DIAMOND")
        .one_or_none()
    )
    assert diamond_item is not None
    assert int(diamond_item.quantity) >= 1
