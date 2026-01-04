import sys
import os
import pytest
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

# Add project root
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.config import get_settings
from app.models.user import User
from app.models.mission import Mission, UserMissionProgress
from app.models.vault_earn_event import VaultEarnEvent
from app.services.mission_service import MissionService
from app.services.vault_service import VaultService

def verify_mission_accrual():
    print(">>> Starting Mission Vault Accrual Verification")
    
    settings = get_settings()
    engine = create_engine(settings.database_url)
    SessionLocal = sessionmaker(bind=engine)
    db = SessionLocal()
    
    # 1. Setup Test User
    user_id = 99999
    db.execute(text("DELETE FROM vault_earn_event WHERE user_id = :uid"), {"uid": user_id})
    db.execute(text("DELETE FROM user_mission_progress WHERE user_id = :uid"), {"uid": user_id})
    db.execute(text("DELETE FROM user WHERE id = :uid"), {"uid": user_id})
    db.commit()
    
    user = User(id=user_id, username="mission_tester", vault_locked_balance=0)
    db.add(user)
    db.commit()
    
    print(f"Created user {user_id} with 0 vault balance.")
    
    # 2. Ensure Welcome Missions Exist
    missions = db.query(Mission).filter(Mission.category == "NEW_USER").all()
    if not missions:
        print("!! No New User missions found. Please run seed_new_user_missions.py first.")
        return
        
    print(f"Found {len(missions)} New User missions.")
    
    mission_service = MissionService(db)
    
    expected_increase_per_mission = 2500
    total_expected = 0
    
    # 3. Process Each Mission
    for m in missions:
        print(f"Processing Mission: {m.title} (ID: {m.id})...")
        
        # A. Update Progress to Complete
        # Force completion logic
        reset_date = mission_service.get_reset_date_str(m.category)
        prog = UserMissionProgress(
            user_id=user_id,
            mission_id=m.id,
            current_value=m.target_value,
            is_completed=True,
            is_claimed=False,
            reset_date=reset_date
        )
        db.add(prog)
        db.commit()
        
        # B. Claim Reward
        success, r_type, r_amt = mission_service.claim_reward(user_id, m.id)
        
        if success:
            print(f"  -> Claimed! Amount: {r_amt}")
            total_expected += r_amt
        else:
            print(f"  -> Claim Failed: {r_type}")
            
    # 4. Verify Final State
    db.refresh(user)
    print(f"\nFinal Vault Balance: {user.vault_locked_balance}")
    print(f"Expected Balance: {total_expected}")
    
    # Check Earn Events
    events = db.query(VaultEarnEvent).filter(VaultEarnEvent.user_id == user_id).all()
    print(f"Found {len(events)} Vault Earn Events.")
    
    assert user.vault_locked_balance == total_expected, f"Balance Mismatch! Got {user.vault_locked_balance}, Expected {total_expected}"
    assert len(events) == len(missions), f"Event Count Mismatch! Got {len(events)}, Expected {len(missions)}"
    
    print(">>> VERIFICATION SUCCESS: All missions accrued correctly.")
    db.close()

if __name__ == "__main__":
    try:
        verify_mission_accrual()
    except AssertionError as e:
        print(f"\n!!! VERIFICATION FAILED: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"\n!!! ERROR: {e}")
        sys.exit(1)
