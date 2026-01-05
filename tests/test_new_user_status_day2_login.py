import uuid
from datetime import datetime, timezone

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.mission import Mission, MissionCategory, MissionRewardType, UserMissionProgress
from app.models.user import User


class FrozenDateTime(datetime):
    """Deterministic clock for endpoints using datetime.utcnow()/now().

    The app code in `new_user_onboarding.py` imports `datetime` directly, so we
    monkeypatch that module attribute to this class during the test.
    """

    _frozen_utc = datetime(2026, 1, 4, 15, 10, 0, tzinfo=timezone.utc)

    @classmethod
    def freeze_utc(cls, frozen_utc: datetime) -> None:
        if frozen_utc.tzinfo is None:
            raise ValueError("frozen_utc must be timezone-aware")
        cls._frozen_utc = frozen_utc.astimezone(timezone.utc)

    @classmethod
    def utcnow(cls):
        return cls._frozen_utc.replace(tzinfo=None)

    @classmethod
    def now(cls, tz=None):
        if tz is None:
            return cls._frozen_utc.replace(tzinfo=None)
        return cls._frozen_utc.astimezone(tz)


def _ensure_user(db: Session, user_id: int) -> User:
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        user = User(id=user_id, external_id=f"test_user_{user_id}", nickname="Tester")
        db.add(user)
        db.commit()
        db.refresh(user)
    return user


def test_new_user_status_increments_day2_login_only_via_status(client: TestClient, session_factory):
    # Seed data using the shared in-memory DB (StaticPool) from tests/conftest.py
    db: Session = session_factory()
    try:
        user = _ensure_user(db, user_id=1)

        mission = Mission(
            title="Day 2 Login",
            category=MissionCategory.NEW_USER,
            logic_key=f"NEW_USER_LOGIN_DAY2_{uuid.uuid4()}",
            action_type="LOGIN",
            target_value=2,
            reward_type=MissionRewardType.NONE,
            reward_amount=0,
            is_active=True,
        )
        db.add(mission)
        db.commit()
        db.refresh(mission)

        # Make last_login_at be "yesterday" in KST relative to our frozen now.
        # Frozen now: 2026-01-05 00:10 KST == 2026-01-04 15:10 UTC
        user.last_login_at = datetime(2026, 1, 3, 15, 0, 0)  # naive UTC
        db.add(user)
        db.commit()

        import app.api.routes.new_user_onboarding as new_user_onboarding

        original_datetime = new_user_onboarding.datetime
        new_user_onboarding.datetime = FrozenDateTime
        try:
            # Day 1 (KST 2026-01-05): should increment to 1
            FrozenDateTime.freeze_utc(datetime(2026, 1, 4, 15, 10, 0, tzinfo=timezone.utc))
            r1 = client.get("/api/new-user/status")
            assert r1.status_code == 200

            p1 = (
                db.query(UserMissionProgress)
                .filter(
                    UserMissionProgress.user_id == user.id,
                    UserMissionProgress.mission_id == mission.id,
                    UserMissionProgress.reset_date == "STATIC",
                )
                .first()
            )
            assert p1 is not None
            assert p1.current_value == 1

            # Same KST day: should NOT double increment
            FrozenDateTime.freeze_utc(datetime(2026, 1, 5, 3, 0, 0, tzinfo=timezone.utc))  # 12:00 KST
            r2 = client.get("/api/new-user/status")
            assert r2.status_code == 200

            db.refresh(p1)
            assert p1.current_value == 1

            # Next KST day (2026-01-06): should increment to 2
            FrozenDateTime.freeze_utc(datetime(2026, 1, 5, 15, 10, 0, tzinfo=timezone.utc))
            r3 = client.get("/api/new-user/status")
            assert r3.status_code == 200

            db.refresh(p1)
            assert p1.current_value == 2
        finally:
            new_user_onboarding.datetime = original_datetime
    finally:
        db.close()
