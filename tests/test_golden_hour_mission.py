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


@pytest.fixture(autouse=True)
def enable_golden_hour_flag():
    settings = get_settings()
    prev = settings.golden_hour_enabled
    settings.golden_hour_enabled = True
    yield
    settings.golden_hour_enabled = prev


def test_claim_rejected_outside_time_window(client, session_factory, monkeypatch):
    db = session_factory()
    _seed_user(db)

    mission = Mission(
        title="GH test",
        description="",
        category=MissionCategory.DAILY,
        logic_key="golden_hour_play_3",
        action_type="PLAY_GAME",
        target_value=1,
        reward_type=MissionRewardType.DIAMOND,
        reward_amount=10,
        start_time=time(13, 0, 0),
        end_time=time(14, 0, 0),
        is_active=True,
    )
    db.add(mission)
    db.commit()
    db.refresh(mission)

    # Force now to 12:00 (outside window)
    monkeypatch.setattr(MissionService, "_now_tz", lambda self: datetime(2026, 1, 4, 12, 0, 0))

    ms = MissionService(db)
    ms.update_progress(user_id=1, action_type="PLAY_GAME", delta=1)

    resp = client.post(f"/api/mission/{mission.id}/claim", headers={"X-Idempotency-Key": "k1"})
    assert resp.status_code == 400
    assert resp.json()["detail"] == "Mission not in active time window"


def test_claim_success_within_window_and_idempotency(client, session_factory, monkeypatch):
    db = session_factory()
    _seed_user(db)

    mission = Mission(
        title="GH ok",
        description="",
        category=MissionCategory.DAILY,
        logic_key="golden_hour_play_3",
        action_type="PLAY_GAME",
        target_value=1,
        reward_type=MissionRewardType.DIAMOND,
        reward_amount=10,
        start_time=time(10, 0, 0),
        end_time=time(14, 0, 0),
        is_active=True,
    )
    db.add(mission)
    db.commit()
    db.refresh(mission)

    # Force now to 12:00 (within window)
    monkeypatch.setattr(MissionService, "_now_tz", lambda self: datetime(2026, 1, 4, 12, 0, 0))

    ms = MissionService(db)
    ms.update_progress(user_id=1, action_type="PLAY_GAME", delta=1)

    resp = client.post(f"/api/mission/{mission.id}/claim", headers={"X-Idempotency-Key": "k2"})
    assert resp.status_code == 200
    assert resp.json()["success"] is True

    # Duplicate idempotency key should be rejected with 409
    resp2 = client.post(f"/api/mission/{mission.id}/claim", headers={"X-Idempotency-Key": "k2"})
    assert resp2.status_code == 409
    assert resp2.json()["detail"] == "Duplicate request (idempotency)"


def test_boundary_start_and_end_inclusive(client, session_factory, monkeypatch):
    db = session_factory()
    _seed_user(db)

    # Start boundary mission
    mission_start = Mission(
        title="GH boundary start",
        description="",
        category=MissionCategory.DAILY,
        logic_key="golden_hour_play_start",
        action_type="PLAY_GAME",
        target_value=1,
        reward_type=MissionRewardType.DIAMOND,
        reward_amount=5,
        start_time=time(21, 30, 0),
        end_time=time(22, 30, 0),
        is_active=True,
    )
    db.add(mission_start)

    # End boundary mission (separate to avoid already-claimed state)
    mission_end = Mission(
        title="GH boundary end",
        description="",
        category=MissionCategory.DAILY,
        logic_key="golden_hour_play_end",
        action_type="PLAY_GAME",
        target_value=1,
        reward_type=MissionRewardType.DIAMOND,
        reward_amount=5,
        start_time=time(21, 30, 0),
        end_time=time(22, 30, 0),
        is_active=True,
    )
    db.add(mission_end)
    db.commit()
    db.refresh(mission_start)
    db.refresh(mission_end)

    # Start boundary 21:30:00
    monkeypatch.setattr(MissionService, "_now_tz", lambda self: datetime(2026, 1, 4, 21, 30, 0))
    ms = MissionService(db)
    ms.update_progress(user_id=1, action_type="PLAY_GAME", delta=1)
    resp_start = client.post(
        f"/api/mission/{mission_start.id}/claim",
        headers={"X-Idempotency-Key": "k-start"},
    )
    assert resp_start.status_code == 200

    # End boundary 22:30:00
    monkeypatch.setattr(MissionService, "_now_tz", lambda self: datetime(2026, 1, 4, 22, 30, 0))
    ms.update_progress(user_id=1, action_type="PLAY_GAME", delta=1)
    resp_end = client.post(
        f"/api/mission/{mission_end.id}/claim",
        headers={"X-Idempotency-Key": "k-end"},
    )
    assert resp_end.status_code == 200


