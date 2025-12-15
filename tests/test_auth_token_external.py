from datetime import datetime, timedelta

from fastapi.testclient import TestClient

from app.models.feature import UserEventLog
from app.models.user import User


def test_token_external_id_only_creates_user_and_logs(client: TestClient, session_factory) -> None:
    # Act: request token with external_id only (no user_id)
    resp = client.post(
        "/api/auth/token",
        json={"external_id": "admin", "password": "secret"},
    )

    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert isinstance(data.get("access_token"), str)

    # Verify DB updates
    session = session_factory()
    try:
        user = session.query(User).filter(User.external_id == "admin").one()
        assert user.id is not None
        assert user.last_login_at is not None
        assert datetime.utcnow() - user.last_login_at < timedelta(minutes=5)

        log = (
            session.query(UserEventLog)
            .filter_by(user_id=user.id, feature_type="AUTH", event_name="AUTH_LOGIN")
            .one()
        )
        assert log is not None
    finally:
        session.close()
