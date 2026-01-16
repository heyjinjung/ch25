import pytest
from app.models.user import User
from app.models.inventory import UserInventoryItem, UserInventoryLedger
from fastapi.testclient import TestClient

def test_admin_inventory_ledger_list(client: TestClient, session_factory):
    db = session_factory()
    user = User(external_id="inv_test_user")
    db.add(user)
    db.commit()
    
    ledger = UserInventoryLedger(
        user_id=user.id, 
        item_type="TEST_ITEM", 
        change_amount=10, 
        balance_after=10, 
        reason="Test Grant",
        related_id="TEST_REF"
    )
    db.add(ledger)
    db.commit()
    
    resp = client.get("/admin/api/inventory/ledger")
    assert resp.status_code == 200, f"Response: {resp.text}"
    data = resp.json()
    
    # Verify response is a LIST (Array) as expected by frontend
    assert isinstance(data, list), "Endpoint should return a JSON array"
    assert len(data) >= 1
    
    found = next((x for x in data if x["item_type"] == "TEST_ITEM"), None)
    assert found is not None
    assert found["change_amount"] == 10
    assert found["related_id"] == "TEST_REF"

def test_admin_inventory_items_list(client: TestClient, session_factory):
    db = session_factory()
    user = User(external_id="inv_test_user_2")
    db.add(user)
    db.commit()
    
    item = UserInventoryItem(user_id=user.id, item_type="TEST_ITEM_2", quantity=5)
    db.add(item)
    db.commit()
    
    resp = client.get("/admin/api/inventory/items")
    assert resp.status_code == 200, f"Response: {resp.text}"
    data = resp.json()
    
    # Verify response is a LIST (Array) as expected by frontend
    assert isinstance(data, list), "Endpoint should return a JSON array"
    assert len(data) >= 1
    
    found = next((x for x in data if x["item_type"] == "TEST_ITEM_2"), None)
    assert found is not None
    assert found["quantity"] == 5
