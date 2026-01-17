
import sys
import os
from sqlalchemy import create_engine, select, or_
from sqlalchemy.orm import sessionmaker

# Add app to path
sys.path.append(os.getcwd())

from app.core.config import get_settings
from app.models.user_cash_ledger import UserCashLedger
from app.models.user import User

# Setup DB
settings = get_settings()
engine = create_engine(settings.database_url)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def check_ledger_reasons():
    db = SessionLocal()
    try:
        user_id = 7
        print(f"## Inspecting User {user_id} Ledger")
        
        # 1. Check Total Charge in User Table
        user = db.get(User, user_id)
        if user:
            print(f"User {user.nickname}, Total Charge: {user.total_charge_amount:,} KRW, Created: {user.created_at}")

        # 2. Find ALL 'incoming' transactions > 1000 KRW (to filter out tiny adjusts)
        # to see when real money came in.
        stmt = select(UserCashLedger).where(
            UserCashLedger.user_id == user_id,
            UserCashLedger.delta > 0,
            UserCashLedger.reason != 'VAULT_ACCRUAL'
        ).order_by(UserCashLedger.created_at.desc()).limit(20)
        
        txs = db.execute(stmt).scalars().all()
        print("\n## Recent Incoming Transactions (No VAULT_ACCRUAL):")
        for tx in txs:
             print(f"[{tx.created_at}] Amount: {tx.delta:,}, Reason: '{tx.reason}', Label: '{tx.label}'")

    finally:
        db.close()

if __name__ == "__main__":
    check_ledger_reasons()
