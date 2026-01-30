
import pytest
from unittest.mock import MagicMock, Mock, patch
from fastapi import FastAPI, Depends
from fastapi.testclient import TestClient
from app.v2.api.admin import ops_routes

# senior-fullstack: 실제 엔드포인트/서비스 mock 구조, 라우터만 등록

def get_db():
    mock_db = MagicMock()

    # Mock execute for db.execute("SELECT 1")
    mock_db.execute.return_value = None

    # Mock risk users data
    mock_user = Mock()
    mock_user.id = 1
    mock_user.nickname = "TestUser"
    mock_user.total_charge_amount = 500000
    mock_user.total_bet_amount = 400000

    mock_retention = Mock()
    mock_retention.churn_probability_score = 0.85
    mock_retention.last_login_date = None

    # Return appropriate mock based on call type
    def query_side_effect(*models):
        mock_query = MagicMock()

        # Check if this is a func.count() or func.coalesce() query
        if len(models) == 1 and not isinstance(models[0], type):
            # This is a func.count() or func.coalesce() query
            mock_filter = MagicMock()
            mock_filter.scalar.return_value = 10  # Default count value
            mock_query.filter.return_value = mock_filter
            return mock_query

        # Check if this is a join query (User, UserRetentionState)
        if len(models) == 2:
            # This is a join query for risk users
            mock_join = MagicMock()
            mock_join_filter = MagicMock()
            mock_order = MagicMock()
            mock_limit = MagicMock()

            mock_limit.all.return_value = [(mock_user, mock_retention)]
            mock_order.limit.return_value = mock_limit
            mock_join_filter.order_by.return_value = mock_order
            mock_join.filter.return_value = mock_join_filter
            mock_query.join.return_value = mock_join
            return mock_query

        # Default: simple User query
        mock_filter = MagicMock()
        mock_filter.count.return_value = 5
        mock_query.filter.return_value = mock_filter
        return mock_query

    mock_db.query.side_effect = query_side_effect

    return mock_db

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
