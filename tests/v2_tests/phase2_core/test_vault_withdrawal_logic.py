import pytest
from datetime import datetime, date, timedelta
from zoneinfo import ZoneInfo
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from fastapi import HTTPException

# Models
from app.db.base_class import Base
from app.models.user import User
from app.models.vault_withdrawal_request import VaultWithdrawalRequest
from app.models.vault_earn_event import VaultEarnEvent
from app.models.external_ranking_daily_deposit_delta import ExternalRankingDailyDepositDelta
from app.models.external_ranking import ExternalRankingData
from app.services.vault_service import VaultService

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

from app.v2.models.user import V2User as User

def setup_valid_user(db, user_id=1, locked=1_000_000, spent_today=10_000):
    # Create User (V2 Native SoT)
    user = User(
        id=user_id, 
        nickname=f"u{user_id}", 
        cc_id=f"ext_{user_id}",
        vault_locked_balance=locked,
        vault_spent_today=spent_today,
        # Set reset date to Today KST to avoid auto-reset during test unless intended
        vault_spent_reset_date=datetime.now(ZoneInfo("Asia/Seoul")).strftime("%Y-%m-%d"),
        created_at=datetime.now(timezone.utc) - timedelta(days=10) # Ensure NOT a new user for suspension tests
    )
    db.add(user)
    
    # 1. Deposit Condition: ExternalRankingDailyDepositDelta > 0 today
    now_kst = datetime.now(ZoneInfo("Asia/Seoul")).date()
    deposit = ExternalRankingDailyDepositDelta(
        user_id=user_id,
        kst_date=now_kst,
        deposit_delta=50000
    )
    db.add(deposit)

    # 2. Play Count Condition: 30 plays in last 3 days
    # Seed V2DiceLog instead of VaultEarnEvent (which is now for accrual record only)
    from app.v2.models.v2_dice import V2DiceLog
    for i in range(30):
        log = V2DiceLog(
            user_id=user_id,
            bet_amount=1000,
            outcome="WIN",
            reward_amount=200,
            created_at=datetime.now(timezone.utc)
        )
        db.add(log)
    
    db.commit()
    return user

def test_withdrawal_tiers(db_session):
    """
    2-2. Strict Withdrawal Policy (Tier Check):
    Verify 10k -> 10k -> 30k -> 50k thresholds based on PENDING+APPROVED count.
    """
    with patch("app.services.vault_service.get_settings") as MockSettings:
        MockSettings.return_value.timezone = "Asia/Seoul"
        MockSettings.return_value.streak_day_reset_hour_kst = 9
        
        service = VaultService()
        user = setup_valid_user(db_session, user_id=1, locked=500_000, spent_today=20_000)

        # --- Tier 1 (Count 0): Min 10,000 ---
        # Try 5,000 -> Fail
        with pytest.raises(HTTPException) as exc:
            service.request_withdrawal(db_session, 1, 5_000)
        assert "MIN_WITHDRAWAL_AMOUNT_10000" in str(exc.value.detail)



        # Try 10,000 -> Success
        service.consume_locked_balance(db_session, 1, 20_000)
        res = service.request_withdrawal(db_session, 1, 10_000)
        assert res["status"] == "PENDING"

        # Approve it to increment count
        req_id = res["request_id"]
        req = db_session.get(VaultWithdrawalRequest, req_id)
        req.status = "APPROVED"
        db_session.commit()



        # --- Tier 2 (Count 1): Min 10,000 ---
        service.consume_locked_balance(db_session, 1, 20_000)
        res = service.request_withdrawal(db_session, 1, 10_000)
        req_id = res["request_id"]
        req = db_session.get(VaultWithdrawalRequest, req_id)
        req.status = "APPROVED"
        db_session.commit()



        # --- Tier 3 (Count 2): Min 30,000 ---
        # Try 20,000 -> Fail
        with pytest.raises(HTTPException) as exc:
            service.request_withdrawal(db_session, 1, 20_000)
        assert "MIN_WITHDRAWAL_AMOUNT_30000" in str(exc.value.detail)

        # Try 30,000 -> Success
        service.consume_locked_balance(db_session, 1, 20_000)
        res = service.request_withdrawal(db_session, 1, 30_000)
        req_id = res["request_id"]
        req = db_session.get(VaultWithdrawalRequest, req_id)
        req.status = "APPROVED"
        db_session.commit()



        # --- Tier 4 (Count 3): Min 50,000 ---
        # Try 40,000 -> Fail
        with pytest.raises(HTTPException) as exc:
            service.request_withdrawal(db_session, 1, 40_000)
        assert "MIN_WITHDRAWAL_AMOUNT_50000" in str(exc.value.detail)

        # Try 50,000 -> Success
        service.consume_locked_balance(db_session, 1, 20_000)
        service.request_withdrawal(db_session, 1, 50_000)

def test_daily_spent_reset_check(db_session):
    """
    2-2. Strict Withdrawal Policy (Daily Spent Reset):
    Verify that if operational date changed, spent_today resets to 0 and blocks withdrawal.
    """
    with patch("app.services.vault_service.get_settings") as MockSettings:
        MockSettings.return_value.timezone = "Asia/Seoul"
        MockSettings.return_value.streak_day_reset_hour_kst = 9
        
        service = VaultService()
        
        # Setup user with outdated reset date (Safe Past Date)
        safe_past_date = "2000-01-01"
        
        user = setup_valid_user(db_session, user_id=2, locked=100_000, spent_today=20_000)
        user.vault_spent_reset_date = safe_past_date # FORCE outdated
        db_session.add(user)
        db_session.commit()

        # Act: Request Withdrawal
        # Expectation: Logic will detect Date Change -> Reset spent_today to 0 -> Fail strict check (Min 10k spend)
        with pytest.raises(HTTPException) as exc:
             service.request_withdrawal(db_session, 2, 10_000)
        
        # PROOF: If reset didn't happen, spent_today would be 20,000, which is > 10,000.
        # So "MIN_DAILY_SPEND_10000_REQUIRED" would NOT be raised.
        # The fact it was raised confirms reset took effect in logic.
        assert "MIN_DAILY_SPEND_10000_REQUIRED" in str(exc.value.detail)
