
from sqlalchemy.orm import Session
from app.main import app
from app.api.deps import get_db
from app.models.user import User
from app.models.mission import Mission, MissionCategory, MissionRewardType, UserMissionProgress
from app.services.mission_service import MissionService
import uuid

def test_claim_lock_syntax():
    # Helper to clean up
    db = next(get_db())
    
    # 1. Setup User & Mission
    try:
        ext_id = f"test_lock_{uuid.uuid4()}"
        user = User(external_id=ext_id, nickname="LockTester")
        db.add(user)
        db.flush()
        
        m_key = f"lock_test_{uuid.uuid4()}"
        mission = Mission(
            title="Lock Test",
            category=MissionCategory.NEW_USER,
            logic_key=m_key,
            action_type="LOCK_TEST",
            target_value=1,
            reward_type=MissionRewardType.NONE,
            reward_amount=0,
            is_active=True
        )
        db.add(mission)
        db.commit()
        db.refresh(user)
        db.refresh(mission)
        
        # 2. Add Progress
        ms = MissionService(db)
        # Manually insert progress to be ready to claim
        reset_date = ms.get_reset_date_str(mission.category)
        prog = UserMissionProgress(
            user_id=user.id,
            mission_id=mission.id,
            reset_date=reset_date,
            current_value=1,
            is_completed=True,
            is_claimed=False
        )
        db.add(prog)
        db.commit()
        
        # 3. Try Claim (Should trigger with_for_update)
        # We can't easily test actual concurrency in this script without threads,
        # but we can verify the SQL doesn't error out (syntax check).
        print("Attempting claim with lock...")
        success, _, _ = ms.claim_reward(user.id, mission.id)
        
        if success:
            print("SUCCESS: Claimed successfully with lock present.")
        else:
            print("FAIL: Claim returned False.")
            
    except Exception as e:
        print(f"CRASH: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_claim_lock_syntax()
