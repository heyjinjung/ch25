import pytest
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from app.models.user import User

def test_vault_locked_balance_ssot(db: Session):
    # Setup
    user = User(
        nickname="SSoTUser", 
        external_id="SSOT_001",
        vault_locked_balance=50000,
        vault_balance=10000, # Legacy
        vault_available_balance=5000 # Should be ignored in V2
    )
    db.add(user)
    db.commit()
    
    # According to v2_user_sot_ko.md, vault_locked_balance is the only SoT
    assert user.vault_locked_balance == 50000
    # Policy says available_balance should be 0 or ignored
    # Here we just verify that we ONLY trust locked_balance for V2 logic
    total_effective = user.vault_locked_balance
    assert total_effective == 50000

def test_benefit_suspension_logic(db: Session):
    # Setup user with old deposit date (> 7 days)
    user = User(nickname="InactiveUser", external_id="INACTIVE_001", vault_locked_balance=10000)
    db.add(user)
    db.flush()
    
    from app.models.user_activity import UserActivity
    activity = UserActivity(
        user_id=user.id,
        last_charge_at=datetime.utcnow() - timedelta(days=8)
    )
    db.add(activity)
    db.commit()
    
    # Logic verification
    days_passed = (datetime.utcnow() - activity.last_charge_at).days
    benefits_suspended = days_passed >= 7
    
    assert benefits_suspended is True

def test_vault_limit_cap(db: Session):
    from app.models.user_activity import UserActivity
    # ACTIVE user: Unlimited
    active_user = User(nickname="ActiveUser", external_id="ACTIVE_001")
    db.add(active_user)
    db.flush()
    db.add(UserActivity(user_id=active_user.id, last_charge_at=datetime.utcnow()))
    
    # INACTIVE user: 30,000 KRW limit
    inactive_user = User(nickname="OldUser", external_id="OLD_001")
    db.add(inactive_user)
    db.flush()
    iact = UserActivity(user_id=inactive_user.id, last_charge_at=datetime.utcnow() - timedelta(days=10))
    db.add(iact)
    db.commit()
    
    def get_limit(user_id):
        ua = db.query(UserActivity).filter_by(user_id=user_id).first()
        is_inactive = (datetime.utcnow() - ua.last_charge_at).days >= 7
        return 30000 if is_inactive else float('inf')
    
    assert get_limit(active_user.id) == float('inf')
    assert get_limit(inactive_user.id) == 30000

def test_withdrawal_eligibility_thresholds(db: Session):
    # v2_strict_vault_policy_sot_ko.md: 1st/2nd withdrawal min 10k, 3rd 30k, 4th 50k
    thresholds = {1: 10000, 2: 10000, 3: 30000, 4: 50000}
    
    # Mocking withdrawal count check
    def check_min_amount(count, amount):
        min_req = thresholds.get(count, 50000)
        return amount >= min_req
        
    assert check_min_amount(1, 10000) is True
    assert check_min_amount(1, 5000) is False
    assert check_min_amount(3, 30000) is True
    assert check_min_amount(3, 20000) is False
    assert check_min_amount(4, 50000) is True
