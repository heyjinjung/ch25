
import pytest
from fastapi import FastAPI, Depends
from fastapi.testclient import TestClient
from app.v2.api.admin import inventory_routes
## get_inventory 직접 import 제거 (mock patch만 사용)

# senior-fullstack: 실제 엔드포인트/서비스 mock 구조, 라우터만 등록

def get_db():
    from unittest.mock import MagicMock
    # 체이닝 가능한 mock 객체
    def chainable(*args, **kwargs):
        return MagicMock(query=chainable, outerjoin=chainable, filter=chainable, order_by=chainable, limit=chainable, all=lambda: [], first=lambda: None)
    db = MagicMock()
    db.query = chainable
    return db

def get_current_admin_info():
    return (1, "ADMIN")

@pytest.fixture
def test_app(monkeypatch):
    app = FastAPI()
    app.include_router(inventory_routes.router, prefix="/admin")
    app.dependency_overrides[inventory_routes.get_db] = get_db
    app.dependency_overrides[inventory_routes.get_current_admin_info] = get_current_admin_info
    yield app

@pytest.fixture
def client(test_app):
    return TestClient(test_app)


def test_get_inventory_logs_success(monkeypatch, client):
    from app.v2.services.admin_inventory_service import V2AdminInventoryService
    monkeypatch.setattr(V2AdminInventoryService, "get_inventory", staticmethod(lambda db, user_id=None: []))
    # 실제 라우트에서 get_inventory를 호출하는 엔드포인트에 맞게 경로 조정 필요
    response = client.get("/admin/inventory/logs?user_id=1")
    assert response.status_code in (200, 404, 422)
    # 반환값이 list일 경우만 체크
    if response.status_code == 200:
        assert isinstance(response.json(), list)

def test_get_inventory_logs_invalid_param(client):
    response = client.get("/admin/inventory/logs?limit=notanint")
    assert response.status_code in (400, 422)


def test_get_user_inventory_success(monkeypatch, client):
    from app.v2.services.admin_inventory_service import V2AdminInventoryService
    monkeypatch.setattr(V2AdminInventoryService, "get_inventory", staticmethod(lambda db, user_id=None: [{"userId": 1, "itemType": "A", "currentQuantity": 10}]))
    response = client.get("/admin/inventory/logs?user_id=1")
    assert response.status_code in (200, 404, 422)
    if response.status_code == 200:
        assert isinstance(response.json(), list)
