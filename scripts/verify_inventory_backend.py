
import sys
import os
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

# Add project root to path
sys.path.append(os.getcwd())

from fastapi.testclient import TestClient
from app.main import app
from app.api.deps import get_current_admin_id, get_db

# Mock admin auth
def override_get_current_admin_id():
    return 1

app.dependency_overrides[get_current_admin_id] = override_get_current_admin_id

client = TestClient(app)

def test_inventory_items():
    print("Testing /admin/api/inventory/items ...")
    response = client.get("/admin/api/inventory/items?limit=5")
    if response.status_code != 200:
        print(f"FAILED: {response.text}")
        return
    
    data = response.json()
    print(f"Got {len(data)} items")
    if len(data) > 0:
        item = data[0]
        if "nickname" in item:
            print("SUCCESS: nickname field present")
        else:
            print("FAILED: nickname field missing")
            print(item)
        
        if "quantity" in item and "item_type" in item:
             print("SUCCESS: core fields present")
    else:
        print("WARNING: No inventory items found to test structure")

def test_inventory_items_sorting():
    print("\nTesting /admin/api/inventory/items sorting (quantity desc) ...")
    response = client.get("/admin/api/inventory/items?sort_by=quantity&sort_desc=true&limit=10")
    if response.status_code != 200:
        print(f"FAILED: {response.text}")
        return
    
    data = response.json()
    if len(data) < 2:
        print("WARNING: Not enough items to test sorting")
        return

    quantities = [item["quantity"] for item in data]
    print(f"Quantities: {quantities}")
    if quantities == sorted(quantities, reverse=True):
        print("SUCCESS: Items sorted by quantity DESC")
    else:
        print("FAILED: Items NOT sorted correctly")

def test_inventory_ledger():
    print("\nTesting /admin/api/inventory/ledger ...")
    response = client.get("/admin/api/inventory/ledger?limit=5")
    if response.status_code != 200:
        print(f"FAILED: {response.text}")
        return

    data = response.json()
    print(f"Got {len(data)} ledger entries")
    if len(data) > 0:
        entry = data[0]
        if "nickname" in entry:
            print("SUCCESS: nickname field present in ledger")
        else:
            print("FAILED: nickname field missing in ledger")
            print(entry)
    else:
        print("WARNING: No ledger entries found")

if __name__ == "__main__":
    try:
        test_inventory_items()
        test_inventory_items_sorting()
        test_inventory_ledger()
    except Exception as e:
        print(f"ERROR: {e}")
