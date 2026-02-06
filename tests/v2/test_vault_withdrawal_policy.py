import pytest
from datetime import datetime, timedelta
from app.v2.models.user import V2User
from app.v2.services.vault_service import V2VaultService
from app.v2.models import ExternalRankingDailyDepositDelta, V2UserSegment, V2DiceLog, V2DiceConfig
from fastapi import HTTPException

from app.v2.models.v2_user_segment import V2UserSegment
from app.v2.services.segment_service import V2SegmentService

@pytest.fixture
def vault_service():
    return V2VaultService()

def test_withdrawal_policy_vip(db, vault_service):
    # VIP: 10 plays / 0 spend / 100,000 deposit
    user = V2User(cc_id="vip_user_test", nickname="VIP_TEST", vault_locked_balance=50000)
    db.add(user)
    db.flush()
    
    # Use V2SegmentService to ensure correct segment setup
    V2SegmentService.upsert_user_segment(db, user.id, "VIP")
    db.flush()

    # Use operational date for deposit
    op_date = V2VaultService._operational_date_kst(datetime.utcnow())

    # 1. Deposit check (50k < 100k)
    deposit = ExternalRankingDailyDepositDelta(user_id=user.id, deposit_delta=50000, kst_date=op_date)
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
    
    V2SegmentService.upsert_user_segment(db, user.id, "COMMON")
    db.flush()

    # Use operational date for deposit
    op_date = V2VaultService._operational_date_kst(datetime.utcnow())

    # Deposit 10k fulfilled
    db.add(ExternalRankingDailyDepositDelta(user_id=user.id, deposit_delta=10000, kst_date=op_date))
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
            result="LOSE",
            created_at=datetime.utcnow()
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
    
    V2SegmentService.upsert_user_segment(db, user.id, "NEW")
    db.flush()

    # Check play count (target 5)
    with pytest.raises(HTTPException) as excinfo:
        vault_service.request_withdrawal(db, user.id, 10000)
    assert "PLAY_COUNT_INSUFFICIENT_5" in str(excinfo.value.detail)

def test_withdrawal_policy_whale(db, vault_service):
    # WHALE: 0 plays / 0 spend / 100,000 deposit
    user = V2User(cc_id="whale_user_test", nickname="WHALE_TEST", vault_locked_balance=200000)
    db.add(user)
    db.flush()
    
    V2SegmentService.upsert_user_segment(db, user.id, "WHALE")
    db.flush()

    # 1. Deposit check (target 100,000)
    op_date = V2VaultService._operational_date_kst(datetime.utcnow())
    db.add(ExternalRankingDailyDepositDelta(user_id=user.id, deposit_delta=100000, kst_date=op_date))
    db.flush()

    # Whale needs 0 plays, 0 spend.
    resp = vault_service.request_withdrawal(db, user.id, 10000)
    assert resp["status"] == "PENDING"

def test_withdrawal_policy_at_risk(db, vault_service):
    # AT_RISK: 30 plays / 10,000 spend / 10,000 deposit
    user = V2User(cc_id="at_risk_user_test", nickname="AT_RISK_TEST", vault_locked_balance=50000, vault_spent_today=10000)
    db.add(user)
    db.flush()
    
    # Update vault_spent_reset_date to today to avoid reset
    op_date = V2VaultService._operational_date_kst(datetime.utcnow())
    user.vault_spent_reset_date = op_date.strftime("%Y-%m-%d")
    db.add(user)
    db.flush()

    V2SegmentService.upsert_user_segment(db, user.id, "AT_RISK")
    db.flush()

    # Deposit 10k fulfilled
    db.add(ExternalRankingDailyDepositDelta(user_id=user.id, deposit_delta=10000, kst_date=op_date))
    db.flush()

    # 1. Play count check (target 30)
    with pytest.raises(HTTPException) as excinfo:
        vault_service.request_withdrawal(db, user.id, 10000)
    assert "PLAY_COUNT_INSUFFICIENT_30" in str(excinfo.value.detail)

    # Add 30 plays
    config = V2DiceConfig(name="Test Config", ticket_type="DICE_TICKET")
    db.add(config)
    db.flush()
    
    for i in range(30):
        db.add(V2DiceLog(
            user_id=user.id, 
            config_id=config.id,
            user_dice_1=1, user_dice_2=1, user_sum=2,
            dealer_dice_1=2, dealer_dice_2=2, dealer_sum=4,
            result="LOSE",
            created_at=datetime.utcnow()
        ))
    db.flush()

    # 2. Success
    resp = vault_service.request_withdrawal(db, user.id, 10000)
    assert resp["status"] == "PENDING"

def test_manual_suspension_logic(db, vault_service):
    # Create user with manual suspension (naive datetime)
    user = V2User(cc_id="manual_sus_test", benefits_suspended_manual=1, created_at=datetime.utcnow() - timedelta(days=10))
    db.add(user)
    db.flush()
    
    # Manual suspension = 1, should be suspended
    is_suspended, _ = vault_service.is_benefits_suspended(db, user.id)
    assert is_suspended is True

    # Turn off manual suspension
    user.benefits_suspended_manual = 0
    db.flush()
    
    # But user has no deposit in 7 days, so auto-logic should still suspend
    # (ExternalRankingDailyDepositDelta needs to be present for deposit_7d > 0)
    is_suspended, _ = vault_service.is_benefits_suspended(db, user.id)
    assert is_suspended is True

    # Add deposit to lift auto-suspension
    op_date = V2VaultService._operational_date_kst(datetime.utcnow())
    db.add(ExternalRankingDailyDepositDelta(user_id=user.id, deposit_delta=1000, kst_date=op_date))
    db.flush()
    
    is_suspended, _ = vault_service.is_benefits_suspended(db, user.id, now_dt=datetime.utcnow())
    assert is_suspended is False