def test_flag_off_blocks_claim(client, session_factory, monkeypatch):
    db = session_factory()
    user = _seed_user(db)

    mission = Mission(
        title="GH flag",
        description="",
        category=MissionCategory.DAILY,
        logic_key="golden_hour_flag_off",
        action_type="PLAY_GAME",
        target_value=1,
        reward_type=MissionRewardType.DIAMOND,
        reward_amount=10,
        start_time=time(10, 0, 0),
        end_time=time(14, 0, 0),
        is_active=True,
    )
    db.add(mission)
    db.commit()
    db.refresh(mission)

    monkeypatch.setattr(MissionService, "_now_tz", lambda self: datetime(2026, 1, 4, 12, 0, 0))
    ms = MissionService(db)
    ms.update_progress(user_id=user.id, action_type="PLAY_GAME", delta=1)

    settings = get_settings()
    prev_flag = settings.golden_hour_enabled
    settings.golden_hour_enabled = False
    try:
        resp = client.post(f"/api/mission/{mission.id}/claim", headers={"X-Idempotency-Key": "k-flag"})
        assert resp.status_code == 400
        assert resp.json()["detail"] == "Mission disabled by feature flag"
    finally:
        settings.golden_hour_enabled = prev_flag


def test_rate_limit_returns_429(client, session_factory, monkeypatch):
    db = session_factory()
    _seed_user(db)

    mission = Mission(
        title="GH rate",
        description="",
        category=MissionCategory.DAILY,
        logic_key="golden_hour_rate",
        action_type="PLAY_GAME",
        target_value=1,
        reward_type=MissionRewardType.DIAMOND,
        reward_amount=10,
        start_time=time(10, 0, 0),
        end_time=time(14, 0, 0),
        is_active=True,
    )
    db.add(mission)
    db.commit()
    db.refresh(mission)

    monkeypatch.setattr(MissionService, "_now_tz", lambda self: datetime(2026, 1, 4, 12, 0, 0))
    ms = MissionService(db)
    ms.update_progress(user_id=1, action_type="PLAY_GAME", delta=1)

    # Force limiter denial
    from app.api.routes import mission as mission_route

    monkeypatch.setattr(mission_route.rate_limiter, "allow", lambda *args, **kwargs: False)

    resp = client.post(f"/api/mission/{mission.id}/claim", headers={"X-Idempotency-Key": "k-rl"})
    assert resp.status_code == 429
    assert resp.json()["detail"] == "Rate limit exceeded"


def test_missing_idempotency_key_rejected(client, session_factory, monkeypatch):
    db = session_factory()
    _seed_user(db)

    mission = Mission(
        title="GH no idem",
        description="",
        category=MissionCategory.DAILY,
        logic_key="golden_hour_no_idem",
        action_type="PLAY_GAME",
        target_value=1,
        reward_type=MissionRewardType.DIAMOND,
        reward_amount=10,
        start_time=time(10, 0, 0),
        end_time=time(14, 0, 0),
        is_active=True,
    )
    db.add(mission)
    db.commit()
    db.refresh(mission)

    monkeypatch.setattr(MissionService, "_now_tz", lambda self: datetime(2026, 1, 4, 12, 0, 0))
    ms = MissionService(db)
    ms.update_progress(user_id=1, action_type="PLAY_GAME", delta=1)

    resp = client.post(f"/api/mission/{mission.id}/claim")
    assert resp.status_code == 400
    assert resp.json()["detail"] == "X-Idempotency-Key header required"
