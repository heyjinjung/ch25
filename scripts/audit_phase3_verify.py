
import sys
import os
import uuid
# Add project root to sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.services.mission_service import MissionService
from app.services.user_segment_service import UserSegmentService
from app.models.mission import Mission, UserMissionProgress, MissionCategory, MissionRewardType
from app.models.user import User

def setup_test_data(db: Session):
    print("[Setup] Creating Test User and Mission...")
    
    # 1. Create User
    unique_ext_id = f"audit_p3_{uuid.uuid4().hex[:8]}"
    row_data = {
        "external_id": unique_ext_id,
        "username": unique_ext_id,
        "telegram": unique_ext_id, 
        "real_name": "Audit Phase3 User"
    }
    # Using import logic to quick create/get
    res = UserSegmentService.resolve_and_sync_user_from_import(db, row_data)
    user_id = res['user_id']
    print(f"[Setup] User Created: ID={user_id}")

    # 2. Create Mission (Requires Approval + Auto Claim)
    # This combination tests the conflict handling.
    # Logic key needs to be unique.
    logic_key = f"audit_mission_{uuid.uuid4().hex[:8]}"
    mission = Mission(
        title="Audit Approval Mission",
        description="Test mission for approval logic",
        category=MissionCategory.SPECIAL,
        logic_key=logic_key,
        action_type="TEST_ACTION",
        target_value=1,
        reward_type=MissionRewardType.DIAMOND,
        reward_amount=100,
        xp_reward=0,
        requires_approval=True,  # KEY
        auto_claim=True,         # KEY: To test if we skip it
        is_active=True,
    )
    db.add(mission)
    db.commit()
    db.refresh(mission)
    print(f"[Setup] Mission Created: ID={mission.id}, LogicKey={logic_key}, Approval=True, AutoClaim=True")
    
    return user_id, mission.id, logic_key

def verify_approval_logic(db: Session, user_id: int, mission_id: int, logic_key: str):
    print("\n[Verification] Starting Approval Logic Test...")
    service = MissionService(db)

    # 1. Complete Mission
    print(f"[Step 1] Completing Mission via update_progress (action={logic_key})...")
    # action_type acts as logic_key fallback in update_progress
    updated = service.update_progress(user_id, logic_key, delta=1)
    
    # Verify Progress
    # We need to fetch fresh state directly from DB to be sure about is_claimed
    progress = db.query(UserMissionProgress).filter(
        UserMissionProgress.user_id == user_id, 
        UserMissionProgress.mission_id == mission_id
    ).first()
    
    if not progress:
        print("❌ FAILED: Progress not created.")
        sys.exit(1)
        
    print(f"[Check] Progress: Value={progress.current_value}, Completed={progress.is_completed}, Claimed={progress.is_claimed}, Status={progress.approval_status}")
    
    if not progress.is_completed:
        print("❌ FAILED: Mission should be completed.")
        sys.exit(1)
        
    if progress.is_claimed:
        print("❌ FAILED: Auto-claim should have been SKIPPED for approval-required mission.")
        sys.exit(1)
    else:
        print("✅ PASSED: Auto-claim skipped correctly.")

    # 2. Attempt Manual Claim (Should Fail)
    print("[Step 2] Attempting Manual Claim (Expect Failure)...")
    success, msg,amt = service.claim_reward(user_id, mission_id)
    print(f"[Result] Success={success}, Message='{msg}'")
    
    if success:
        print("❌ FAILED: Claim succeeded but should have failed due to pending approval.")
        sys.exit(1)
        
    if "Approval Pending" not in msg and "not completed" not in msg: # msg may vary based on exact logic
        # Current logic returns "Approval Pending"
        if "Approval Pending" in msg:
            print("✅ PASSED: Claim blocked with 'Approval Pending'.")
        else:
            print(f"⚠️ WARNING: Unexpected message '{msg}', but claimed failed as expected.")

    # 3. Approve Mission
    print("[Step 3] Approving Mission...")
    progress.approval_status = "APPROVED" # Simulate Admin Action
    db.add(progress)
    db.commit()
    
    # 4. Attempt Manual Claim (Should Success)
    print("[Step 4] Attempting Manual Claim (Expect Success)...")
    success, msg, amt = service.claim_reward(user_id, mission_id)
    print(f"[Result] Success={success}, Message='{msg}'")
    
    if not success:
         print(f"❌ FAILED: Claim failed after approval. Message: {msg}")
         sys.exit(1)
    else:
         print("✅ PASSED: Claim succeeded after approval.")

def main():
    db = SessionLocal()
    try:
        user_id, mission_id, logic_key = setup_test_data(db)
        verify_approval_logic(db, user_id, mission_id, logic_key)
        print("\n=============================================")
        print("ALL TESTS PASSED")
        print("=============================================")
    except Exception as e:
        print(f"\n❌ FATAL ERROR: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
    finally:
        db.close()

if __name__ == "__main__":
    main()
