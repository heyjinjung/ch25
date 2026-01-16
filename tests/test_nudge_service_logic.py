
import pytest
from unittest.mock import MagicMock, patch
from datetime import datetime, timedelta, date
from zoneinfo import ZoneInfo

from app.services.nudge_service import NudgeService
from app.models.user import User

# Mock models
class MockUser:
    def __init__(self, id=1, telegram_id=12345, play_streak=5, last_play_date=None, vault_locked_balance=20000):
        self.id = id
        self.telegram_id = telegram_id
        self.play_streak = play_streak
        self.last_play_date = last_play_date
        self.vault_locked_balance = vault_locked_balance

@pytest.fixture
def mock_db():
    return MagicMock()

@pytest.fixture
def mock_notifier():
    return MagicMock()

@pytest.fixture
def nudge_service(mock_db, mock_notifier):
    # Patch dependencies inside __init__ if needed, but here we can just set them after init or patch Config
    with patch("app.services.nudge_service.get_settings") as mock_settings:
        mock_settings.return_value.streak_day_reset_hour_kst = 9
        mock_settings.return_value.timezone = "Asia/Seoul"
        
        with patch("app.services.nudge_service.NotificationService", return_value=mock_notifier):
            service = NudgeService(mock_db)
            return service

# -------------------------------------------------------------------
# Test: nudge_streak_pre_reset
# -------------------------------------------------------------------

def test_streak_pre_reset_should_nudge(nudge_service, mock_db, mock_notifier):
    # Setup
    now_kst = datetime(2026, 1, 16, 5, 30, tzinfo=ZoneInfo("Asia/Seoul")) # 05:30 -> reset at 09:00 -> 3.5 hours left (in range 3-4)
    # 05:30 is next reset is today 09:00. 
    # Operational day is actually yesterday (since < 9am). 
    # Logic: 
    #   _operational_play_date(05:30) -> Jan 15 (yesterday)
    #   _hours_to_reset(05:30) -> (09:00 - 05:30) = 3.5 hours. Check: 3.0 <= 3.5 <= 4.0. OK.
    
    user = MockUser(play_streak=5)
    user.last_play_date = date(2026, 1, 14) # Played 2 days ago? Wait.
    # If op_date is Jan 15, and last_play is Jan 14. Then 'Played Today?' is False. OK.
    
    # Mock _has_nudged to False
    nudge_service._has_nudged = MagicMock(return_value=False)
    nudge_service._mark_nudged = MagicMock()
    
    # Execute
    result = nudge_service.nudge_streak_pre_reset(user, now_kst)
    
    # Verify
    assert result is True
    mock_notifier.send_text_sync.assert_called_once()
    nudge_service._mark_nudged.assert_called_once()

def test_streak_pre_reset_already_played(nudge_service):
    # Setup
    now_kst = datetime(2026, 1, 16, 5, 30, tzinfo=ZoneInfo("Asia/Seoul")) # 3.5 hours left
    # Operational day = Jan 15
    
    user = MockUser(play_streak=5)
    user.last_play_date = date(2026, 1, 15) # Played on operational day
    
    nudge_service._has_nudged = MagicMock(return_value=False)
    
    # Execute
    result = nudge_service.nudge_streak_pre_reset(user, now_kst)
    
    # Verify
    assert result is False

def test_streak_pre_reset_too_early(nudge_service):
    # Setup
    now_kst = datetime(2026, 1, 16, 1, 00, tzinfo=ZoneInfo("Asia/Seoul")) 
    # 01:00 -> Reset at 09:00 -> 8 hours left. Not in [3, 4]
    
    user = MockUser(play_streak=5)
    user.last_play_date = date(2026, 1, 14)
    
    result = nudge_service.nudge_streak_pre_reset(user, now_kst)
    assert result is False

# -------------------------------------------------------------------
# Test: nudge_season_final_push
# -------------------------------------------------------------------

