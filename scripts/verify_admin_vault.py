
import sys
import os
from pathlib import Path

# Add project root to path
sys.path.append(str(Path(__file__).parent.parent))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.db.base_class import Base
from app.models.user import User
from app.services.vault_service import VaultService
from app.api.admin.routes.admin_vault_ops import _build_admin_state

def test_admin_vip_support():
    # Setup In-Memory DB
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()

    print("--- Test Start: Admin Vault VIP Support ---")

    # 1. Create User with VIP Charge
    user_id = 888
    user = User(id=user_id, external_id="admin-test-user", total_charge_amount=150000)
    db.add(user)
    db.commit()
    print(f"User created. Total Charge: {user.total_charge_amount}")

    # 2. Call Admin Service Logic
    service = VaultService()
    state = _build_admin_state(service, db, user_id)
    
    print(f"Admin Response: {state}")
    
    # 3. Verify total_charge_amount in response
    assert state.total_charge_amount == 150000
    print("PASSED: Admin response contains correct total_charge_amount.")

    print("--- All Admin Tests Passed ---")

if __name__ == "__main__":
    test_admin_vip_support()
