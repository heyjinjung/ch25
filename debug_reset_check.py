
import os
import sys
from datetime import datetime, timezone
from zoneinfo import ZoneInfo
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from unittest.mock import patch

# Add project root to sys.path
sys.path.append(os.getcwd())

from app.db.base_class import Base
from app.v2.services.vault_service import V2VaultService as VaultService
from tests.v2_tests.phase2_core.test_vault_withdrawal_logic import setup_valid_user
from fastapi import HTTPException

# Setup In-memory DB
engine = create_engine("sqlite:///:memory:")
Base.metadata.create_all(bind=engine)
Session = sessionmaker(bind=engine)
db = Session()

with patch("app.v2.services.vault_service.get_settings") as MockSettings, \
     patch("app.v2.services.vault_service.V2VaultService._operational_date_kst") as MockOpDate:
    
    MockSettings.return_value.timezone = "Asia/Seoul"
    MockSettings.return_value.streak_day_reset_hour_kst = 9
    now_date = datetime.now(ZoneInfo("Asia/Seoul")).date()
    MockOpDate.return_value = now_date
    
    service = VaultService()
    
    # Setup user 2
    user = setup_valid_user(db, user_id=2, locked=100_000, spent_today=20_000)
    user.vault_spent_reset_date = "2000-01-01"
    db.add(user)
    db.commit()

    print("Running service.request_withdrawal(db, 2, 10000)...")
    try:
        service.request_withdrawal(db, 2, 10000)
        print("ERROR: Did not raise!")
    except HTTPException as e:
        print(f"Caught HTTPException: {e.status_code} - {e.detail}")
    except Exception as e:
        print(f"Caught unexpected exception: {type(e)} - {e}")

db.close()
