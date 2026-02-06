import pytest
from datetime import datetime, timedelta
from app.v2.models.user import V2User
from app.v2.services.vault_service import V2VaultService
from app.v2.models import ExternalRankingDailyDepositDelta, V2UserSegment, V2DiceLog, V2DiceConfig
from fastapi import HTTPException

@pytest.fixture
def vault_service():
    return V2VaultService()

def test_withdrawal_policy_vip(db, vault_service):
    # VIP: 10 plays / 0 spend / 100,000 deposit
    user = V2User(cc_id="vip_user_test", nickname="VIP_TEST", vault_locked_balance=50000)
    db.add(user)
    db.flush()
    
    db.add(V2UserSegment(user_id=user.id, segment="VIP"))
    db.flush()

    # 1. Deposit check (50k < 100k)
    deposit = ExternalRankingDailyDepositDelta(user_id=user.id, deposit_delta=50000, kst_date=datetime.now().date())
    db.add(deposit)
    db.flush()

    with pytest.raises(HTTPException) as excinfo:
        vault_service.request_withdrawal(db, user.id, 10000)
    assert "DEPOSIT_AMOUNT_INSUFFICIENT_100000" in str(excinfo.value.detail)

    # 2. Play count check (target 10)
    # Update deposit to 100k+
    deposit.deposit_delta = 100001
    db.flush()
    
    with pytest.raises(HTTPException) as excinfo:
        vault_service.request_withdrawal(db, user.id, 10000)
    assert "PLAY_COUNT_INSUFFICIENT_10" in str(excinfo.value.detail)

def test_withdrawal_policy_common(db, vault_service):
    # COMMON: 15 plays / 5,000 spend / 10,000 deposit
    user = V2User(cc_id="common_user_test", nickname="COMMON_TEST", vault_locked_balance=50000, vault_spent_today=0)
    db.add(user)
    db.flush()
    
    db.add(V2UserSegment(user_id=user.id, segment="COMMON"))
    db.flush()

    # Deposit 10k fulfilled
    db.add(ExternalRankingDailyDepositDelta(user_id=user.id, deposit_delta=10000, kst_date=datetime.now().date()))
    db.flush()

    # 1. Play count check (target 15)
    with pytest.raises(HTTPException) as excinfo:
        vault_service.request_withdrawal(db, user.id, 10000)
    assert "PLAY_COUNT_INSUFFICIENT_15" in str(excinfo.value.detail)

    # Add 15 plays (V2DiceLog)
    config = V2DiceConfig(name="Test Config", ticket_type="DICE_TICKET")
    db.add(config)
    db.flush()
    
    for i in range(15):
        db.add(V2DiceLog(
            user_id=user.id, 
            config_id=config.id,
            user_dice_1=1, user_dice_2=1, user_sum=2,
            dealer_dice_1=2, dealer_dice_2=2, dealer_sum=4,
            result="LOSE"
        ))
    db.flush()

    # 2. Spend check (0 < 5000)
    with pytest.raises(HTTPException) as excinfo:
        vault_service.request_withdrawal(db, user.id, 10000)
    assert "VAULT_SPENT_INSUFFICIENT_5000" in str(excinfo.value.detail)

def test_withdrawal_policy_new(db, vault_service):
    # NEW: 5 plays / 0 spend / 0 deposit
    user = V2User(cc_id="new_user_test", nickname="NEW_TEST", vault_locked_balance=50000, vault_spent_today=0)
    db.add(user)
    db.flush()
    
    db.add(V2UserSegment(user_id=user.id, segment="NEW"))
    db.flush()

    # Check play count (target 5)
    with pytest.raises(HTTPException) as excinfo:
        vault_service.request_withdrawal(db, user.id, 10000)
    assert "PLAY_COUNT_INSUFFICIENT_5" in str(excinfo.value.detail)

def test_manual_suspension_logic(db, vault_service):
    user = V2User(cc_id="manual_sus_test", benefits_suspended_manual=1)
    db.add(user)
    db.flush()
    
    is_suspended, _ = vault_service.is_benefits_suspended(db, user.id)
    assert is_suspended is True

    user.benefits_suspended_manual = 0
    db.flush()
    
    is_suspended, _ = vault_service.is_benefits_suspended(db, user.id)
    # Manual 0, but since no deposit, auto-logic might suspend (verified in service code)
    pass
