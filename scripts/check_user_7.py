
import sys
import os
from datetime import datetime
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Add app to path
sys.path.append(os.getcwd())

from app.core.config import get_settings
from app.models.user import User
from app.services.vault_service import VaultService

# Setup DB
settings = get_settings()
engine = create_engine(settings.database_url)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def check_user_7():
    db = SessionLocal()
    try:
        user_id = 7
        user = db.get(User, user_id)
        if not user:
            print(f"User {user_id} not found")
            return

        print(f"User {user_id}: {user.nickname}")
        print(f"Created At: {user.created_at}")
        print(f"Total Charge: {user.total_charge_amount}")

        # Check Last Deposit logic directly
        last_dep = VaultService._get_last_deposit_date(db, user_id)
        print(f"Last Deposit Found: {last_dep}")

        # Check Policy
        vs = VaultService()
        now = datetime.utcnow()
        policy = vs.get_user_vault_policy(db, user, now)
        print(f"Policy Status: {policy}")

    finally:
        db.close()

if __name__ == "__main__":
    check_user_7()
