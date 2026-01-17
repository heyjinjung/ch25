
import sys
import os
from datetime import datetime, timezone
from zoneinfo import ZoneInfo
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Add app to path
sys.path.append(os.getcwd())

from app.core.config import get_settings
from app.models.user import User
from app.services.vault_service import VaultService
from app.models.external_ranking import ExternalRankingData

# Setup DB
settings = get_settings()
engine = create_engine(settings.database_url)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def test_withdraw():
    db = SessionLocal()
    try:
        user_id = 7
        print(f"## Testing Withdrawal Eligibility for User {user_id}")
        
        # Check Rank Data first
        rank = db.query(ExternalRankingData).filter(ExternalRankingData.user_id == user_id).first()
        tz = ZoneInfo(getattr(settings, "timezone", "Asia/Seoul"))
        now_kst = datetime.now(tz).date()

        if rank:
            sync_dt_utc = rank.updated_at.replace(tzinfo=timezone.utc)
            sync_date_kst = sync_dt_utc.astimezone(tz).date()
            print(f"Rank Sync Date (KST): {sync_date_kst}")
            print(f"Today (KST): {now_kst}")
            print(f"Match? {sync_date_kst == now_kst}")
        else:
            print("No Rank Data")

        # Try Mock Request (Dry Run - usually failing on amount or other checks, but we check if it passes the date check first)
        try:
            # Requires 10,000 min
            VaultService().request_withdrawal(db, user_id, 10000)
            print("SUCCESS: Withdrawal Request Created (or proceeded past date check)")
        except Exception as e:
            print(f"FAILED: {e}")
            if "DEPOSIT_REQUIRED_TODAY_SYNC" in str(e):
                print("-> Blocked by Date Check correcty.")
            elif "MIN_PLAY_COUNT" in str(e):
                print("-> Date Check PASSED! Blocked by Play Count.")
            elif "MIN_DAILY_SPEND" in str(e):
                print("-> Date Check PASSED! Blocked by Spend.")
                
    finally:
        db.close()

if __name__ == "__main__":
    test_withdraw()
