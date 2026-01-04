
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo
import unittest
from unittest.mock import MagicMock

# Mocking the logic found in auth.py
def check_should_increment(last_login_at_utc, current_time_kst):
    kst = ZoneInfo("Asia/Seoul")
    today_kst_date = current_time_kst.date()
    
    if last_login_at_utc:
        last_login_kst = last_login_at_utc.replace(tzinfo=ZoneInfo("UTC")).astimezone(kst)
        # Main logic: is last_login date < today date?
        return last_login_kst.date() < today_kst_date
    return True # First login

class TestDay2Logic(unittest.TestCase):
    def test_same_day_login(self):
        kst = ZoneInfo("Asia/Seoul")
        now_kst = datetime(2024, 1, 2, 12, 0, 0, tzinfo=kst) # Day 2 Noon
        
        # User logged in 1 hour ago (same day)
        last_login_kst = now_kst - timedelta(hours=1)
        last_login_utc = last_login_kst.astimezone(ZoneInfo("UTC")).replace(tzinfo=None) # DB stores naive UTC
        
        result = check_should_increment(last_login_utc, now_kst)
        self.assertFalse(result, "Same day login should NOT increment")

    def test_next_day_login(self):
        kst = ZoneInfo("Asia/Seoul")
        now_kst = datetime(2024, 1, 2, 12, 0, 0, tzinfo=kst) # Day 2 Noon
        
        # User logged in yesterday (Day 1)
        last_login_kst = now_kst - timedelta(days=1)
        last_login_utc = last_login_kst.astimezone(ZoneInfo("UTC")).replace(tzinfo=None)
        
        result = check_should_increment(last_login_utc, now_kst)
        self.assertTrue(result, "Next day login SHOULD increment")

    def test_timezone_boundary(self):
        # KST is UTC+9
        # Case: UTC 15:00 (Day 1) -> KST 00:00 (Day 2)
        # Login at UTC 14:59 (Day 1 KST 23:59) -> Login at UTC 15:01 (Day 2 KST 00:01)
        kst = ZoneInfo("Asia/Seoul")
        
        # Last login: Day 1 23:59 KST
        last_login_kst = datetime(2024, 1, 1, 23, 59, 0, tzinfo=kst)
        last_login_utc = last_login_kst.astimezone(ZoneInfo("UTC")).replace(tzinfo=None)
        
        # Current login: Day 2 00:01 KST
        now_kst = datetime(2024, 1, 2, 0, 1, 0, tzinfo=kst)
        
        result = check_should_increment(last_login_utc, now_kst)
        self.assertTrue(result, "Midnight boundary crossing SHOULD increment")

if __name__ == '__main__':
    unittest.main()
