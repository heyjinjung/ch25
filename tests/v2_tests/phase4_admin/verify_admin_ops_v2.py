import sys
import os
import pytest
import logging
from datetime import date
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

# Suppress SQLAlchemy logs
logging.getLogger('sqlalchemy.engine').setLevel(logging.WARNING)

# Ensure app can be imported
sys.path.append(os.getcwd())

from app.main import app as fastapi_app
from app.api.deps import get_db, get_current_admin_info
from app.db.base import Base
from app.models.user import User
from app.models.app_ui_config import AppUiConfig

# Import correct V2 services and models
from app.v2.services.v2_admin_ops_plan_service import V2AdminOpsPlanService
from app.models.ops_plan import OpsPlan, OpsPlanTask, OpsCampaign

from sqlalchemy.pool import StaticPool

# In-memory SQLite for verification
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"
engine = create_engine(
    SQLALCHEMY_DATABASE_URL, 
    connect_args={"check_same_thread": False}, 
    poolclass=StaticPool,
    echo=False
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()

client = TestClient(fastapi_app)

def print_banner(text: str):
    print(f"\n{'='*20} {text} {'='*20}")

def verify_admin_ops_v2():
    # Create Tables
    Base.metadata.create_all(bind=engine)
    print("Tables created.")
    
    # WORKAROUND: Create dummy 'users' table if legacy queries reference it
    with engine.connect() as conn:
        try:
            conn.execute(text("CREATE TABLE users (id INTEGER PRIMARY KEY)"))
            print("Created dummy users table for legacy compatibility")
        except Exception as e:
            print(f"Warning: Could not create dummy users table: {e}")

    fastapi_app.dependency_overrides[get_db] = override_get_db
    db = TestingSessionLocal()

    # 0. Seed Users
    print_banner("0. Seeding Users")
    user = User(external_id="user_1", nickname="NormalUser", status="ACTIVE")
    admin = User(external_id="admin_1", nickname="AdminUser", status="ACTIVE")
    db.add_all([user, admin])
    db.commit()
    db.refresh(user)
    db.refresh(admin)
    print(f"User ID: {user.id}, Admin ID: {admin.id}")

    # 1. Admin RBAC Verification
    print_banner("1. Admin RBAC Verification")
    
    fastapi_app.dependency_overrides[get_current_admin_info] = lambda: (user.id, "USER")
    r_user = client.get("/api/v2/admin/ops/status")
    print(f"User Access /ops/status: {r_user.status_code}")
    assert r_user.status_code == 403

    fastapi_app.dependency_overrides[get_current_admin_info] = lambda: (admin.id, "ADMIN")
    r_admin = client.get("/api/v2/admin/ops/status")
    print(f"Admin Access /ops/status: {r_admin.status_code}")
    if r_admin.status_code != 200:
        print(f"Error Response: {r_admin.text}")
    assert r_admin.status_code == 200
    print("Success: Admin Access OK")

    # 2. Ops Plan Execution Verification
    print_banner("2. Ops Plan verification")
    
    campaign = OpsCampaign(name="V2 Campaign", status="ACTIVE")
    db.add(campaign)
    db.commit()
    
    plan_dt = date(2026, 5, 5)
    plan = OpsPlan(
        campaign_id=campaign.id,
        plan_date=plan_dt, 
        theme_title="V2 Launch", 
        status="DRAFT"
    )
    db.add(plan)
    db.commit()
    
    task = OpsPlanTask(
        plan_id=plan.id,
        title="P4 Test Task",
        type="SYSTEM_NOTIFICATION",
        status="PENDING"
    )
    db.add(task)
    db.commit()
    
    saved_task = db.query(OpsPlanTask).filter(OpsPlanTask.id == task.id).first()
    assert saved_task is not None
    assert saved_task.type == "SYSTEM_NOTIFICATION"
    print("Success: Ops Plan & Task created")

    # 3. Shop & UI Config Sync
    print_banner("3. Ops Shop & UI Config Sync")
    
    fastapi_app.dependency_overrides[get_current_admin_info] = lambda: (admin.id, "ADMIN")
    
    # 3.1. Sync Defaults using Correct Path based on economy_routes.py
    r_sync = client.post("/api/v2/admin/shop/products/sync")
    print(f"Shop Sync Status: {r_sync.status_code}")
    if r_sync.status_code != 200:
        print(f"Shop Sync Error: {r_sync.text}")
    assert r_sync.status_code == 200
    
    products = r_sync.json()
    assert len(products) > 0
    target_product = products[0]
    target_id = target_product["id"]
    print(f"Selected Product ID for update: {target_id} (SKU: {target_product['sku']})")
    
    # 3.2. Update Product Price
    new_price = 999
    r_update = client.put(f"/api/v2/admin/shop/products/{target_id}/price", json={"price": new_price})
    print(f"Update Price Status: {r_update.status_code}")
    assert r_update.status_code == 200
    
    # Verify in DB
    row = db.query(AppUiConfig).filter(AppUiConfig.key == "v2_shop_products").first()
    assert row is not None
    saved_products = row.value_json["products"]
    # Find the updated product
    updated_p = next((p for p in saved_products if p.get("sku") == target_product["sku"]), None)
    assert updated_p is not None
    # 'cost_amount' is the field for price in V2 model
    assert int(updated_p["cost_amount"]) == new_price
    print(f"Success: Product price updated to {new_price}")
    
    # 4. Admin Inventory Control
    print_banner("4. Admin Inventory Control")
    user_id = user.id
    
    # Grant Item via API
    inv_payload = {
        "user_id": user_id,
        "item_type": "DIAMOND",
        "item_name": "Diamond",
        "quantity": 10,
        "reason": "Test Grant"
    }
    r_inv = client.post("/api/v2/admin/inventory/items", json=inv_payload)
    print(f"Inventory Grant Status: {r_inv.status_code}")
    if r_inv.status_code != 200:
         print(f"Inventory Grant Error: {r_inv.text}")
    assert r_inv.status_code == 200
    
    # Verify in DB
    from app.models.inventory import UserInventoryItem
    item = db.query(UserInventoryItem).filter(
        UserInventoryItem.user_id == user_id, 
        UserInventoryItem.item_type == "DIAMOND"
    ).first()
    assert item is not None
    assert item.quantity == 10
    print(f"Success: Granted 10 DIAMOND to User {user_id}")

if __name__ == "__main__":
    try:
        verify_admin_ops_v2()
        print("\n[VERIFICATION SUCCESS]")
    except Exception as e:
        print(f"\n[VERIFICATION FAILED] {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
