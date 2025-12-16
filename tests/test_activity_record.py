"""Activity ingestion API tests."""

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.user import User
from app.models.user_activity import UserActivity


def _seed_user(session_factory) -> None:
    session: Session = session_factory()
    if session.query(User).filter(User.id == 1).first() is None:
        session.add(User(id=1, external_id="tester", status="ACTIVE"))
        session.commit()
    session.close()


def test_activity_record_increments_and_updates_fields(client: TestClient, session_factory) -> None:
    _seed_user(session_factory)

    # plays
    resp = client.post("/api/activity/record", json={"event_type": "ROULETTE_PLAY"})
    assert resp.status_code == 200

    resp = client.post("/api/activity/record", json={"event_type": "DICE_PLAY"})
    assert resp.status_code == 200

    resp = client.post("/api/activity/record", json={"event_type": "LOTTERY_PLAY"})
    assert resp.status_code == 200

    # bonus used
    resp = client.post("/api/activity/record", json={"event_type": "BONUS_USED"})
    assert resp.status_code == 200

    # duration
    resp = client.post("/api/activity/record", json={"event_type": "PLAY_DURATION", "value": 15})
    assert resp.status_code == 200

    # ignore non-positive duration
    resp = client.post("/api/activity/record", json={"event_type": "PLAY_DURATION", "value": 0})
    assert resp.status_code == 200

    session: Session = session_factory()
    activity = session.query(UserActivity).filter(UserActivity.user_id == 1).one()
    assert activity.roulette_plays == 1
    assert activity.dice_plays == 1
    assert activity.lottery_plays == 1
    assert activity.total_play_duration == 15
    assert activity.last_bonus_used_at is not None
    assert activity.updated_at is not None
    session.close()


def test_activity_record_is_idempotent_with_event_id(client: TestClient, session_factory) -> None:
    _seed_user(session_factory)

    event_id = "11111111-1111-4111-8111-111111111111"
    resp = client.post("/api/activity/record", json={"event_type": "ROULETTE_PLAY", "event_id": event_id})
    assert resp.status_code == 200

    # Duplicate event_id should be ignored
    resp = client.post("/api/activity/record", json={"event_type": "ROULETTE_PLAY", "event_id": event_id})
    assert resp.status_code == 200

    session: Session = session_factory()
    activity = session.query(UserActivity).filter(UserActivity.user_id == 1).one()
    assert activity.roulette_plays == 1
    session.close()