def test_season_final_push_should_nudge(nudge_service, mock_db, mock_notifier):
    now_kst = datetime(2026, 1, 20, 10, 0, tzinfo=ZoneInfo("Asia/Seoul"))
    
    user = MockUser()

    # Mock SeasonPassService
    with patch("app.services.nudge_service.SeasonPassService") as MockSvc:
        svc_inst = MockSvc.return_value
        
        # Mock current season expiring in 10 hours
        season_mock = MagicMock()
        season_mock.id = 1
        season_mock.end_date = date(2026, 1, 20) 
        # end_dt = 2026-01-20 23:59:59.
        # now = 10:00. diff ~14 hours. OK (< 24).
        svc_inst.get_current_season.return_value = season_mock
        
        # Mock status: 95/100 XP
        svc_inst.get_status.return_value = {
            "progress": {"current_xp": 95, "next_level_xp": 100, "current_level": 5},
            "season": {"max_level": 10},
            "levels": []
        }
        
        nudge_service._has_nudged = MagicMock(return_value=False)
        nudge_service._mark_nudged = MagicMock()
        
        result = nudge_service.nudge_season_final_push(user, now_kst)
        
        assert result is True
        mock_notifier.send_text_sync.assert_called_once()
        kwargs = mock_notifier.send_text_sync.call_args.kwargs
        assert "시즌 종료 임박!" in kwargs["text"]  # check text contains keyword

def test_season_final_push_low_progress(nudge_service):
    now_kst = datetime(2026, 1, 20, 10, 0, tzinfo=ZoneInfo("Asia/Seoul"))
    user = MockUser()

    with patch("app.services.nudge_service.SeasonPassService") as MockSvc:
        svc_inst = MockSvc.return_value
        svc_inst.get_current_season.return_value.end_date = date(2026, 1, 20)
        svc_inst.get_current_season.return_value.id = 1
        
        # Mock status: 50/100 XP -> ratio 0.5 < 0.9
        svc_inst.get_status.return_value = {
            "progress": {"current_xp": 50, "next_level_xp": 100, "current_level": 5},
            "season": {"max_level": 10}
        }
        
        result = nudge_service.nudge_season_final_push(user, now_kst)
        assert result is False

# -------------------------------------------------------------------
# Test: nudge_vault_withdraw_ready
# -------------------------------------------------------------------

