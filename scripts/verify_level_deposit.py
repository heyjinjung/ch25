import sys
import os
from datetime import datetime

# Add project root to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.base_class import Base
from app.services.admin_external_ranking_service import AdminExternalRankingService
from app.services.season_pass_service import SeasonPassService
from app.models.user import User
from app.models.season_pass import SeasonPassProgress
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Override DB URL for local port 3307
DB_URL = "mysql+pymysql://xmasuser:2026@127.0.0.1:3307/xmas_event"
engine = create_engine(DB_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def verify():
    # Ensure tables exist
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    svc = AdminExternalRankingService()
    
    # Setup Test User
    user_id = 444444
    db.query(SeasonPassProgress).filter(SeasonPassProgress.user_id == user_id).delete()
    db.query(User).filter(User.id == user_id).delete()
    db.commit()

    user = User(id=user_id, external_id="test_deposit_xp")
    db.add(user)
    db.commit()
    print(f"User Created: {user_id}")

    # 1. Process Deposit (100,000 KRW = 20 XP)
    print("\n[Test 1] Process Deposit 100,000")
    from app.schemas.external_ranking import ExternalRankingCreate
    
    payload = ExternalRankingCreate(
        user_id=user_id,
        external_id=user.external_id,
        deposit_amount=100_000,
        play_count=0,
        memo="Verification Deposit"
    )
    
    svc.upsert_many(db, [payload])
    print("Deposit Processed via upsert_many")
    
    # 2. Verify XP
    season_svc = SeasonPassService()
    # Need to wait/commit? upsert_many commits.
    
    # Fetch progress
    status_data = season_svc.get_status(db, user_id, datetime.utcnow())
    current_xp = status_data["progress"]["current_xp"]
    current_level = status_data["progress"]["current_level"]
    
    print(f"Season Level: {current_level}, XP: {current_xp}")
    
    if current_xp == 20:
        print("✅ XP Grant Verified (100k -> 20 XP)")
    else:
        print(f"❌ XP Verification Failed (Expected 20, Got {progress.current_xp})")
    
    db.close()

if __name__ == "__main__":
    verify()

