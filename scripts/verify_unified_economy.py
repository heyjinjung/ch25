import sys
import os
from datetime import datetime, date, timedelta

# Add project root to path
sys.path.append(os.getcwd())

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.db.base_class import Base
from app.core.config import get_settings
from app.models.user import User
from app.models.season_pass import SeasonPassConfig, SeasonPassProgress
from app.models.user_cash_ledger import UserCashLedger
from app.services.reward_service import RewardService
from app.services.vault2_service import Vault2Service
from app.services.season_pass_service import SeasonPassService

def run_verification():
    settings = get_settings()
    # Note: Ensure DATABASE_URL points to the correct DB (e.g. localhost:3307 for local test)
    # db_url = settings.database_url.replace("@db:3306", "@localhost:3307")
    engine = create_engine(settings.database_url)
    
    # [Verification fix] Patch local DB schema for missing columns
    from sqlalchemy import text
    try:
        with engine.connect() as conn:
            conn.execute(text("ALTER TABLE user ADD COLUMN login_streak INTEGER DEFAULT 0"))
            conn.execute(text("ALTER TABLE user ADD COLUMN last_streak_updated_at DATETIME NULL"))
            conn.execute(text("ALTER TABLE user ADD COLUMN streak_vault_bonus_date DATE NULL"))
            conn.execute(text("ALTER TABLE user ADD COLUMN streak_vault_bonus_started_at DATETIME NULL"))
            conn.execute(text("ALTER TABLE user ADD COLUMN play_streak INTEGER DEFAULT 0"))
            conn.execute(text("ALTER TABLE user ADD COLUMN last_play_date DATE NULL"))
            conn.commit()
            print("[Setup] Patched local DB schema with missing columns.")
    except Exception as e:
        print(f"[Setup] Schema patch skipped (likely already exists): {e}")
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()

    print("=== Unified Economy Refactoring Verification ===")

    try:
        # 1. Setup Test User
        timestamp = int(datetime.utcnow().timestamp())
        external_id = f"test_{timestamp}"
        user = User(
            external_id=external_id,
            nickname=f"Tester_{timestamp}",
            cash_balance=0,
            vault_balance=0,
            vault_locked_balance=0
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        print(f"[Setup] Created User ID: {user.id}")

        # 2. Setup Active Season (if needed for XP test)
        season_service = SeasonPassService()
        active_season = season_service.get_current_season(db, datetime.utcnow())
        if not active_season:
            print("[Setup] No active season found. Creating temporary season...")
            active_season = SeasonPassConfig(
                season_name=f"Test Season {timestamp}",
                start_date=date.today(),
                end_date=date.today() + timedelta(days=30),
                is_active=True,
                max_level=100,
                base_xp_per_stamp=10
            )
            db.add(active_season)
            db.commit()
            db.refresh(active_season)
            print(f"[Setup] Created Season ID: {active_season.id}")
        else:
            print(f"[Setup] Using Active Season ID: {active_season.id}")

        # 3. Test RewardService: POINT -> Vault Locked
        print("\n--- Test 1: RewardService 'POINT' Delivery ---")
        reward_service = RewardService()
        reward_amount = 5000
        
        # Verify call with commit=True (default)
        reward_service.deliver(
            db, 
            user_id=user.id, 
            reward_type="POINT", 
            reward_amount=reward_amount, 
            meta={"reason": "TEST_REWARD", "label": "Integration Test"}
        )
        
        db.refresh(user)
        print(f"[Check] User Vault Locked Balance: {user.vault_locked_balance} (Expected: {reward_amount})")
        
        # Verify Ledger
        ledger = db.query(UserCashLedger).filter(
            UserCashLedger.user_id == user.id,
            UserCashLedger.reason == "TEST_REWARD"
        ).order_by(UserCashLedger.id.desc()).first()
        
        if ledger:
            print(f"[Check] Ledger Found: ID={ledger.id}, Delta={ledger.delta}, Meta={ledger.meta_json}")
            asset_type = (ledger.meta_json or {}).get("asset_type")
            print(f"[Check] Ledger Asset Type: '{asset_type}' (Expected: 'VAULT')")
            if asset_type != "VAULT":
                print(">>> FAIL: Ledger asset_type mismatch")
        else:
            print(">>> FAIL: No Ledger found for POINT reward")

        if user.vault_locked_balance == reward_amount:
            print(">>> PASS: POINT correctly routed to Vault.")
        else:
            print(f">>> FAIL: Balance mismatch. {user.vault_locked_balance} != {reward_amount}")


        # 4. Test RewardService: GAME_XP -> Season XP
        print("\n--- Test 2: RewardService 'GAME_XP' Delivery ---")
        xp_amount = 100
        reward_service.deliver(
            db,
            user_id=user.id,
            reward_type="GAME_XP",
            reward_amount=xp_amount,
            meta={"reason": "TEST_XP"}
        )
        
        # Check Progress
        progress = season_service.get_or_create_progress(db, user.id, active_season.id)
        db.refresh(progress)
        print(f"[Check] Season Progress XP: {progress.current_xp} (Expected >= {xp_amount})")
        
        if progress.current_xp >= xp_amount:
            print(">>> PASS: GAME_XP correctly added to Season Progress.")
        else:
            print(">>> FAIL: XP not added.")


        # 5. Test Admin Vault Update (Vault2Service)
        print("\n--- Test 3: Admin Vault Update (Vault2Service) ---")
        vault2_service = Vault2Service()
        admin_delta = 2000
        current_locked = user.vault_locked_balance
        
        vault2_service.update_balance(
            db,
            user_id=user.id,
            locked_delta=admin_delta,
            available_delta=0,
            reason="ADMIN_TEST_ADJUST",
            admin_id=999
        )
        
        db.refresh(user)
        expected_locked = current_locked + admin_delta
        print(f"[Check] User Vault Locked Balance: {user.vault_locked_balance} (Expected: {expected_locked})")
        
        # Check Ledger for Admin Action
        admin_ledger = db.query(UserCashLedger).filter(
            UserCashLedger.user_id == user.id,
            UserCashLedger.reason == "ADMIN_TEST_ADJUST"
        ).first()
        
        if admin_ledger:
            print(f"[Check] Admin Ledger Found: Delta={admin_ledger.delta}, Meta={admin_ledger.meta_json}")
            if admin_ledger.meta_json.get("asset_type") == "VAULT":
                print(">>> PASS: Admin update logged to UserCashLedger with asset_type='VAULT'.")
            else:
                print(">>> FAIL: Admin update missing 'asset_type' in meta.")
        else:
            print(">>> FAIL: No Ledger created for Admin Update.")

    except Exception as e:
        error_msg = f"\nERROR: Verification Failed with exception: {e}\n"
        print(error_msg)
        import traceback
        with open("verification_error.log", "w") as f:
            f.write(error_msg)
            traceback.print_exc(file=f)
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    run_verification()
