import sys
import os

# Add project root to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.session import SessionLocal
from app.services.mission_service import MissionService
from app.models.mission import Mission, MissionCategory, MissionRewardType
from app.models.user import User

def verify_mission_crash():
    db = SessionLocal()
    try:
        # 1. Create Test User with Telegram ID (to trigger Nudge)
        user = db.query(User).filter(User.id == 888888).first()
        if not user:
            user = User(id=888888, external_id="crash_test", nickname="CrashTester", telegram_id=123456789)
            db.add(user)
            db.commit()
            print("Created Test User 888888")
        else:
             # Ensure telegram_id is set
             if not user.telegram_id:
                 user.telegram_id = 123456789
                 db.commit()

        # 2. Create/Get Mission with Target 26
        mission = db.query(Mission).filter(Mission.logic_key == "crash_test_26").first()
        if not mission:
            mission = Mission(
                title="Crash Test 26",
                category=MissionCategory.SPECIAL,
                logic_key="crash_test_26",
                action_type="CRASH_TEST",
                target_value=26,
                reward_type=MissionRewardType.DIAMOND,
                reward_amount=10
            )
            db.add(mission)
            db.commit()
            print("Created Crash Test Mission")

        # 3. Set Progress to 24 (using raw SQL or Service? Service creates if not exists)
        # We want to test the transition 24 -> 25 which triggers Nudge (26-1=25)
        # First, ensure progress is at 24.
        ms = MissionService(db)
        # Clear existing
        from app.models.mission import UserMissionProgress
        db.query(UserMissionProgress).filter(UserMissionProgress.user_id == user.id, UserMissionProgress.mission_id == mission.id).delete()
        db.commit()

        # Update to 24
        print("Setting progress to 24...")
        ms.update_progress(user.id, "CRASH_TEST", delta=24)
        
        # 4. Trigger the Crash (24 -> 25)
        print("Triggering 24 -> 25 update (Should trigger Nudge)...")
        ms.update_progress(user.id, "CRASH_TEST", delta=1)
        print("Success! Progress updated to 25. No Crash.")

    except Exception as e:
        print(f"CRASH DETECTED: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    verify_mission_crash()
