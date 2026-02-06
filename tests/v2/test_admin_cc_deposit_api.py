"""
Unit tests for app/v2/api/admin_cc_deposit.py
"""
import pytest
from unittest.mock import MagicMock, patch
from fastapi.testclient import TestClient
from fastapi import FastAPI
from app.v2.api.admin_cc_deposit import router
from app.v2.schemas.shared.cc_deposit import CCDepositListResponse, CCDepositEntry

test_app = FastAPI()
test_app.include_router(router)

@pytest.fixture
def client():
    # Dep overrides
    from app.v2.api.deps import get_db, get_current_admin_id
    test_app.dependency_overrides[get_db] = lambda: MagicMock()
    # Note: endpoints might not require admin_id explicit param but depend on it via router deps?
    # Checking file: it uses `list_cc_deposit(db: Session = Depends(get_db))`
    # It does NOT verify admin auth explicitly in the args shown in Step 273, 
    # maybe it's on the router include or APIRouter level (which is not shown fully in snippet context if applied externally).
    # But looking at Step 273 lines 18-22, no `get_current_admin_id` in `list_cc_deposit`.
    # It seems to be an open internal endpoint or protected by higher level middleware.
    
    return TestClient(test_app)

@pytest.fixture
def mock_db():
    return MagicMock()

@pytest.fixture
def client(mock_db):
    # Dep overrides
    from app.v2.api.deps import get_db, get_current_admin_id
    test_app.dependency_overrides[get_db] = lambda: mock_db
    return TestClient(test_app)

@pytest.fixture
def mock_deps():
    with patch("app.v2.api.admin_cc_deposit.V2AdminCCDepositService") as mock_svc, \
         patch("app.v2.api.admin_cc_deposit.V2AdminUserService") as mock_user_svc:
        yield mock_svc, mock_user_svc

def test_list_cc_deposit(client, mock_deps, mock_db):
    mock_svc, mock_user_svc = mock_deps
    from datetime import datetime
    from app.v2.schemas.shared.admin_user_summary import AdminUserSummary
    
    # Mock CC Deposit Data
    mock_svc.list_all.return_value = [
        MagicMock(id=1, user_id=100, deposit_amount=50000, play_count=10, 
                  memo="Test", created_at=datetime(2026, 1, 1), updated_at=datetime(2026, 1, 1))
    ]
    
    # Mock V2User Query
    user_mock = MagicMock(id=100)
    mock_db.query.return_value \
           .options.return_value \
           .filter.return_value \
           .all.return_value = [user_mock]
           
    # Mock user summary
    # Must use actual Model or dict that fits validation
    summary = AdminUserSummary(
        id=100,
        cc_id="test_cc",
        nickname="test_nick",
        tg_username="test_tg"
    )
    mock_user_svc.build_summary.return_value = summary
    
    response = client.get("/admin/api/external-ranking/")
    assert response.status_code == 200
    data = response.json()
    assert len(data["items"]) == 1
    assert data["items"][0]["deposit_amount"] == 50000
    # Schema uses alias="external_id"
    assert data["items"][0]["external_id"] == "test_cc"

def test_upsert_cc_deposit_batch(client, mock_deps):
    mock_svc, mock_user_svc = mock_deps
    mock_svc.upsert_many.return_value = []
    
    payload = [
        {"user_id": 100, "deposit_amount": 50000, "play_count": 10}
    ]
    response = client.post("/admin/api/external-ranking/", json=payload)
    assert response.status_code == 200

def test_delete_cc_deposit(client, mock_deps):
    mock_svc, _ = mock_deps
    response = client.delete("/admin/api/external-ranking/100")
    assert response.status_code == 200
    assert response.json() == {"ok": True}
    mock_svc.delete.assert_called()
