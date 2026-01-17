
import sys
import os
from datetime import datetime, timedelta
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Add app to path
sys.path.append(os.getcwd())

from app.core.config import get_settings
from app.models.user import User
from app.models.user_cash_ledger import UserCashLedger
from app.services.vault_service import VaultService
from app.services.shop_service import ShopService
from app.services.lottery_service import LotteryService
from fastapi import HTTPException

# Setup DB
settings = get_settings()
engine = create_engine(settings.database_url)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def cleanup(db, user_id):
    db.query(UserCashLedger).filter(UserCashLedger.user_id == user_id).delete()
    db.query(User).filter(User.id == user_id).delete()
    db.commit()

def test_policy():
    db = SessionLocal()
    
    # Create Dummy User
    import uuid
    dummy_id = str(uuid.uuid4())
    user = User(
        external_id=f"policy_tester_{dummy_id}",
        password_hash="hashed_secret",
        nickname="PolicyTester",
        # user_type="USER", # 'user_type' not in model, defaults likely '1' for level? 
        # Checking model: level default 1. status default ACTIVE.
        vault_balance=0,
        vault_locked_balance=0
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    
    print(f"Created User ID: {user.id}")

    
    # Clean ExternalRankingData first
    from app.models.external_ranking import ExternalRankingData
    db.query(ExternalRankingData).filter(ExternalRankingData.user_id == user.id).delete()
    db.commit()

    try:
        now = datetime.utcnow()
        v_service = VaultService()
        
        # 1. New User (Zero Deposit) should be treated as INACTIVE or LIMITED based on rules
        policy = v_service.get_user_vault_policy(db, user, now)
        print(f"Scenario 1 [New User]: Status={policy['status']}, Multiplier={policy['recency_multiplier']}, Suspended={policy['benefits_suspended']}, Limit={policy['vault_max_limit']}")
        
        # Expectation: 
        # Total Charged 0 -> Limit 30,000.
        
        # Prep: Create Ranking Data
        rank = ExternalRankingData(
            user_id=user.id,
            deposit_amount=10000,
            play_count=100,
            updated_at=now - timedelta(days=20),
            created_at=now - timedelta(days=20),
            last_daily_reset=None
        )
        db.add(rank)
        user.total_charge_amount = 10000
        db.commit()

        # 2. Deposit 20 days ago (Inactive)
        # updated_at = now - 20 days
        policy = v_service.get_user_vault_policy(db, user, now)
        print(f"Scenario 2 [Inactive]: Status={policy['status']}, Multiplier={policy['recency_multiplier']}, Suspended={policy['benefits_suspended']}, Limit={policy['vault_max_limit']}")
        # Expectation: INACTIVE, 0.1x, Suspended=True, Limit=30000
        
        if policy["status"] != "INACTIVE":
             print("FAIL: Scenario 2 - Expected INACTIVE")

        # 3. Deposit 5 days ago (Warning)
        rank.updated_at = now - timedelta(days=5)
        db.commit()
        
        policy = v_service.get_user_vault_policy(db, user, now)
        print(f"Scenario 3 [Warning]: Status={policy['status']}, Multiplier={policy['recency_multiplier']}, Suspended={policy['benefits_suspended']}, Limit={policy['vault_max_limit']}")
        # Expectation: WARNING, 0.5x, Suspended=False, Limit=0 (Unlimited)
        
        if policy["status"] != "WARNING":
             print("FAIL: Scenario 3 - Expected WARNING")

        # 4. Deposit 1 day ago (Active)
        rank.updated_at = now - timedelta(days=1)
        db.commit()
        
        policy = v_service.get_user_vault_policy(db, user, now)
        print(f"Scenario 4 [Active]: Status={policy['status']}, Multiplier={policy['recency_multiplier']}, Suspended={policy['benefits_suspended']}, Limit={policy['vault_max_limit']}")
        # Expectation: ACTIVE, 1.0x, Suspended=False, Limit=0 (Unlimited)

        if policy["status"] != "ACTIVE":
             print("FAIL: Scenario 4 - Expected ACTIVE")
             
        # 5. Withdrawal Eligibility Test
        # Updated_at is -1 day. Request logic requires "Today" match (KST).
        # Assuming test runs in same timezone context (simple check)
        # If Today KST != -1 Day, this should fail.
        # But let's set it to NOW to verify SUCCESS case first.
        
        rank.updated_at = now # Sync is recent
        db.commit()
        
        try:
             # Just checking if the date logic passes. 
             # request_withdrawal might fail on other things (UserActivity), so we need to mock UserActivity explicitly as well?
             # No, request_withdrawal updated to remove UserActivity check.
             # It now checks ExternalRankingData.updated_at match Today.
             
             # Need minimum amount 10000. And user needs balance.
             user.vault_locked_balance = 20000
             # Also requires play count > 30... (Phase 2 check).
             # We need to mock VaultEarnEvent for play count.
             
             # This might be too complex for this script. 
             # Let's focus on Policy Status correctness first (Scenarios 1-4).
             # Withdrawal logic was tested by 'test_withdrawal_eligibility.py'.
             pass

        except Exception as e:
            print(f"Withdraw check: {e}")

    finally:
        # Cleanup Rank Data
        try:
            db.query(ExternalRankingData).filter(ExternalRankingData.user_id == user.id).delete()
            cleanup(db, user.id)
        except:
            pass
        db.close()

if __name__ == "__main__":
    test_policy()
