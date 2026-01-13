import sys
import os
import uuid
import logging
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

# 1. Environment Setup
sys.path.append(os.getcwd())
os.environ["DatabaseUrl"] = "mysql+pymysql://xmas_user:xmas_password@127.0.0.1:3306/xmas_event"

from app.db.base import Base
from app.db.session import SessionLocal
from app.models.user import User
from app.models.mission import Mission, UserMissionProgress, MissionRewardType, MissionCategory, ApprovalStatus

class MissionActionType:
    PLAY_GAME = "PLAY_GAME"
    LOGIN = "LOGIN"
from app.models.season_pass import SeasonPassConfig, SeasonPassProgress
from app.services.mission_service import MissionService
from app.services.reward_service import RewardService
from datetime import datetime, date
from app.services.season_pass_service import SeasonPassService

# Configure Logging
logging.basicConfig(level=logging.INFO, format='[%(levelname)s] %(message)s')
logger = logging.getLogger(__name__)

def run_verification():
    db = SessionLocal()
    try:
        logger.info("=============================================")
        logger.info("Phase 3 Verification Scenarios (Section 3-3)")
        logger.info("=============================================")

        # ---------------------------------------------------------
        # Setup: Create Test User
        # ---------------------------------------------------------
        unique_id = str(uuid.uuid4())[:8]
        test_user = User(
            external_id=f"verify_p3_{unique_id}",
            nickname=f"Verifier_{unique_id}"
        )
        db.add(test_user)
        db.commit()
        db.refresh(test_user)
        user_id = test_user.id
        logger.info(f"[Setup] User Created: ID={user_id}, Nickname={test_user.nickname}")

        # Ensure Season Pass Config exists (Active)
        season = db.query(SeasonPassConfig).filter_by(is_active=True).first()
        if not season:
            season = SeasonPassConfig(
                season_name=f"Verify Season {unique_id}",
                start_date=datetime.now().date(),
                end_date=datetime.now().date(), # Valid just for today
                max_level=20,
                base_xp_per_stamp=10,
                is_active=True
            )
            db.add(season)
            db.commit()
            logger.info(f"[Setup] Created Active Season: {season.season_name}")
        
        # Instantiate Services
        sp_service = SeasonPassService()
        reward_service = RewardService()
        mission_service = MissionService(db)

        # ---------------------------------------------------------
        # Scenario RW-001: POINT Grant correctness
        # ---------------------------------------------------------
        logger.info("\n[RW-001] Testing POINT Grant (Should go to Vault Locked)...")
        initial_vault = test_user.vault_locked_balance
        reward_service.deliver(db, user_id, "POINT", 1000)
        db.refresh(test_user)
        
        if test_user.vault_locked_balance == initial_vault + 1000:
            logger.info("✅ PASSED: Vault Locked Balance increased by 1000.")
        else:
            logger.error(f"❌ FAILED: Expected {initial_vault + 1000}, Got {test_user.vault_locked_balance}")
            sys.exit(1)

        # ---------------------------------------------------------
        # Scenario RW-002: GAME_XP Grant correctness
        # ---------------------------------------------------------
        logger.info("\n[RW-002] Testing GAME_XP Grant (Should increase Season XP)...")
        sp_progress = sp_service.get_or_create_progress(db, user_id=user_id, season_id=season.id)
        initial_xp = sp_progress.current_xp
        reward_service.deliver(db, user_id, "GAME_XP", 50)
        db.refresh(sp_progress)
        
        if sp_progress.current_xp == initial_xp + 50:
             logger.info("✅ PASSED: Season XP increased by 50.")
        else:
             logger.error(f"❌ FAILED: Expected {initial_xp + 50}, Got {sp_progress.current_xp}")
             sys.exit(1)

        # ---------------------------------------------------------
        # Scenario MS-001 & MS-002 & MS-003: Mission Progress -> Complete -> Claim
        # ---------------------------------------------------------
        logger.info("\n[MS-001/002/003] Testing Mission Lifecycle (Progress->Complete->Claim)...")
        
        # Create Test Mission
        mission_logic_key = f"verify_mission_{unique_id}"
        mission = Mission(
            title="Verify Mission",
            category=MissionCategory.DAILY,
            logic_key=mission_logic_key,
            action_type=MissionActionType.PLAY_GAME,
            target_value=1,
            reward_type=MissionRewardType.CASH_UNLOCK,
            reward_amount=500,
            auto_claim=False,
            is_active=True,
            requires_approval=False
        )
        db.add(mission)
        db.commit()
        
        # 1. Update Progress
        mission_service.update_progress(user_id, mission_logic_key, 1)
        progress = db.query(UserMissionProgress).filter_by(user_id=user_id, mission_id=mission.id).first()
        
        if progress and progress.current_value == 1 and progress.is_completed:
            logger.info("✅ PASSED: Mission Progress updated and marked Completed.")
        else:
            logger.error("❌ FAILED: Mission Progress update failed.")
            sys.exit(1)
            
        # 2. Claim Reward
        initial_vault_2 = test_user.vault_locked_balance
        success, msg, amount = mission_service.claim_reward(user_id, mission.id)
        db.refresh(test_user)
        db.refresh(progress)
        
        if success and progress.is_claimed and test_user.vault_locked_balance == initial_vault_2 + 500:
             logger.info("✅ PASSED: Reward Claimed successfully and Vault updated.")
        else:
             logger.error(f"❌ FAILED: Claim failed. Success={success}, Msg={msg}, Claimed={progress.is_claimed}")
             sys.exit(1)

        logger.info("\n=============================================")
        logger.info("ALL SCENARIOS PASSED")
        logger.info("=============================================")

    except Exception as e:
        logger.error(f"❌ EXCEPTION: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
    finally:
        db.close()

if __name__ == "__main__":
    run_verification()
