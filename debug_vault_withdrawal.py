
import os
import sys
from datetime import datetime, timezone
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Add project root to sys.path
sys.path.append(os.getcwd())

from app.db.base_class import Base
from app.v2.models.user import V2User
from app.v2.services.vault_service import V2VaultService
from fastapi import HTTPException

# Setup In-memory DB
engine = create_engine("sqlite:///:memory:")
Base.metadata.create_all(bind=engine)
Session = sessionmaker(bind=engine)
db = Session()

# Create User
user = V2User(id=1, cc_id="test_user", vault_locked_balance=100000)
db.add(user)
db.commit()

service = V2VaultService()

print(f"Testing V2VaultService.request_withdrawal(db, 1, 5000)")
try:
    service.request_withdrawal(db, 1, 5000)
    print("ERROR: Did not raise HTTPException!")
except HTTPException as e:
    print(f"SUCCESS: Raised HTTPException with detail: {e.detail}")
except Exception as e:
    print(f"ERROR: Raised unexpected exception: {type(e)} - {e}")

db.close()
