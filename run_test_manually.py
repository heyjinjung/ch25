
import os
import sys
import pytest
from datetime import datetime, timezone
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Add project root to sys.path
sys.path.append(os.getcwd())

from app.db.base_class import Base
from fastapi import HTTPException
from tests.v2_tests.phase2_core.test_vault_withdrawal_logic import test_withdrawal_tiers, setup_valid_user, db_session

# Mocking db_session fixture for manual run
engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
Base.metadata.create_all(bind=engine)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
db = TestingSessionLocal()

try:
    print("Running test_withdrawal_tiers(db) manually...")
    test_withdrawal_tiers(db)
    print("Test passed without raising expected exception (This is the failure!)")
except HTTPException as e:
    print(f"Caught expected HTTPException: {e.status_code} - {e.detail}")
except Exception as e:
    print(f"Caught UNEXPECTED exception: {type(e)} - {e}")
    import traceback
    traceback.print_exc()
finally:
    db.close()
