import sys
import os
from datetime import datetime, timedelta, timezone
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.config import get_settings
from app.models.user import User
from app.models.mission import Mission, UserMissionProgress
from app.services.mission_service import MissionService

def verify_bonus():
    settings = get_settings()
    engine = create_engine(settings.database_url)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()

    # 1. Setup User
    suffix = datetime.now().strftime("%H%M%S")
    user = User(
        external_id=f"test_new_{suffix}",
        nickname=f"TestNewUser_{suffix}",
        telegram_id=123456789 + int(suffix),
        vault_locked_balance=10000,
        vault_locked_expires_at=datetime.now(timezone.utc) + timedelta(hours=24),
        cash_balance=0
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    print(f"User Created: {user.id}, Locked: {user.vault_locked_balance}")

    # 2. Trigger Mission Progress
    # Find "NEW_USER_PLAY_1" which we sseded
    mission = db.query(Mission).filter(Mission.logic_key == "NEW_USER_PLAY_1").first()
    if not mission:
        print("ERROR: Mission NEW_USER_PLAY_1 not found!")
        return

    ms = MissionService(db)
    # Trigger PLAY_GAME
    ms.update_progress(user.id, "PLAY_GAME", 1)
    
    # Check Progress
    progress = db.query(UserMissionProgress).filter(
        UserMissionProgress.user_id == user.id,
        UserMissionProgress.mission_id == mission.id
    ).first()
    
    if not progress or not progress.is_completed:
        print(f"ERROR: Mission not completed. Val: {progress.current_value if progress else 'None'}")
        return
    else:
        print("Mission Completed.")

    # 3. Claim Reward
    success, r_type, amount = ms.claim_reward(user.id, mission.id)
    if not success:
        print("ERROR: Claim failed.")
        return
    
    print(f"Claimed: {r_type} Amount: {amount}")

    # 4. Verify Balance
    db.refresh(user)
    print(f"Final Balances -> Locked: {user.vault_locked_balance}, Cash: {user.cash_balance}")
    
    if user.cash_balance == 2500 and user.vault_locked_balance == 7500:
        print("SUCCESS: Balances updated correctly.")
    else:
        print("FAILURE: Balances incorrect.")

    db.close()

if __name__ == "__main__":
    verify_bonus()
