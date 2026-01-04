
import unittest
from datetime import datetime, timedelta
# Import the logic function by name if we can split it out, otherwise copy relevant logic.
# Since we uploaded the script, we can import it locally if path allows.
# For safety/speed, I will test the core logic of "date comparison" used in migration.

def is_eligible_mig(start_dt_utc, last_dt_utc):
    from pytz import timezone
    kst = timezone('Asia/Seoul')
    
    if not start_dt_utc or not last_dt_utc:
        return False
        
    # Ensure TZ aware
    if start_dt_utc.tzinfo is None:
        start_dt_utc = start_dt_utc.replace(tzinfo=timezone('UTC'))
    if last_dt_utc.tzinfo is None:
        last_dt_utc = last_dt_utc.replace(tzinfo=timezone('UTC'))
        
    start_date_kst = start_dt_utc.astimezone(kst).date()
    last_date_kst = last_dt_utc.astimezone(kst).date()
    
    return last_date_kst > start_date_kst

class TestMigrationLogic(unittest.TestCase):
    def test_mig_same_day(self):
        # 2024-01-01 10:00 KST start
        # 2024-01-01 15:00 KST last login
        # Should be False
        from pytz import timezone
        utc = timezone('UTC')
        
        # 10:00 KST = 01:00 UTC
        start = datetime(2024, 1, 1, 1, 0, 0, tzinfo=utc) 
        last = datetime(2024, 1, 1, 6, 0, 0, tzinfo=utc) # 15:00 KST
        
        self.assertFalse(is_eligible_mig(start, last))

    def test_mig_next_day(self):
        # 2024-01-01 KST start
        # 2024-01-02 KST last login
        # Should be True
        from pytz import timezone
        utc = timezone('UTC')
        
        start = datetime(2024, 1, 1, 1, 0, 0, tzinfo=utc) 
        last = datetime(2024, 1, 1, 16, 0, 0, tzinfo=utc) # 01:00 UTC (Next day) + 15 hours = 2024-01-02 01:00 KST
        # Wait: 16:00 UTC = +9 = 01:00 Next Day KST. Yes.
        
        self.assertTrue(is_eligible_mig(start, last))

if __name__ == '__main__':
    unittest.main()
