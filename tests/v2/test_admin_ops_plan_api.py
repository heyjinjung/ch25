"""
Unit tests for app/v2/api/admin_ops_plan.py
"""
import pytest
from unittest.mock import MagicMock, patch
from fastapi.testclient import TestClient
from app.main import app  # Assuming app is available here or can be constructed
from app.v2.api.admin_ops_plan import router
from app.v2.services.v2_admin_ops_plan_service import V2AdminOpsPlanService
from app.v2.schemas.v2_ops_plan import OpsCampaignOut

# Setup a minimal app for testing router if importing full app is heavy
from fastapi import FastAPI
test_app = FastAPI()
test_app.include_router(router)

@pytest.fixture
def client():
    return TestClient(test_app)

@pytest.fixture
def mock_service():
    with patch("app.v2.api.admin_ops_plan.V2AdminOpsPlanService") as mock:
        yield mock

def test_create_campaign(client, mock_service):
    # Mock return
    from datetime import date, datetime
    mock_service.create_campaign.return_value = OpsCampaignOut(
        id=1, name="Test Campaign", status="DRAFT", 
        start_date=date(2026, 1, 1), end_date=date(2026, 12, 31), 
        owner_admin_id=1, created_at=datetime(2026, 1, 1, 0, 0, 0),
        updated_at=datetime(2026, 1, 1, 0, 0, 0)
    )
    
    payload = {
        "name": "Test Campaign",
        "start_date": "2026-01-01",
        "end_date": "2026-12-31"
    }
    
    # Mock Admin Deps (Need to override dependency in real app, but here we mock service)
    # Ideally should override `get_current_admin_id`
    test_app.dependency_overrides = {}
    from app.v2.api.deps import get_current_admin_id, get_db
    test_app.dependency_overrides[get_current_admin_id] = lambda: 1
    test_app.dependency_overrides[get_db] = lambda: MagicMock()

    response = client.post("/admin/api/ops/campaigns", json=payload)
    if response.status_code != 201:
        print(f"FAILED: {response.status_code} {response.text}")
    assert response.status_code == 201
    assert response.json()["id"] == 1
    assert response.json()["name"] == "Test Campaign"

def test_list_campaigns(client, mock_service):
    mock_service.list_campaigns.return_value = []
    
    response = client.get("/admin/api/ops/campaigns?status=ACTIVE")
    assert response.status_code == 200
    assert response.json() == []
    from unittest.mock import ANY
    mock_service.list_campaigns.assert_called_with(ANY, status_filter="ACTIVE")

def test_execute_task(client, mock_service):
    from app.v2.schemas.v2_ops_plan import OpsPlanTaskOut
    from datetime import datetime
    
    mock_service.execute_task.return_value = OpsPlanTaskOut(
        id=10, plan_id=1, status="DONE",
        type="MESSAGE", title="Test Task",
        payload_json={}, executed_at=datetime(2026, 1, 1),
        created_at=datetime(2026, 1, 1), updated_at=datetime(2026, 1, 1)
    )
    
    payload = {"status": "DONE"}
    response = client.post("/admin/api/ops/tasks/10/execute", json=payload)
    if response.status_code != 200:
        print(f"FAILED: {response.status_code} {response.text}")
    assert response.status_code == 200
    mock_service.execute_task.assert_called()

def test_item_selector_items(client):
    # This endpoint is hardcoded, so no service mock needed strictly, but deps need override
    response = client.get("/admin/api/ops/items")
    assert response.status_code == 200
    items = response.json()
    assert len(items) >= 8
    assert items[0]["code"] == "GEM"
