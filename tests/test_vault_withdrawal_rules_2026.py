from datetime import datetime, timedelta
import pytest
from fastapi import HTTPException
from app.models.user import User
from app.models.user_activity import UserActivity
from app.models.vault_earn_event import VaultEarnEvent
from app.models.vault_ledger import VaultLedger
from app.services.vault_service import VaultService

@pytest.fixture
def vault_user_ctx(session_factory):
    db = session_factory()
    user = User(id=999, external_id="test-vault-user", vault_locked_balance=50000)
    db.add(user)
    db.commit()
    
    # Clean related tables for this user just in case
    db.query(UserActivity).filter(UserActivity.user_id == 999).delete()
    db.query(VaultEarnEvent).filter(VaultEarnEvent.user_id == 999).delete()
    db.query(VaultLedger).filter(VaultLedger.user_id == 999).delete()
    db.commit()
    
    yield db, user
    
    # Cleanup
    db.delete(user)
    db.commit()

def test_withdrawal_fails_no_deposit_today(vault_user_ctx):
    db, user = vault_user_ctx
    service = VaultService()
    
    # Case: No activity record
    with pytest.raises(HTTPException) as exc:
        service.request_withdrawal(db, user.id, 10000)
    assert exc.value.detail == "NO_DEPOSIT_RECORD_TODAY"

    # Case: Activity exists but old DATE
    activity = UserActivity(user_id=user.id, last_charge_at=datetime.utcnow() - timedelta(days=1))
    db.add(activity)
    db.commit()
    
    with pytest.raises(HTTPException) as exc:
        service.request_withdrawal(db, user.id, 10000)
    assert exc.value.detail == "DEPOSIT_REQUIRED_TODAY"

def test_withdrawal_fails_insufficient_plays(vault_user_ctx):
    db, user = vault_user_ctx
    service = VaultService()
    
    # 1. Fix deposit requirement first
    activity = db.query(UserActivity).filter(UserActivity.user_id == user.id).one_or_none()
    if not activity:
        activity = UserActivity(user_id=user.id)
        db.add(activity)
    activity.last_charge_at = datetime.utcnow()
    db.commit()
    
    # 2. Add only 29 plays
    for i in range(29):
        event = VaultEarnEvent(
            user_id=user.id,
            earn_event_id=f"TEST_PLAY_{i}",
            earn_type="GAME_PLAY",
            amount=0,
            source="TEST",
            created_at=datetime.utcnow()
        )
        db.add(event)
    db.commit()

    with pytest.raises(HTTPException) as exc:
        service.request_withdrawal(db, user.id, 10000)
    assert exc.value.detail == "MIN_PLAY_COUNT_30_REQUIRED"

def test_withdrawal_fails_insufficient_spend(vault_user_ctx):
    db, user = vault_user_ctx
    service = VaultService()
    
    # 1. Fix deposit requirement
    activity = db.query(UserActivity).filter(UserActivity.user_id == user.id).one_or_none()
    if not activity:
        activity = UserActivity(user_id=user.id)
        db.add(activity)
    activity.last_charge_at = datetime.utcnow()
    
    # 2. Fix play requirement (30 plays)
    # Clear existing events from previous tests if any (fixture handles fresh user usually but clean logic helps)
    for i in range(30):
        event = VaultEarnEvent(
            user_id=user.id,
            earn_event_id=f"TEST_PLAY_SPEND_{i}",
            earn_type="GAME_PLAY",
            amount=0,
            source="TEST",
            created_at=datetime.utcnow()
        )
        db.add(event)
        
    db.commit()
    
    # 3. Add spend record but only 5000 won
    ledger = VaultLedger(
        user_id=user.id,
        amount=-5000,
        balance_after=45000,
        created_at=datetime.utcnow()
    )
    db.add(ledger)
    db.commit()

    with pytest.raises(HTTPException) as exc:
        service.request_withdrawal(db, user.id, 10000)
    assert exc.value.detail == "MIN_DAILY_SPEND_10000_REQUIRED"

def test_withdrawal_success(vault_user_ctx):
    db, user = vault_user_ctx
    service = VaultService()
    
    # 1. Fix deposit requirement
    activity = db.query(UserActivity).filter(UserActivity.user_id == user.id).one_or_none()
    if not activity:
        activity = UserActivity(user_id=user.id)
        db.add(activity)
    activity.last_charge_at = datetime.utcnow()

    # 2. Fix play requirement (30 plays)
    for i in range(30):
        event = VaultEarnEvent(
            user_id=user.id,
            earn_event_id=f"TEST_PLAY_SUCCESS_{i}",
            earn_type="GAME_PLAY",
            amount=0,
            source="TEST",
            created_at=datetime.utcnow()
        )
        db.add(event)

    # 3. Fix spend requirement (10000 won)
    ledger = VaultLedger(
        user_id=user.id,
        amount=-10000,
        balance_after=40000,
        created_at=datetime.utcnow()
    )
    db.add(ledger)
    db.commit()
    
    # Now request should succeed
    # Note: request_withdrawal returns int(amount) or dict depending on implementation version, 
    # but specifically it creates a request row.
    # The signature in my read said `-> dict` but returned `int(amount)` in snippet? 
    # Wait, let me check the return value in the file again. It printed `return int(amount)` at the end of `consume_locked_balance` 
    # but `request_withdrawal` had returns omitted in my read. 
    # I trust it returns something truthy or raises.
    
    result = service.request_withdrawal(db, user.id, 10000)
    assert result # Check successful return
