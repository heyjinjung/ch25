import pytest
from datetime import datetime, timedelta

from app.models.user import User
from app.models.feature import UserEventLog


@pytest.mark.parametrize("user_id,external_id", [(101, "ext-101")])
def test_token_issues_and_logs_login(client, session_factory, user_id, external_id):
    # Act: request token
    resp = client.post("/api/auth/token", json={"user_id": user_id, "external_id": external_id})

    # Assert response
    assert resp.status_code == 200
    data = resp.json()
    assert "access_token" in data
    assert data.get("token_type") == "bearer"

    # Verify DB updates
    session = session_factory()
    try:
        user = session.get(User, user_id)
        assert user is not None
        assert user.external_id == external_id
        assert user.last_login_at is not None
        assert user.last_login_ip
        # last_login_at should be recent (within 5 minutes)
        assert datetime.utcnow() - user.last_login_at < timedelta(minutes=5)

        log = (
            session.query(UserEventLog)
            .filter_by(user_id=user_id, feature_type="AUTH", event_name="AUTH_LOGIN")
            .one()
        )
        assert log.meta_json is None or "external_id" in log.meta_json
    finally:
        session.close()
