import sys
import os
from datetime import datetime
from copy import deepcopy
from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker

# Add app to path
sys.path.append("c:/Users/JAVIS/ch/ch25")

from app.db.base_class import Base
from app.db.session import SessionLocal, engine
from app.services.vault_service import VaultService
from app.services.vault2_service import Vault2Service
from app.models.user import User
from app.models.vault_earn_event import VaultEarnEvent
from app.models.vault2 import VaultProgram
from sqlalchemy.orm.attributes import flag_modified

def setup_test_user(db):
    # Create or get a test user
    user = db.query(User).filter(User.external_id == "audit_test_user").first()
    if not user:
        user = User(
            external_id="audit_test_user",
            nickname="AuditTester",
            vault_locked_balance=0,
            vault_available_balance=0
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    else:
        # Reset balance
        user.vault_locked_balance = 0
        user.vault_available_balance = 0
        
        # Clear previous test events to ensure clean slate for validation
        db.query(VaultEarnEvent).filter(VaultEarnEvent.user_id == user.id).delete()
        
        db.commit()
    return user

def setup_config(db, force_on=True):
    v2 = Vault2Service()
    # Ensure program exists
    v2._ensure_default_program(db)
    
    # Get effective config first
    gh_cfg = deepcopy(v2.get_config_value(db, "golden_hour_config") or {})
    
    # Update values
    gh_cfg["enabled"] = True
    gh_cfg["manual_override"] = "FORCE_ON" if force_on else "AUTO"
    gh_cfg["multiplier"] = 2.0
    
    # Use service method to update
    v2.update_config_value(
        db, 
        program_key=v2.DEFAULT_PROGRAM_KEY, 
        key="golden_hour_config", 
        value=gh_cfg,
        admin_id=999
    )
    
    # Verify again (Optional)
    # new_val = v2.get_config_value(db, "golden_hour_config")
    # print(f"[*] Verified Config from DB: {new_val}")

def run_verification():
    db = SessionLocal()
    try:
        print("=== Phase 6 Verification Start ===")
        user = setup_test_user(db)
        setup_config(db, force_on=True)
        
        service = VaultService()
        
        # Scenario 1: WIN (Gate 200) -> Expect 400
        print("\n[Test 1] Simulating WIN (Base 200)...")
        service.record_game_play_earn_event(
            db, 
            user_id=user.id, 
            game_type="DICE", 
            game_log_id=1001, 
            token_type="DICE_TOKEN", 
            outcome="WIN", 
            payout_raw={"reward_amount": 200, "mode": "NORMAL"}
        )
        
        # Scenario 2: LOSE (Gate -50) -> Expect -100
        print("[Test 2] Simulating LOSE (Base -50)...")
        service.record_game_play_earn_event(
            db, 
            user_id=user.id, 
            game_type="DICE", 
            game_log_id=1002, 
            token_type="DICE_TOKEN", 
            outcome="LOSE", 
            payout_raw={"reward_amount": -50, "mode": "NORMAL"}
        )
        
        # Scenario 3: Non-Gate (7777) -> Expect 7777 (Multiplier should revert to 1.0)
        print("[Test 3] Simulating Event Reward (7777)...")
        service.record_game_play_earn_event(
            db, 
            user_id=user.id, 
            game_type="DICE", 
            game_log_id=1003, 
            token_type="DICE_TOKEN", 
            outcome="EVENT_WIN", 
            payout_raw={"reward_amount": 7777, "mode": "EVENT"}
        )
        
        # Verify Results
        db.refresh(user)
        print(f"\n[Result] User Vault Locked Balance: {user.vault_locked_balance} (Expected: 400 - 100 + 7777 = 8077)")
        
        events = db.query(VaultEarnEvent).filter(VaultEarnEvent.user_id == user.id).all()
        events.sort(key=lambda x: x.id)
        
        ev_win = next((e for e in events if str(e.earn_event_id).endswith(":1001")), None)
        ev_lose = next((e for e in events if str(e.earn_event_id).endswith(":1002")), None)
        ev_event = next((e for e in events if str(e.earn_event_id).endswith(":1003")), None)
        
        fail = False
        
        if ev_win and ev_win.amount == 400:
            print("✅ Test 1 Passed: WIN (+400)")
        else:
            print(f"❌ Test 1 Failed: Expected 400, Got {ev_win.amount if ev_win else 'None'}")
            fail = True

        if ev_lose and ev_lose.amount == -100:
             print("✅ Test 2 Passed: LOSE (-100)")
        else:
             print(f"❌ Test 2 Failed: Expected -100, Got {ev_lose.amount if ev_lose else 'None'}")
             fail = True

        if ev_event and ev_event.amount == 7777:
             print("✅ Test 3 Passed: Non-Gate (+7777)")
        else:
             print(f"❌ Test 3 Failed: Expected 7777, Got {ev_event.amount if ev_event else 'None'}")
             fail = True
             
        if user.vault_locked_balance == 8077:
             print("✅ Balance Integrity Passed")
        else:
             print(f"❌ Balance Integrity Failed: Expected 8077, Got {user.vault_locked_balance}")
             fail = True
             
        if not fail:
            print("\n🎉 ALL PHASE 6 VERIFICATIONS PASSED")
        else:
            print("\n⚠️ SOME CHECKS FAILED")

    except Exception as e:
        print(f"ERROR: {e}")
        import traceback
        traceback.print_exc()
    finally:
        # Cleanup (Optional: restore config to AUTO or OFF)
        try:
            setup_config(db, force_on=False)
            print("[*] Cleanup: Config restored to AUTO")
        except:
            pass
        db.close()

if __name__ == "__main__":
    run_verification()
