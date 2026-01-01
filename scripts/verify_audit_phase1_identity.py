
import sys
import os
from pathlib import Path
from datetime import datetime

# Add project root to path
sys.path.append(str(Path(__file__).parent.parent))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.db.base_class import Base
from app.models.user import User
from app.models.admin_user_profile import AdminUserProfile
from app.services.user_segment_service import UserSegmentService

def test_audit_identity_sync():
    # Setup In-Memory DB
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()

    print("--- Deep Audit: User Identity & Sync Start ---")

    # Scenario 1: Basic Sync
    # User exists, Profile imported referencing that user
    print("\n[1] Testing Basic Profile Sync...")
    u1 = User(id=1, external_id="ext_user1", nickname="User1", telegram_id=1001)
    db.add(u1)
    db.commit()
    
    # Simulate CSV Import Logic (Manual upsert)
    profile_data = {
        "external_id": "ext_user1",
        "real_name": "Real User 1",
        "telegram_id": "1001", # String in profile vs BigInt in User
        "tags": ["verified"]
    }
    UserSegmentService.upsert_user_profile(db, 1, profile_data)
    
    p1 = UserSegmentService.get_user_profile(db, 1)
    print(f"   -> User.telegram_id: {u1.telegram_id} (Type: {type(u1.telegram_id)})")
    print(f"   -> Profile.telegram_id: {p1.telegram_id} (Type: {type(p1.telegram_id)})")
    
    # Check if they "match" loosely
    assert str(u1.telegram_id) == p1.telegram_id
    print("   -> PASSED: Basic Sync (Field Match)")

    # Scenario 2: Divergence
    # User changes Telegram ID in app (e.g., reconnects), but Admin Profile has old ID
    print("\n[2] Testing Divergence (User Update)...")
    u1.telegram_id = 9999
    db.commit()
    
    # Profile should still have old one unless re-imported
    p1_reload = UserSegmentService.get_user_profile(db, 1)
    print(f"   -> User New Telegram ID: {u1.telegram_id}")
    print(f"   -> Profile Old Telegram ID: {p1_reload.telegram_id}")
    
    if str(u1.telegram_id) != p1_reload.telegram_id:
        print("   -> [INFO] Discrepancy detected as expected. Admin Profile does not auto-update from User table.")
    else:
        print("   -> [WARN] Profile auto-updated? (Unexpected behavior for CRM profiles usually)")

    # Scenario 3: Import causing conflict?
    # Importing a profile with a NEW telegram ID. Does it update the User Core table? 
    # (Based on admin_crm.py code, upsert_user_profile only updates AdminUserProfile, not User)
    print("\n[3] Testing Import Side-Effect...")
    new_profile_data = {
        "external_id": "ext_user1",
        "telegram_id": "8888", 
        "real_name": "Updated Name"
    }
    UserSegmentService.upsert_user_profile(db, 1, new_profile_data)
    
    db.refresh(u1)
    p1_final = UserSegmentService.get_user_profile(db, 1)
    
    print(f"   -> Profile Updated Telegram ID: {p1_final.telegram_id}")
    print(f"   -> User Core Telegram ID: {u1.telegram_id} (Should reflect User state, not CSV import override typically)")
    
    # Logic Verification: The system treats AdminUserProfile as "Manual/CRM Data" and User as "Live App Data".
    # They CAN diverge. This audit confirms that behavior.
    assert p1_final.telegram_id == "8888"
    assert u1.telegram_id == 9999
    print("   -> PASSED: Isolation Verified (Import does not overwrite Core App Identity blindly)")

    # Scenario 4: Telegram Username Sync (User Request Critical)
    # Testing if 'telegram' column in CSV updates User.telegram_username?
    # NOW Testing new Refactored Method: `resolve_and_sync_user_from_import`
    print("\n[4] Testing Telegram Username Sync (REFACTORED)...")
    u1.telegram_username = "real_username_v1"
    db.commit()
    
    # Simulate CSV Row
    row_data_v2 = {
        "external_id": "ext_user1",
        "telegram": "new_username_v2", # CSV header 'telegram'
        "real_name": "Sync Test User"
    }
    
    # Call the new Service Method directly (as AdminCRM route would)
    UserSegmentService.resolve_and_sync_user_from_import(db, row_data_v2)
    
    db.refresh(u1)
    p1_v2 = UserSegmentService.get_user_profile(db, 1)
    
    print(f"   -> User Core Username: {u1.telegram_username}")
    print(f"   -> Profile Telegram Field: {p1_v2.telegram_id}")
    
    if u1.telegram_username == "new_username_v2":
        print("   -> [SUCCESS] Core User.telegram_username UPDATED by CSV Import.")
    else:
        print("   -> [FAIL] Core User.telegram_username NOT updated.")
    
    assert u1.telegram_username == "new_username_v2"
    print("   -> PASSED: Identity Sync Works")

    # Scenario 5: Frame Switch Test - Import by Username ONLY (No External ID)
    # User wants to switch frame to Telegram Username. 
    print("\n[5] Testing Frame Switch: Import by Username Only...")
    
    # Create a user with NO external_id logic in mind, just username
    u3 = User(id=3, external_id="u3_legacy", nickname="User3", telegram_username="target_username")
    db.add(u3)
    db.commit()

    # Try to import profile using "telegram" column matching "target_username"
    row_data_v3 = {
        # No external_id in CSV data
        "telegram": "target_username", 
        "real_name": "Username Based Import"
    }
    
    result = UserSegmentService.resolve_and_sync_user_from_import(db, row_data_v3)
    
    print(f"   -> Import Result: {result}")
    
    if result["success"] and result["user_id"] == 3:
         print("   -> [SUCCESS] User Resolved by Username correctly.")
    else:
         print(f"   -> [FAIL] User Resolution failed. Result: {result}")

    assert result["success"] is True
    assert result["user_id"] == 3
    print("   -> PASSED: Frame Switch Logic Verified")

    print("\n--- Deep Audit Completed (Refactor Version) ---")

if __name__ == "__main__":
    test_audit_identity_sync()
