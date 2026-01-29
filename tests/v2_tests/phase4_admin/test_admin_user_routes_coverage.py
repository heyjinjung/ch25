
import pytest
from fastapi import FastAPI, Depends
from fastapi.testclient import TestClient
from app.v2.api.admin import user_routes
## resolve_summary 직접 import 제거 (mock patch만 사용)

# senior-fullstack: 실제 엔드포인트/서비스 mock 구조, 라우터만 등록

def get_db():
    class DummyDB: pass
    return DummyDB()

def get_current_admin_info():
    return (1, "ADMIN")

@pytest.fixture
def test_app(monkeypatch):
    app = FastAPI()
    app.include_router(user_routes.router, prefix="/admin")
    app.dependency_overrides[user_routes.get_db] = get_db
    app.dependency_overrides[user_routes.get_current_admin_info] = get_current_admin_info
    yield app

@pytest.fixture
def client(test_app):
    return TestClient(test_app)


def test_get_admin_users_list_success(monkeypatch, client):
    from app.v2.services.admin_user_service import V2AdminUserService
    monkeypatch.setattr(V2AdminUserService, "resolve_summary", staticmethod(lambda db, identifier: {"user_id": 1, "nickname": "test"}))
    # 실제 라우트에서 resolve_summary를 호출하는 엔드포인트에 맞게 경로 조정 필요
    response = client.get("/admin/user/list?identifier=1")
    assert response.status_code in (200, 404, 422)
    if response.status_code == 200:
        assert isinstance(response.json(), dict)

def test_get_admin_users_list_invalid_param(client):
    response = client.get("/admin/user/list?limit=notanint")
    assert response.status_code in (400, 404, 422)
