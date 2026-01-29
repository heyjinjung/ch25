
import pytest
from fastapi import FastAPI, Depends
from fastapi.testclient import TestClient
from app.v2.api.admin import ops_routes

# senior-fullstack: 실제 엔드포인트/서비스 mock 구조, 라우터만 등록

def get_db():
    class DummyDB: pass
    return DummyDB()

def get_current_admin_info():
    return (1, "ADMIN")

@pytest.fixture
def test_app(monkeypatch):
    app = FastAPI()
    app.include_router(ops_routes.router, prefix="/admin")
    app.dependency_overrides[ops_routes.get_db] = get_db
    app.dependency_overrides[ops_routes.get_current_admin_info] = get_current_admin_info
    yield app

@pytest.fixture
def client(test_app):
    return TestClient(test_app)

def test_get_ops_dashboard_status_success(client):
    response = client.get("/admin/ops/status")
    assert response.status_code == 200
    assert "system" in response.json()

def test_get_ops_dashboard_status_invalid_role(monkeypatch, client):
    def fake_admin_info():
        return (1, "GUEST")
    client.app.dependency_overrides[ops_routes.get_current_admin_info] = fake_admin_info
    response = client.get("/admin/ops/status")
    assert response.status_code == 403
    assert response.json()["detail"] == "NOT_AUTHORIZED"