def test_vault_withdraw_ready_missing_one(nudge_service, mock_db, mock_notifier):
    # missing exactly 1 condition
    now_utc = datetime(2026, 1, 16, 10, 0) # arbitrary UTC time
    user = MockUser(vault_locked_balance=50000)
    
    # Mock VaultService checks
    with patch("app.services.nudge_service.VaultService") as MockVault:
        MockVault.return_value.get_withdrawal_reserved_amount.return_value = 0 # Available = 50000 > 10000 OK
        
        # Helpers for query mocking
        # The service makes 3 queries:
        # 1. UserActivity (deposit)
        # 2. VaultEarnEvent (play count)
        # 3. VaultLedger (spend)
        
        # We need to control the sequence of queries.
        # DB query structure: db.query(Model).filter(...).first() or scalar()
        
        # Let's mock UserActivity to return None => No Deposit (Missing 1)
        # Let's mock Play Count => 35 (OK)
        # Let's mock Spend => -15000 (OK)
        
        # Since DB chaining is complex to mock via side_effect sequence, 
        # we can interpret the calls conceptually.
        
        # Filter calls:
        # Call 1: UserActivity.user_id == ... -> return object or None
        # Call 2: VaultEarnEvent... -> scalar -> count
        # Call 3: VaultLedger... -> scalar -> sum
        
        # Strategy: Mock db.query(...).filter(...).first/scalar() using side_effect on the final callable chain
        # But filter() returns a Query object.
        
        # Simplified: We can mock the specific return values for the 3 distinct logic blocks by inspecting the query Argument? 
        # Or easier: patch the boolean variables logic? No, unit test should test the extraction logic too if possible.
        # But for brevity and robustness against SQL generation changes,
        # verifying the *conditional logic* (1 missing out of 3) is key.
        
        # Let's try to mock the DB results in order.
        # 1. UserActivity query -> .first() -> None (No deposit)
        # 2. VaultEarnEvent query -> .scalar() -> 35 (Play OK)
        # 3. VaultLedger query -> .scalar() -> -20000 (Spend OK)
        
        mock_query = mock_db.query.return_value
        mock_filter = mock_query.filter.return_value
        
        # We have 3 queries.
        # Q1 chain: query().filter().first()
        # Q2 chain: query().filter().scalar()
        # Q3 chain: query().filter().scalar()
        
        # This is tricky because `mock_filter` is the SAME object for all if we don't use side_effect.
        # Let's use side_effect on `mock_query` (called with Model).
        
        # Models
        from app.models.user_activity import UserActivity
        from app.models.vault_earn_event import VaultEarnEvent
        from app.models.vault_ledger import VaultLedger
        from sqlalchemy import func
        
        query_mapping = {}
        
        # Mock objects
        q_activity = MagicMock()
        q_activity.filter.return_value.first.return_value = None # No deposit
        
        q_earn = MagicMock()
        q_earn.filter.return_value.scalar.return_value = 35 # 35 plays
        
        q_ledger = MagicMock()
        q_ledger.filter.return_value.scalar.return_value = -20000 # 20k spent
        
        query_mapping[UserActivity] = q_activity
        # count(VaultEarnEvent.id) is used in query check
        # sum(VaultLedger.amount) is used in query check
        # We need to match arguments of db.query()
        
        def query_side_effect(*args):
            arg = args[0]
            if arg is UserActivity:
                return q_activity
            # For func.count and func.sum, we might check string representation or type
            # The code uses: query(func.count(VaultEarnEvent.id))
            # arg might be a Function element
            str_arg = str(arg)
            if "count" in str_arg:
                return q_earn
            if "sum" in str_arg:
                return q_ledger
            return MagicMock()
            
        mock_db.query.side_effect = query_side_effect
        
        nudge_service._has_nudged = MagicMock(return_value=False)
        nudge_service._mark_nudged = MagicMock()

        result = nudge_service.nudge_vault_withdraw_ready(user, now_utc)
        
        assert result is True
        mock_notifier.send_text_sync.assert_called_once()
        kwargs = mock_notifier.send_text_sync.call_args.kwargs
        assert "입금" in kwargs["text"] # Verify correct missing reason text

def test_vault_withdraw_ready_missing_two(nudge_service, mock_db):
    now_utc = datetime(2026, 1, 16, 12, 0)
    user = MockUser(vault_locked_balance=50000)

    with patch("app.services.nudge_service.VaultService") as MockVault:
        MockVault.return_value.get_withdrawal_reserved_amount.return_value = 0
        
        # Mock DB: No deposit, No plays
        # Use simple True/False logic override if mocking DB is too brittle?
        # Actually proper query mocking is better.
        
        # Reuse side_effect pattern
        q_activity = MagicMock()
        q_activity.filter.return_value.first.return_value = None # No Deposit
        
        q_earn = MagicMock()
        q_earn.filter.return_value.scalar.return_value = 0 # No Plays
        
        q_ledger = MagicMock()
        q_ledger.filter.return_value.scalar.return_value = -20000 # Spend OK
        
        from app.models.user_activity import UserActivity
        
        def query_side_effect(*args):
             arg = args[0]
             if arg is UserActivity: return q_activity
             str_arg = str(arg)
             if "count" in str_arg: return q_earn
             if "sum" in str_arg: return q_ledger
             return MagicMock()
        
        mock_db.query.side_effect = query_side_effect
        
        result = nudge_service.nudge_vault_withdraw_ready(user, now_utc)
        
        assert result is False # Missing 2 triggers -> No Nudge
