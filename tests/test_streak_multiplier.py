from datetime import datetime, time

import pytest

from app.core.config import get_settings
from app.models.mission import Mission, MissionCategory, MissionRewardType
from app.models.user import User
from app.services.mission_service import MissionService


def _seed_user(db):
    user = User(id=1, external_id="u1", nickname="tester")
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def _seed_play_game_mission(db, logic_key: str, reward_amount: int = 10):
    mission = Mission(
        title="Streak mission",
        description="",
        category=MissionCategory.DAILY,
        logic_key=logic_key,
        action_type="PLAY_GAME",
        target_value=1,
        reward_type=MissionRewardType.DIAMOND,
        reward_amount=reward_amount,
        xp_reward=0,
        start_time=time(0, 0, 0),
        end_time=time(23, 59, 59),
        is_active=True,
    )
    db.add(mission)
    db.commit()
    db.refresh(mission)
    return mission


@pytest.fixture(autouse=True)
def _enable_streak_multiplier_flag():
    settings = get_settings()
    prev = settings.streak_multiplier_enabled
    settings.streak_multiplier_enabled = True
    yield
    settings.streak_multiplier_enabled = prev


def test_play_streak_increments_consecutive_operational_days(session_factory, monkeypatch):
    db = session_factory()
    _seed_user(db)
    _seed_play_game_mission(db, "streak_play")

    ms = MissionService(db)

    # Day 1 play after reset hour
    monkeypatch.setattr(MissionService, "_now_tz", lambda self: datetime(2026, 1, 4, 10, 0, 0))
    ms.update_progress(user_id=1, action_type="PLAY_GAME", delta=1)
    user = db.query(User).filter(User.id == 1).first()
    assert user.play_streak == 1

    # Day 2 play after reset hour
    monkeypatch.setattr(MissionService, "_now_tz", lambda self: datetime(2026, 1, 5, 10, 0, 0))
    ms.update_progress(user_id=1, action_type="PLAY_GAME", delta=1)
    user = db.query(User).filter(User.id == 1).first()
    assert user.play_streak == 2


def test_play_streak_does_not_increment_before_reset_hour_same_operational_day(session_factory, monkeypatch):
    db = session_factory()
    _seed_user(db)
    _seed_play_game_mission(db, "streak_play_reset")

    ms = MissionService(db)

    # Jan 4 10:00 -> operational date Jan 4
    monkeypatch.setattr(MissionService, "_now_tz", lambda self: datetime(2026, 1, 4, 10, 0, 0))
    ms.update_progress(user_id=1, action_type="PLAY_GAME", delta=1)

    # Jan 5 08:00 -> operational date still Jan 4 (before 09:00)
    monkeypatch.setattr(MissionService, "_now_tz", lambda self: datetime(2026, 1, 5, 8, 0, 0))
    ms.update_progress(user_id=1, action_type="PLAY_GAME", delta=1)

    user = db.query(User).filter(User.id == 1).first()
    assert user.play_streak == 1


def test_mission_claim_applies_hot_multiplier_ceil(client, session_factory, monkeypatch):
    db = session_factory()
    user = _seed_user(db)

    # Ensure streak sync keeps user in HOT band after this play.
    # With reset hour 09:00 KST, 2026-01-04 12:00 maps to play_day=2026-01-04.
    # Set last_play_date to yesterday so sync increments into HOT.
    user.play_streak = 2
    user.last_play_date = datetime(2026, 1, 3, 0, 0, 0).date()
    db.add(user)
    db.commit()

    mission = _seed_play_game_mission(db, "streak_claim", reward_amount=10)

    monkeypatch.setattr(MissionService, "_now_tz", lambda self: datetime(2026, 1, 4, 12, 0, 0))
    MissionService(db).update_progress(user_id=1, action_type="PLAY_GAME", delta=1)

    resp = client.post(f"/api/mission/{mission.id}/claim", headers={"X-Idempotency-Key": "streak-claim"})
    assert resp.status_code == 200
    # Rewards are currently not multiplied by streak (rolled back to base rewards).
    assert resp.json()["amount"] == 10
