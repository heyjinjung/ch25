import sys
import os
import argparse
from sqlalchemy import text

# Add project root to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.session import SessionLocal
from app.models.user import User
from app.models.mission import Mission, UserMissionProgress, MissionCategory
from app.services.mission_service import MissionService

def fix_user_131(user_id: int = 131, telegram_id: str = "7244114385", username: str = "chan1502", nickname: str = "참참새"):
    db = SessionLocal()
    try:
        user = db.get(User, user_id)
        if not user:
            print(f"❌ User {user_id} NOT FOUND.")
            return

        print(f"🔧 FIXING USER: {user.nickname} (ID: {user.id})")
        
        # 1. Update Profile (Telegram ID is CRITICAL for channel join)
        changed = False
        if str(user.telegram_id) != str(telegram_id):
            print(f"   👉 Updating Telegram ID: {user.telegram_id} -> {telegram_id}")
            user.telegram_id = telegram_id
            changed = True
        
        if user.telegram_username != username:
            print(f"   👉 Updating Username: {user.telegram_username} -> {username}")
            user.telegram_username = username
            changed = True

        if changed:
            db.commit()
            db.refresh(user)
            print("   ✅ User Profile Updated.")
        else:
            print("   ✅ User Profile already correct.")

        # 2. Reset Mission Progress (NEW_USER)
        print("\nwm RESETTING 'NEW_USER' Missions...")
        cat_enum = MissionCategory.NEW_USER
        missions = db.query(Mission).filter(Mission.category == cat_enum).all()
        mission_ids = [m.id for m in missions]
        
        if mission_ids:
            rows = db.query(UserMissionProgress).filter(
                UserMissionProgress.user_id == user_id,
                UserMissionProgress.mission_id.in_(mission_ids)
            ).delete(synchronize_session=False)
            db.commit()
            print(f"   ✅ Deleted {rows} progress records (Ready to Re-test).")
        else:
            print("   ⚠️ No NEW_USER missions found to reset.")

        # 3. Verify State
        print("\n🔍 VERIFYING STATE...")
        ms = MissionService(db)
        missions_view = ms.get_user_missions(user_id)
        
        found_cf = False
        for m in missions_view:
            if m['mission']['logic_key'] == 'starter_channel_join':
                found_cf = True
                print(f"   👉 [starter_channel_join]: Status={m['progress']['is_completed']}, Val={m['progress']['current_value']}")
                if user.telegram_id:
                     print("      ✅ Telegram ID Linked. 'Verify Channel' should PASS now.")
                else:
                     print("      ❌ Telegram ID STILL MISSING!")

        if not found_cf:
             print("   ⚠️ 'starter_channel_join' mission not active.")

    except Exception as e:
        print(f"❌ Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--user_id", type=int, default=131)
    args = parser.parse_args()
    
    fix_user_131(user_id=args.user_id)
