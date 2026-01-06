
import sys
import os
import requests
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

# Add project root to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.config import get_settings
from app.services.reward_service import RewardService
from app.models.user import User
from app.schemas.common import RewardType

def verify_unified_economy():
    settings = get_settings()
    engine = create_engine(str(settings.database_url))
    SessionLocal = sessionmaker(bind=engine)
    db = SessionLocal()
    
    print("=== Unified Economy V3 Verification ===")

    try:
        # 1. Check Game Configs (DB Level)
        print("\n[1] Checking Game Configs...")
        xp_seg = db.execute(text("SELECT count(*) FROM roulette_segment WHERE reward_type='GAME_XP'")).scalar()
        print(f"  - Roulette XP Segments: {xp_seg} (Expected > 0)")
        
        xp_prize = db.execute(text("SELECT count(*) FROM lottery_prize WHERE reward_type='GAME_XP'")).scalar()
        print(f"  - Lottery XP Prizes: {xp_prize} (Expected > 0)")
        
        mission_xp = db.execute(text("SELECT count(*) FROM mission WHERE xp_reward > 0")).scalar()
        print(f"  - Missions with XP Reward: {mission_xp} (Expected > 0)")

        # 2. Functional Test: Grant Reward
        print("\n[2] Testing Reward Grant (Vault & XP)...")
        # Pydantic schema validation might fail if we don't mock request context, 
        # so we will test the SERVICE layer directly.
        
        # Get or Create Test User
        test_user = db.query(User).filter(User.username == "test_verifier_v3").first()
        if not test_user:
            test_user = User(username="test_verifier_v3", telegram_id="999999999", is_active=True)
            db.add(test_user)
            db.commit()
            print(f"  - Created test user: {test_user.id}")
        else:
            print(f"  - Using test user: {test_user.id}")
            
        initial_vault = test_user.vault_locked_balance
        initial_xp = test_user.season_xp
        
        print(f"  - Initial State: VaultLocked={initial_vault}, XP={initial_xp}")
        
        # Grant 100 POINT (Should go to Vault Locked)
        print("  > Granting 100 POINT (expected -> Vault Locked)...")
        RewardService.deliver(
            db, test_user, 
            reward_type=RewardType.POINT, 
            amount=100, 
            source="VERIFICATION_TEST", 
            commit=True
        )
        
        # Grant 50 GAME_XP
        print("  > Granting 50 GAME_XP (expected -> Season XP)...")
        RewardService.deliver(
            db, test_user,
            reward_type=RewardType.GAME_XP,
            amount=50,
            source="VERIFICATION_TEST",
            commit=True
        )
        
        db.refresh(test_user)
        
        # Verification
        vault_diff = test_user.vault_locked_balance - initial_vault
        xp_diff = test_user.season_xp - initial_xp
        
        print(f"  - Final State: VaultLocked={test_user.vault_locked_balance} (+{vault_diff}), XP={test_user.season_xp} (+{xp_diff})")
        
        if vault_diff == 100 and xp_diff == 50:
            print("\n[SUCCESS] Reward Service delivers to Vault and XP correctly.")
        else:
            print("\n[FAIL] Reward delivery mismatch.")
            print(f"  Expected Vault gain 100, got {vault_diff}")
            print(f"  Expected XP gain 50, got {xp_diff}")

    except Exception as e:
        print(f"\n[ERROR] Verification failed: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    verify_unified_economy()
