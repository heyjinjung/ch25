"""Lottery endpoint error-code responses for missing/invalid schedule."""
from fastapi.testclient import TestClient
from pytest import MonkeyPatch

from app.core.exceptions import InvalidConfigError


def test_lottery_play_returns_no_feature_error(client: TestClient) -> None:
    resp = client.post("/api/lottery/play")
    assert resp.status_code == 404
    body = resp.json()
    assert body["error"]["code"] == "NO_FEATURE_TODAY"


def test_lottery_play_invalid_schedule_returns_error_code(client: TestClient, monkeypatch: MonkeyPatch) -> None:
    def fake_validate(self, db, now, expected_type):  # type: ignore[unused-argument]
        raise InvalidConfigError("INVALID_FEATURE_SCHEDULE")

    monkeypatch.setattr("app.services.lottery_service.FeatureService.validate_feature_active", fake_validate)
    resp = client.post("/api/lottery/play")
    assert resp.status_code == 500
    body = resp.json()
    assert body["error"]["code"] == "INVALID_FEATURE_SCHEDULE"
