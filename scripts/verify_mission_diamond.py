import sys
import os
from datetime import datetime

# Add project root to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.base_class import Base
from app.services.mission_service import MissionService
from app.services.game_wallet_service import GameWalletService
from app.models.user import User
from app.models.mission import Mission, MissionRewardType, UserMissionProgress, MissionCategory
from app.models.game_wallet import GameTokenType
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Override DB URL for local port 3307
DB_URL = "mysql+pymysql://xmasuser:2026@127.0.0.1:3307/xmas_event"
engine = create_engine(DB_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def verify():
    # Ensure tables exist
    Base.metadata.create_all(bind=engine)
    
    # Fix Enum for DIAMOND if missing (Validation Hack for Dev DB)
    from sqlalchemy import text
    with engine.connect() as conn:
        try:
            conn.execute(text("ALTER TABLE user_game_wallet MODIFY COLUMN token_type ENUM('ROULETTE_COIN','DICE_TOKEN','LOTTERY_TICKET','CC_COIN','GOLD_KEY','DIAMOND_KEY','DIAMOND')"))
            conn.execute(text("ALTER TABLE user_game_wallet_ledger MODIFY COLUMN token_type ENUM('ROULETTE_COIN','DICE_TOKEN','LOTTERY_TICKET','CC_COIN','GOLD_KEY','DIAMOND_KEY','DIAMOND')"))
            print("✅ DB Enum Altered for DIAMOND")
        except Exception as e:
            print(f"⚠️ Enum Alter Warning: {e}")

    db = SessionLocal()
    svc = MissionService(db)
    wallet_svc = GameWalletService()
    
    # Setup Test User
    user_id = 555555
    db.query(UserMissionProgress).filter(UserMissionProgress.user_id == user_id).delete()
    db.query(User).filter(User.id == user_id).delete()
    # Ensure a test mission exists
    db.query(Mission).filter(Mission.id == 999).delete()
    db.commit()

    user = User(id=user_id, external_id="test_diamond_mission")
    db.add(user)
    
    # Create Test Mission that gives DIAMONDS
    mission = Mission(
        id=999,
        title="Test Diamond Mission",
        logic_key="test_diamond_logic",
        description="Verify Diamond Grant",
        reward_type=MissionRewardType.DIAMOND,
        reward_amount=50,
        target_value=1,
        category=MissionCategory.SPECIAL
    )
    db.add(mission)
    db.commit()
    print(f"User & Mission Created. User ID: {user_id}")

    # 1. Complete Mission
    print("\n[Test 1] Update Progress (Complete)")
    # Manually insert progress as 'COMPLETED' (skipping update logic for speed)
    progress = UserMissionProgress(
        user_id=user_id,
        mission_id=mission.id,
        current_value=1,
        is_completed=True,
        is_claimed=False,
        reset_date="STATIC",
        completed_at=datetime.utcnow()
    )
    db.add(progress)
    db.commit()
    print("Mission Marked Completed.")

    # 2. Claim Reward
    print("\n[Test 2] Claim Reward")
    try:
        svc.claim_reward(user_id, mission.id)
        print("✅ Claim Success")
    except Exception as e:
        print(f"❌ Claim Failed: {e}")
        return

    # 3. Verify Diamond Balance
    bal = wallet_svc.get_balance(db, user_id, GameTokenType.DIAMOND)
    print(f"Diamond Balance: {bal}")
    
    if bal == 50:
        print("✅ Diamond Grant Verified (50)")
    else:
        print(f"❌ Verification Failed (Expected 50, Got {bal})")

    db.close()

if __name__ == "__main__":
    verify()
