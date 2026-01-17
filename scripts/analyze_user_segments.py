
import os
import sys
from datetime import datetime, timedelta
from sqlalchemy.orm import Session

# Add project root to sys.path
sys.path.append(os.getcwd())

from app.db.session import SessionLocal
from app.models.user import User
from app.models.external_ranking import ExternalRankingData

def analyze_user_segments():
    db = SessionLocal()
    try:
        now = datetime.utcnow()
        seven_days_ago = now - timedelta(days=7)
        
        users = db.query(User).all()
        rankings = {r.user_id: r.deposit_amount for r in db.query(ExternalRankingData).all()}
        
        counts = {
            "NEW": 0,
            "WHALE": 0,
            "COMMON": 0
        }
        
        for user in users:
            # 1. NEW check
            if user.created_at >= seven_days_ago:
                counts["NEW"] += 1
                continue
            
            # 2. WHALE check
            deposit = rankings.get(user.id, 0)
            if deposit >= 5000000:
                counts["WHALE"] += 1
                continue
            
            # 3. COMMON
            counts["COMMON"] += 1
            
        print("--- User Segmentation Analysis ---")
        print(f"Total Users: {len(users)}")
        print(f"NEW (Created < 7d): {counts['NEW']}")
        print(f"WHALE (Deposit >= 5M): {counts['WHALE']}")
        print(f"COMMON (Others): {counts['COMMON']}")
        
    finally:
        db.close()

if __name__ == "__main__":
    analyze_user_segments()
