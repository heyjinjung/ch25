
import sys
import os
from pathlib import Path

# Add project root to path
sys.path.append(str(Path(__file__).parent.parent))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.db.base_class import Base
from app.models.user import User
from app.models.vault_earn_event import VaultEarnEvent
from app.services.vault_service import VaultService
from app.services.reward_service import RewardService
# Mock Vault2Service if needed or let it fail gracefully (it has try-except blocks)

def test_vip_logic():
    # Setup In-Memory DB
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()

    print("--- Test Start: VIP Vault Logic ---")

    # 1. Create User
    user_id = 999
    service = VaultService()
    eligible, user, seeded = service.get_status(db, user_id)
    print(f"User created. Total Charge: {user.total_charge_amount}, Locked: {user.vault_locked_balance}")
    
    # 2. Add some locked balance (simulate game earn)
    user.vault_locked_balance = 50000
    db.commit()
    print(f"User locked balance set to: {user.vault_locked_balance}")

    # 3. Simulate Deposit (50k) -> Total 50k
    print(">>> Simulating Deposit 50,000 (Total 50,000)")
    unlocked = service.handle_deposit_increase_signal(
        db, user_id=user_id, deposit_delta=50000, 
        prev_amount=0, new_amount=50000
    )
    db.refresh(user)
    print(f"Unlocked Amount: {unlocked}")
    print(f"User Status: Total Charge: {user.total_charge_amount}, Locked: {user.vault_locked_balance}")
    
    assert user.total_charge_amount == 50000
    # Should NOT be VIP unlocked yet (unless tiers trigger, but we assume no tier for 50k delta in this test config or default)
    # Default tiers: Tier A 10k, Tier B 50k? 
    # Let's check logic. It tries tiers first.
    # If no tiers configured (default empty), it falls back?
    # Actually logic uses `phase1_unlock_rules_json` which returns default tiers?
    # Wait, `handle_deposit_increase_signal` calls `Vault2Service().get_default_program`.
    # In empty DB, program might be None. Defaults to empty tiers.
    # So unlock should be 0.
    
    # 4. Simulate Deposit (50k) -> Total 100k (VIP Threshold)
    print(">>> Simulating Deposit 50,000 (Total 100,000)")
    unlocked_vip = service.handle_deposit_increase_signal(
        db, user_id=user_id, deposit_delta=50000, 
        prev_amount=50000, new_amount=100000
    )
    db.refresh(user)
    print(f"Unlocked Amount: {unlocked_vip}")
    print(f"User Status: Total Charge: {user.total_charge_amount}, Locked: {user.vault_locked_balance}")

    assert user.total_charge_amount == 100000
    assert user.vault_locked_balance == 0
    assert unlocked_vip == 50000 # The previous locked amount
    print("PASSED: User unlocked all funds upon reaching 100k.")

    # 5. Add more locked balance (Game Play after VIP)
    print(">>> Simulating Game Play (Adding 500 Locked)")
    user.vault_locked_balance = 500
    db.commit()

    # 6. Check Status (Lazy Unlock)
    print(">>> Checking Status (Lazy Unlock)")
    eligible, user, seeded = service.get_status(db, user_id)
    print(f"User Status: Locked: {user.vault_locked_balance}")
    
    assert user.vault_locked_balance == 0
    print("PASSED: Lazy unlock worked.")

    print("--- All Tests Passed ---")

if __name__ == "__main__":
    test_vip_logic()
