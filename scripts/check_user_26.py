
import sys
import os
from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker

# Add app to path
sys.path.append(os.getcwd())

from app.core.config import get_settings
from app.models.user import User
from app.services.vault_service import VaultService
from datetime import datetime

# Setup DB
settings = get_settings()
engine = create_engine(settings.database_url)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def check_user():
    db = SessionLocal()
    try:
        user = db.get(User, 26)
        if not user:
            print("User 26 not found")
            return

        print(f"User 26: {user.nickname}")
        print(f"Created At: {user.created_at}")
        print(f"Total Charge: {user.total_charge_amount}")
        
        # Check Policy
        policy = VaultService.get_user_vault_policy(db, user, datetime.utcnow())
        print(f"Policy Status: {policy}")

    finally:
        db.close()

if __name__ == "__main__":
    check_user()
