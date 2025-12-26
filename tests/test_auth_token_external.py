from datetime import datetime, timedelta

from fastapi.testclient import TestClient

from app.models.feature import UserEventLog
from app.models.user import User


def test_token_external_id_only_creates_user_and_logs(client: TestClient, session_factory) -> None:
    # Act: request token with external_id/password only (no user_id)
    # Policy: if user does not exist in DB, login must fail (no auto-create)
    resp = client.post(
        "/api/auth/token",
        json={"external_id": "admin", "password": "secret"},
    )

    assert resp.status_code == 401
    body = resp.json()
    assert body.get("error", {}).get("code") == "USER_NOT_FOUND"
