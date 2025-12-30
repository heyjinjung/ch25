import sys
import os
from datetime import datetime

# Add project root to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.session import SessionLocal
from app.services.vault_service import VaultService
from app.models.user import User
from app.models.user_activity import UserActivity
from app.models.vault_withdrawal_request import VaultWithdrawalRequest
from app.db.base_class import Base
from fastapi import HTTPException
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Override DB URL for local port 3307
DB_URL = "mysql+pymysql://xmasuser:2026@127.0.0.1:3307/xmas_event"
engine = create_engine(DB_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def verify():
    # Ensure tables exist
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    svc = VaultService()
    
    # Setup Test User
    user_id = 999999
    db.query(VaultWithdrawalRequest).filter(VaultWithdrawalRequest.user_id == user_id).delete()
    db.query(UserActivity).filter(UserActivity.user_id == user_id).delete()
    db.query(User).filter(User.id == user_id).delete()
    db.commit()

    user = User(id=user_id, external_id="test_withdraw", cash_balance=50000)
    db.add(user)
    db.commit()

    print(f"User Created: Balance={user.cash_balance}")

    # Case 1: Min Amount Failure
    try:
        svc.request_withdrawal(db, user_id, 5000)
        print("❌ Case 1 Failed: Should have rejected < 10000")
    except HTTPException as e:
        print(f"✅ Case 1 Passed: Rejected < 10000 ({e.detail})")

    # Case 2: No Deposit Failure
    try:
        svc.request_withdrawal(db, user_id, 10000)
        print("❌ Case 2 Failed: Should have rejected due to no deposit")
    except HTTPException as e:
        print(f"✅ Case 2 Passed: Rejected No Deposit ({e.detail})")

    # Case 3: Success
    # Inject Deposit Activity
    activity = UserActivity(user_id=user_id, last_charge_at=datetime.utcnow())
    db.add(activity)
    db.commit()
    print("Injecting Today's Deposit Record...")

    try:
        res = svc.request_withdrawal(db, user_id, 10000)
        print(f"✅ Case 3 Passed: Withdrawal Created (ID: {res['request_id']}, Status: {res['status']})")
        
        # Verify Balance Deduction
        db.refresh(user)
        if user.cash_balance == 40000:
             print(f"✅ Balance Deducted Correctly (50000 -> {user.cash_balance})")
        else:
             print(f"❌ Balance Error: {user.cash_balance}")

    except Exception as e:
        print(f"❌ Case 3 Failed: {e}")

    # Cleanup
    db.close()

if __name__ == "__main__":
    verify()
