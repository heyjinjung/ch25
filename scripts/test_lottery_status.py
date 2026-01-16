import sys
import os
from datetime import datetime
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.session import SessionLocal
from app.services.lottery_service import LotteryService

def test_lottery_status():
    db = SessionLocal()
    svc = LotteryService()
    user_id = 998899
    
    print("\n=== Testing Lottery Status API (C1/C2 Support) ===\n")
    
    try:
        status = svc.get_status(db, user_id, datetime.utcnow().date())
        col = status.collection_progress
        
        print(f"✅ STATUS API SUCCESS")
        print(f"   Collection Progress: {col}")
        
        if "C1" in col and "C2" in col:
            print(f"\n✅ VALIDATION PASSED: API returns C1={col['C1']}, C2={col['C2']}")
            print(f"   (Also: J={col.get('J', 0)}, M={col.get('M', 0)})")
            return True
        else:
            print(f"\n❌ VALIDATION FAILED: Missing C1 or C2 in response")
            return False
            
    except Exception as e:
        print(f"\n❌ STATUS API FAILED: {e}")
        return False
    finally:
        db.close()

if __name__ == "__main__":
    success = test_lottery_status()
    sys.exit(0 if success else 1)
