import os

import pytest
from fastapi.testclient import TestClient

from app.core.config import get_settings
from app.core.security import create_access_token
from app.v2.models.user import V2User


@pytest.fixture()
def client():
    # TestClient가 startup/shutdown 이벤트를 실행하므로,
    # TEST_MODE를 강제로 켜서 백그라운드 워커를 스킵한다.
    os.environ.setdefault("TEST_MODE", "1")
    get_settings.cache_clear()

    from app.main import app

    with TestClient(app) as c:
        yield c


def test_v2_health_public(client: TestClient):
    r = client.get("/api/v2/health")
    assert r.status_code == 200
    assert r.json() == {"status": "ok"}


def test_v2_health_db_public(client: TestClient):
    r = client.get("/api/v2/health/db")
    assert r.status_code == 200
    assert r.json() == {"status": "ok"}


def test_v2_today_feature_optional_auth_no_token(client: TestClient):
    r = client.get("/api/v2/today-feature")
    assert r.status_code == 200
    data = r.json()
    assert "feature_type" in data
    assert "user_id" not in data


def test_v2_today_feature_optional_auth_invalid_token_is_ignored(client: TestClient):
    r = client.get(
        "/api/v2/today-feature",
        headers={"Authorization": "Bearer invalid.token.value"},
    )
    assert r.status_code == 200
    data = r.json()
    assert "feature_type" in data
    assert "user_id" not in data


def test_v2_today_feature_optional_auth_valid_token_returns_user_id(client: TestClient):
    token = create_access_token(123)
    r = client.get(
        "/api/v2/today-feature",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert r.status_code == 200
    data = r.json()
    assert "feature_type" in data
    assert data.get("user_id") == 123


def test_v2_admin_ops_status_requires_auth_returns_normalized_error(client: TestClient):
    r = client.get("/api/v2/admin/ops/status")
    assert r.status_code == 401
    data = r.json()
    assert data.get("detail") == "AUTH_REQUIRED"
    assert data.get("error", {}).get("code") == "AUTH_REQUIRED"


def test_v2_admin_ops_status_user_token_denied_returns_normalized_error_and_logs(db, client: TestClient):
    user = V2User(cc_id="rbac_user_api", nickname="rbac", role="USER")
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token(int(user.id), role="USER")
    r = client.get(
        "/api/v2/admin/ops/status",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert r.status_code == 403
    data = r.json()
    assert data.get("detail") == "ADMIN_REQUIRED"
    assert data.get("error", {}).get("code") == "ADMIN_REQUIRED"
