import sys
import os
import argparse
from datetime import datetime
from sqlalchemy import text

# Add project root to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.session import SessionLocal
from app.models.user import User
from app.models.mission import Mission, UserMissionProgress, MissionCategory
from app.services.mission_service import MissionService

def debug_user_missions(user_id: int):
    db = SessionLocal()
    try:
        user = db.get(User, user_id)
        if not user:
            print(f"❌ User found with ID {user_id}")
            return

        print(f"🔍 DEBUGGING USER: {user.nickname} (ID: {user.id})")
        print(f"   Telegram ID: {user.telegram_id} ({'✅ Linked' if user.telegram_id else '❌ MISSING'})")
        print(f"   Telegram Username: {user.telegram_username}")
        
        # 1. Mission Progress from Service (What frontend sees)
        ms = MissionService(db)
        missions_view = ms.get_user_missions(user_id)
        
        print("\n📋 ACTIVE MISSIONS & PROGRESS:")
        found_starter_channel = False
        
        for m in missions_view:
            mission = m['mission']
            progress = m['progress']
            status_icon = "✅" if progress['is_completed'] else "⏳"
            claim_icon = "💰" if progress['is_claimed'] else "Checking..."
            
            if mission['logic_key'] == 'starter_channel_join':
                found_starter_channel = True
                print(f"   👉 [{mission['logic_key']}] {mission['title']}")
                print(f"      Status: {status_icon} (Val: {progress['current_value']}/{mission['target_value']})")
                print(f"      Claimed: {progress['is_claimed']}")
                print(f"      Approval: {progress['approval_status']}")
                
                # Deep dive if stuck
                if not progress['is_completed'] and not user.telegram_id:
                     print("      ⚠️  WARNING: User missing Telegram ID. Cannot pass 'Verify Channel'.")
            
            elif mission['category'] == MissionCategory.NEW_USER:
                 print(f"   [{mission['logic_key']}] {mission['title']} -> Compl: {progress['is_completed']}, Claimed: {progress['is_claimed']}")

        if not found_starter_channel:
            print("\n❌ 'starter_channel_join' mission NOT FOUND in active list!")
            # Check DB directly in case inactive
            m_db = db.query(Mission).filter(Mission.logic_key == 'starter_channel_join').first()
            if m_db:
                print(f"   (DB Check) Mission exists but isActive={m_db.is_active}")
            else:
                 print("   (DB Check) Mission row does NOT exist.")

        # 2. Check Event Logs for recent actions
        print("\n📜 RECENT EVENT LOGS (Last 10):")
        # Assuming UserEventLog model exists and has created_at
        from app.models.feature import UserEventLog
        logs = db.query(UserEventLog).filter(UserEventLog.user_id == user_id).order_by(UserEventLog.id.desc()).limit(10).all()
        for l in logs:
            print(f"   [{l.created_at}] {l.event_name} (Meta: {l.meta_json})")

    except Exception as e:
        print(f"❌ Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("user_id", type=int, help="Target User ID")
    args = parser.parse_args()
    
    debug_user_missions(args.user_id)
