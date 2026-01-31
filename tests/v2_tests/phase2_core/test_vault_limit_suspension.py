import pytest
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from fastapi import HTTPException

# Models
from app.db.base_class import Base
from app.v2.models.user import V2User
from app.models.vault_earn_event import VaultEarnEvent
from app.models.user_activity import UserActivity
from app.v2.services.vault_service import V2VaultService as VaultService

from unittest.mock import patch, MagicMock

@pytest.fixture(scope="function")
def db_session():
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

def setup_user(db, user_id=1, total_charge=0, created_at=None, seed_plays=False):
    if created_at is None:
        # Default to 10 days ago to bypass New User grace period (7 days) for suspension tests
        created_at = datetime.now(timezone.utc) - timedelta(days=10)
    user = V2User(
        id=user_id,
        cc_id=f"ext_{user_id}",
        nickname=f"user_{user_id}",
        total_charge_amount=total_charge,
        created_at=created_at,
        vault_locked_balance=0,
    )
    db.add(user)
    if seed_plays:
        from app.v2.models.v2_dice import V2DiceLog
        for i in range(30):
            db.add(V2DiceLog(user_id=user_id, bet_amount=1000, outcome="WIN", reward_amount=200, created_at=datetime.now(timezone.utc)))
    db.commit()
    return user

def test_vault_zero_deposit_limit(db_session):
    """
    Phase 2-3: Zero-Deposit Limit.
    Users with 0 total charge should have a 30,000 KRW limit.
    """
    service = VaultService()
    user = setup_user(db_session, user_id=1, total_charge=0)
    
    # 1. Check Policy
    policy = service.get_user_vault_policy(db_session, user, datetime.utcnow())
    assert policy["vault_max_limit"] == 30_000
    
    # 2. Verify Accrual Clamping
    # Add 29,900
    user.vault_locked_balance = 29_900
    db_session.commit()
    
    # Earn 200 -> Should clamp to 100 (Total 30,000)
    # Mocking internal calls like _get_last_deposit_date if needed, 
    # but get_user_vault_policy handles it reasonably
    with patch("app.services.vault_service.get_settings") as MockSettings:
        MockSettings.return_value.timezone = "Asia/Seoul"
        MockSettings.return_value.streak_day_reset_hour_kst = 9
        # Avoid MagicMock comparison errors in legacy multiplier logic
        MockSettings.return_value.vault_accrual_multiplier_enabled = False
        MockSettings.return_value.vault_accrual_multiplier_start_kst = None
        MockSettings.return_value.vault_accrual_multiplier_end_kst = None
        
        # record_game_play_earn_event uses get_user_vault_policy
        service.record_game_play_earn_event(
            db_session,
            user_id=1,
            game_type="DICE",
            game_log_id=101,
            token_type="DICE_TOKEN",
            outcome="WIN",
            payout_raw={"reward_type": "POINT", "reward_amount": 200}
        )
        
        db_session.refresh(user)
        assert user.vault_locked_balance == 30_000
        # Subsequent gain should be 0
        service.record_game_play_earn_event(
            db_session,
            user_id=1,
            game_type="DICE",
            game_log_id=102,
            token_type="DICE_TOKEN",
            outcome="WIN",
            payout_raw={"reward_type": "POINT", "reward_amount": 200}
        )
        db_session.refresh(user)
        assert user.vault_locked_balance == 30_000

def test_vault_recency_suspension(db_session):
    """
    Phase 2-3: Recency Suspension.
    No deposit in 7+ days -> status=INACTIVE, benefits_suspended=True.
    """
    service = VaultService()
    # User joined 10 days ago, 1,000 charged but last deposit was 10 days ago.
    old_date = datetime.utcnow() - timedelta(days=10)
    user = setup_user(db_session, user_id=2, total_charge=1000, created_at=old_date)
    
    # No UserActivity record for last 10 days.
    
    policy = service.get_user_vault_policy(db_session, user, datetime.utcnow())
    assert policy["status"] == "INACTIVE"
    assert policy["benefits_suspended"] is True
    assert policy["recency_multiplier"] == 0.1
    assert policy["vault_max_limit"] == 30_000 # Inactive cap

def test_legacy_field_lock_verification(db_session):
    """
    Phase 2-3: Legacy Field Lock.
    Verify vault_available_balance is NOT included in actual withdrawal or status checks.
    """
    service = VaultService()
    # User has 10,000 locked and 5,000 'available' (legacy)
    user = setup_user(db_session, user_id=3, total_charge=100_000)
    user.vault_locked_balance = 10_000
    user.vault_available_balance = 5_000
    db_session.commit()
    
    # Mocking pre-requisites for withdrawal
    with patch("app.services.vault_service.get_settings") as MockSettings, \
         patch("app.services.vault_service.VaultService._operational_date_kst") as MockOpDate:
        
        MockSettings.return_value.timezone = "Asia/Seoul"
        MockSettings.return_value.streak_day_reset_hour_kst = 9
        now_kst = datetime.now(ZoneInfo("Asia/Seoul")).date()
        MockOpDate.return_value = now_kst
        
        # Setup conditions: 1. Deposit Today
        from app.models.external_ranking_daily_deposit_delta import ExternalRankingDailyDepositDelta
        db_session.add(ExternalRankingDailyDepositDelta(user_id=3, kst_date=now_kst, deposit_delta=10000))
        
        # 2. Play count (30)
        from app.v2.models.v2_dice import V2DiceLog
        for i in range(30):
            db_session.add(V2DiceLog(user_id=3, bet_amount=1000, outcome="WIN", reward_amount=200, created_at=datetime.now(timezone.utc)))
        
        # 3. Daily spent (10k)
        user.vault_spent_today = 10_000
        user.vault_spent_reset_date = now_kst.strftime("%Y-%m-%d")
        db_session.add(user)
        db_session.commit()

        # Act: Try to withdraw 12,000.
        # If available_balance was added, it would be 10k + 5k = 15k -> OK.
        # But if locked ONLY, then it's 10k -> INSUFFICIENT.
        with pytest.raises(HTTPException) as exc:
            service.request_withdrawal(db_session, 3, 12_000)
        
        assert "INSUFFICIENT_FUNDS" in str(exc.value.detail)
        
        # Try to withdraw 10,000 -> OK
        res = service.request_withdrawal(db_session, 3, 10_000)
        assert res["amount"] == 10_000
