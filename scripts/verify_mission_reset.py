import sys
import os
from datetime import datetime, timedelta

# Add project root to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.base_class import Base
from app.services.mission_service import MissionService
from app.models.user import User
from app.models.mission import Mission, MissionRewardType, UserMissionProgress, MissionCategory
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Override DB URL for local port 3307
DB_URL = "mysql+pymysql://xmasuser:2026@127.0.0.1:3307/xmas_event"
engine = create_engine(DB_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def verify():
    # Ensure tables exist
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    svc = MissionService(db)
    
    # Setup Test User
    user_id = 222222
    db.query(UserMissionProgress).filter(UserMissionProgress.user_id == user_id).delete()
    db.query(User).filter(User.id == user_id).delete()
    # Ensure a test mission exists
    db.query(Mission).filter(Mission.id == 888).delete()
    db.commit()

    user = User(id=user_id, external_id="test_reset")
    db.add(user)
    
    mission = Mission(
        id=888,
        title="Daily Mission Test",
        logic_key="daily_test_logic",
        description="Verify Reset",
        reward_type=MissionRewardType.DIAMOND,
        reward_amount=10,
        target_value=10,
        category=MissionCategory.DAILY
    )
    db.add(mission)
    db.commit()
    print(f"User & Mission Created. User ID: {user_id}")

    # 1. Simulate "Yesterday's" Progress
    print("\n[Test 1] Insert Old Progress (Yesterday)")
    yesterday_str = (datetime.utcnow() - timedelta(days=1)).strftime("%Y-%m-%d")
    old_progress = UserMissionProgress(
        user_id=user_id,
        mission_id=mission.id,
        current_value=5,
        is_completed=False,
        is_claimed=False,
        reset_date=yesterday_str
    )
    db.add(old_progress)
    db.commit()
    print(f"Inserted Progress with reset_date='{yesterday_str}' (Value: 5)")

    # 2. Fetch Missions (Should see 0 progress for Today)
    print("\n[Test 2] Fetch Missions (Today)")
    missions_data = svc.get_user_missions(user_id)
    target_data = next((m for m in missions_data if m["mission"].id == mission.id), None)
    
    if target_data:
        curr_val = target_data["progress"]["current_value"]
        print(f"Fetched Current Value: {curr_val}")
        if curr_val == 0:
            print("✅ Reset Verified (Value is 0, ignoring yesterday's 5)")
        else:
            print(f"❌ Reset Failed (Expected 0, Got {curr_val})")
    else:
        print("❌ Mission Not Found in List")

    # 3. Update Progress (Should create NEW row for Today)
    print("\n[Test 3] Update Progress (+1)")
    svc.update_progress(user_id, "daily_test_logic", 1)
    
    today_str = datetime.utcnow().strftime("%Y-%m-%d")
    new_row = db.query(UserMissionProgress).filter(
        UserMissionProgress.user_id == user_id,
        UserMissionProgress.mission_id == mission.id,
        UserMissionProgress.reset_date == today_str
    ).first()
    
    if new_row and new_row.current_value == 1:
        print(f"✅ New Row Verified (reset_date='{today_str}', Value: 1)")
    else:
        print("❌ New Row Creation Failed")

    db.close()

if __name__ == "__main__":
    verify()
