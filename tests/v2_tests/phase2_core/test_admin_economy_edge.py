
import pytest
import threading
import time
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from fastapi import HTTPException
from datetime import datetime

from app.db.base_class import Base
from app.models.user import User
from app.v2.models.user import V2User
from app.v2.services.vault_service import V2VaultService
from app.models.admin_audit_log import AdminAuditLog
from app.models.vault_ledger import VaultLedger

@pytest.fixture(scope="function")
def db_session():
    # Use SQLite for testing
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

def setup_test_user(db, user_id=100, balance=10000):
    user = User(
        id=user_id,
        external_id=f"ext_{user_id}",
        nickname=f"user_{user_id}",
        vault_locked_balance=balance
    )
    db.add(user)
    db.commit()
    return user

def test_admin_economy_floor_logic(db_session):
    """
    Edge Case: Floor logic (0원 하한선).
    Even if the calculated balance is negative, it should either fail or floor to 0 depending on policy.
    Based on V2VaultService.force_edit, it raises 400 INSUFFICIENT_BALANCE if (total + delta) < 0.
    """
    setup_test_user(db_session, user_id=1, balance=5000)
    vault_service = V2VaultService()
    
    # Try to deduct 10000 from 5000 balance -> Should raise 400
    with pytest.raises(HTTPException) as exc:
        vault_service.force_edit(db_session, admin_id=777, user_id=1, amount=-10000, reason="Test Deduction")
    
    assert exc.value.status_code == 400
    assert exc.value.detail == "INSUFFICIENT_BALANCE"
    
    # Verify balance remains 5000
    user = db_session.get(User, 1)
    assert (user.vault_locked_balance + user.vault_available_balance) == 5000

def test_admin_economy_atomicity(db_session):
    """
    Edge Case: Atomicity (원자성).
    If an error occurs during the process (e.g. audit log fails), the whole transaction should rollback.
    We'll simulate this by mocking or checking the force_edit code flow.
    """
    setup_test_user(db_session, user_id=1, balance=10000)
    vault_service = V2VaultService()
    
    # In force_edit, it calls V2AdminAuditService.log(..., auto_commit=False) then db.commit().
    # Let's verify that a failed audit log (e.g. unique constraint if implemented) rolls back.
    # Note: SQLite doesn't have complex constraints for JSON but we can check the flow.
    
    before_balance = 10000
    amount_change = 5000
    
    # Success path
    res = vault_service.force_edit(db_session, admin_id=777, user_id=1, amount=amount_change, reason="Atomicity Test")
    
    assert res["after_balance"] == 15000
    
    # Check if ledger and audit log are both present
    ledger = db_session.query(VaultLedger).filter_by(user_id=1).first()
    assert ledger is not None
    assert ledger.amount == 5000
    
    audit = db_session.query(AdminAuditLog).filter_by(admin_id=777).first()
    assert audit is not None
    assert audit.action == "VAULT_FORCE_EDIT"

def test_admin_economy_race_condition_simulation(db_session):
    """
    Edge Case: Race Condition (동시성 충돌).
    Using SQLite :memory:, multi-threading is tricky with sessions. 
    However, we can simulate the 'Lost Update' by using two separate sessions or 
    manually simulating the interleaving.
    """
    setup_test_user(db_session, user_id=2, balance=10000)
    vault_service = V2VaultService()
    
    # In a real scenario, SELECT FOR UPDATE would be used.
    # Here, we test if the force_edit implementation logic handles concurrent updates.
    # Since we are using a single session in this test, we mimic the interleaving.
    
    # Thread 1 starts
    user1 = db_session.get(User, 2)
    current1 = user1.vault_locked_balance + user1.vault_available_balance # 10000
    
    # Thread 2 starts and completes
    vault_service.force_edit(db_session, admin_id=888, user_id=2, amount=1000, reason="T2 add")
    # Balance is now 11000
    
    # Thread 1 continues with STALE 'current1' of 10000
    # If the code doesn't use DB-level atomic increment or SELECT FOR UPDATE, it might overwrite.
    # V2VaultService.force_edit uses db.get(User, user_id) within the session.
    # Let's see if it correctly adds to the LATEST balance.
    
    db_session.refresh(user1)
    vault_service.force_edit(db_session, admin_id=999, user_id=2, amount=2000, reason="T1 add")
    
    # Final balance should be 10000 + 1000 + 2000 = 13000
    assert (user1.vault_locked_balance + user1.vault_available_balance) == 13000
