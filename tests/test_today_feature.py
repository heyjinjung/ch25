# /workspace/ch25/tests/test_today_feature.py
"""Scaffold tests for /api/today-feature behavior."""
from datetime import date, datetime
from zoneinfo import ZoneInfo

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.exceptions import InvalidConfigError
from app.models.feature import FeatureSchedule, FeatureType
from app.schemas.today_feature import TodayFeatureResponse


@pytest.fixture()
def db_session(session_factory) -> Session:
    session = session_factory()
    try:
        yield session
    finally:
        session.close()


def test_today_feature_returns_roulette(client: TestClient, db_session: Session) -> None:
    today = datetime.now(ZoneInfo("Asia/Seoul")).date()
    db_session.add(
        FeatureSchedule(date=today, feature_type=FeatureType.ROULETTE, is_active=True)
    )
    db_session.commit()

    response = client.get("/api/today-feature")
    assert response.status_code == 200
    payload = response.json()
    assert payload["feature_type"] == FeatureType.ROULETTE.value
    assert payload["user_id"] == 1


def test_today_feature_returns_not_found_when_missing(client: TestClient) -> None:
    response = client.get("/api/today-feature")
    assert response.status_code == 404
    assert response.json()["error"]["code"] == "NO_FEATURE_TODAY"


def test_today_feature_multiple_entries_returns_error(monkeypatch, client: TestClient) -> None:
    def fake_get_today_feature(db, now):  # type: ignore[no-untyped-def]
        raise InvalidConfigError("INVALID_FEATURE_SCHEDULE")

    monkeypatch.setattr(
        "app.api.routes.today_feature.feature_service.get_today_feature", fake_get_today_feature
    )
    response = client.get("/api/today-feature")
    assert response.status_code == 500
    assert response.json()["error"]["code"] == "INVALID_FEATURE_SCHEDULE"


def test_today_feature_response_schema(client: TestClient, db_session: Session) -> None:
    today = datetime.now(ZoneInfo("Asia/Seoul")).date()
    db_session.add(
        FeatureSchedule(date=today, feature_type=FeatureType.ROULETTE, is_active=True)
    )
    db_session.commit()

    response = client.get("/api/today-feature")
    payload = response.json()
    assert response.status_code == 200
    assert TodayFeatureResponse.validate(payload) is None
