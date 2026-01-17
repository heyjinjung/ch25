
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

    try:
        now = datetime.utcnow()
        v_service = VaultService()
        
        # 1. New User (Zero Deposit) should be treated as INACTIVE or LIMITED based on rules
        #    If he has 0 lifetime deposit, he should be capped.
        policy = v_service.get_user_vault_policy(db, user, now)
        print(f"Scenario 1 [New User]: Status={policy['status']}, Multiplier={policy['recency_multiplier']}, Suspended={policy['benefits_suspended']}, Limit={policy['vault_max_limit']}")
        
        # Expectation: 
        # Total Charged 0 -> Limit 30,000.
        # Recency: created_at is now. days_since = 0.
        # If days_since < 3 -> ACTIVE? 
        # But total_charged == 0 -> Limit 30k check.
        
        # 2. Deposit 10 days ago (Inactive)
        user.created_at = now - timedelta(days=20)
        # Add deposit 10 days ago
        ledger = UserCashLedger(
            user_id=user.id,
            delta=10000,
            balance_after=10000,
            reason="CHARGE",
            created_at=now - timedelta(days=10)
        )
        db.add(ledger)
        user.total_charge_amount = 10000
        db.commit()
        
        policy = v_service.get_user_vault_policy(db, user, now)
        print(f"Scenario 2 [Inactive]: Status={policy['status']}, Multiplier={policy['recency_multiplier']}, Suspended={policy['benefits_suspended']}, Limit={policy['vault_max_limit']}")
        
        # Expectation: INACTIVE, 0.1x, Suspended=True, Limit=30000 (since 7day recency failed)
        
        # Check Services Blocking
        try:
             # Try Shop Purchase (dummy SKU)
             # Mock the ShopService.purchase_product logic where check happens
             # We can't easily call purchase_product without real products, so checking check logic manually if needed
             # But let's verify if get_user_vault_policy returns suspended=True
             if policy["benefits_suspended"] is not True:
                 print("FAIL: Inactive user should be suspended")
             else:
                 print("PASS: Inactive user is suspended")
        except Exception as e:
            print(e)

        # 3. Deposit 5 days ago (Warning)
        ledger.created_at = now - timedelta(days=5)
        db.commit()
        
        policy = v_service.get_user_vault_policy(db, user, now)
        print(f"Scenario 3 [Warning]: Status={policy['status']}, Multiplier={policy['recency_multiplier']}, Suspended={policy['benefits_suspended']}, Limit={policy['vault_max_limit']}")
        # Expectation: WARNING, 0.5x, Suspended=False, Limit=0 (Unlimited)

        # 4. Deposit 1 day ago (Active)
        ledger.created_at = now - timedelta(days=1)
        db.commit()
        
        policy = v_service.get_user_vault_policy(db, user, now)
        print(f"Scenario 4 [Active]: Status={policy['status']}, Multiplier={policy['recency_multiplier']}, Suspended={policy['benefits_suspended']}, Limit={policy['vault_max_limit']}")
        # Expectation: ACTIVE, 1.0x, Suspended=False, Limit=0 (Unlimited)
        
    finally:
        cleanup(db, user.id)
        db.close()

if __name__ == "__main__":
    test_policy()
