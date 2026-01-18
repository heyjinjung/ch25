import sys
import os
import argparse
from sqlalchemy import text

# Add project root to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.session import SessionLocal
from app.models.user import User
from app.models.mission import Mission, UserMissionProgress, MissionCategory

def reset_user_missions(user_id: int, category: str = "NEW_USER"):
    db = SessionLocal()
    try:
        user = db.get(User, user_id)
        if not user:
            print(f"❌ User found with ID {user_id}")
            return

        print(f"🗑️  RESETTING Missions for: {user.nickname} (ID: {user.id})")
        print(f"   Target Category: {category}")
        
        # 1. Find Missions in Category
        if category == "ALL":
             missions = db.query(Mission).all()
        else:
             cat_enum = MissionCategory(category)
             missions = db.query(Mission).filter(Mission.category == cat_enum).all()
        
        mission_ids = [m.id for m in missions]
        if not mission_ids:
            print("   No missions found for this category.")
            return

        print(f"   Found {len(mission_ids)} missions to reset.")

        # 2. Delete Progress
        rows = db.query(UserMissionProgress).filter(
            UserMissionProgress.user_id == user_id,
            UserMissionProgress.mission_id.in_(mission_ids)
        ).delete(synchronize_session=False)
        
        db.commit()
        print(f"✅ Deleted {rows} progress records.")
        print("   User can now re-start these missions.")

    except Exception as e:
        print(f"❌ Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("user_id", type=int, help="Target User ID (e.g., 131)")
    parser.add_argument("--category", type=str, default="NEW_USER", help="Mission Category (NEW_USER, DAILY, WEEKLY, ALL)")
    args = parser.parse_args()
    
    reset_user_missions(args.user_id, args.category)
