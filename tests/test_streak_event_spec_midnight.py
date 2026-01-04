from datetime import datetime, time

import pytest

from app.core.config import get_settings
from app.models.mission import Mission, MissionCategory, MissionRewardType
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
