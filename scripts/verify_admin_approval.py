import sys
import os
from datetime import datetime

# Add project root to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.base_class import Base
from app.services.vault_service import VaultService
from app.models.user import User
from app.models.user_activity import UserActivity
from app.models.vault_withdrawal_request import VaultWithdrawalRequest
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
    user_id = 888888
    db.query(VaultWithdrawalRequest).filter(VaultWithdrawalRequest.user_id == user_id).delete()
    db.query(UserActivity).filter(UserActivity.user_id == user_id).delete()
    db.query(User).filter(User.id == user_id).delete()
    db.commit()

    user = User(id=user_id, external_id="test_admin_flow", cash_balance=100000)
    db.add(user)
    db.add(UserActivity(user_id=user_id, last_charge_at=datetime.utcnow()))
    db.commit()
    
    print(f"User Init Balance: {user.cash_balance}")

    # 1. Test APPROVE
    print("\n[Test 1] APPROVE Flow")
    req1 = svc.request_withdrawal(db, user_id, 20000)
    print(f"Request 1 Created: {req1['request_id']} (Amt: 20000)")
    
    svc.process_withdrawal(db, req1["request_id"], "APPROVE", admin_id=1)
    
    r1 = db.query(VaultWithdrawalRequest).get(req1["request_id"])
    print(f"Request 1 Status: {r1.status}")
    if r1.status == "APPROVED":
        print("✅ Approve Success")
    else:
        print("❌ Approve Failed")

    # 2. Test REJECT (Refund)
    print("\n[Test 2] REJECT Flow")
    req2 = svc.request_withdrawal(db, user_id, 30000)
    print(f"Request 2 Created: {req2['request_id']} (Amt: 30000)")
    
    db.refresh(user)
    print(f"Balance After Req 2: {user.cash_balance} (Should be 100k - 20k - 30k = 50k)")

    svc.process_withdrawal(db, req2["request_id"], "REJECT", admin_id=1)
    
    r2 = db.query(VaultWithdrawalRequest).get(req2["request_id"])
    print(f"Request 2 Status: {r2.status}")
    
    db.refresh(user)
    print(f"Balance After Reject: {user.cash_balance} (Should be 50k + 30k = 80k)")

    if r2.status == "REJECTED" and user.cash_balance == 80000:
        print("✅ Reject & Refund Success")
    else:
        print("❌ Reject Failed")

    db.close()

if __name__ == "__main__":
    verify()
