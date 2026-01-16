import sys
import os
from datetime import date

# Add project root to sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.session import SessionLocal
from app.services.lottery_service import LotteryService
from app.models.user import User

def repro_status():
    db = SessionLocal()
    svc = LotteryService()
    user_id = 778877 
    
    print("=== Repro Lottery Status ===")
    try:
        # Get status
        res = svc.get_status(db, user_id, date.today())
        print("Status Response:", res)
        print("SUCCESS")
    except Exception as e:
        print(f"FAILED: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    repro_status()
