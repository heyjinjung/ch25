
import sys
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Add app to path
sys.path.append(os.getcwd())

from app.core.config import get_settings
from app.models.external_ranking import ExternalRankingData

# Setup DB
settings = get_settings()
engine = create_engine(settings.database_url)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def check_ranking_data():
    db = SessionLocal()
    try:
        user_id = 7
        rank = db.query(ExternalRankingData).filter(ExternalRankingData.user_id == user_id).first()
        if rank:
            print(f"## External Ranking Data (User {user_id})")
            print(f"Deposit Amount: {rank.deposit_amount}")
            print(f"Play Count: {rank.play_count}")
            print(f"Last Daily Reset: {rank.last_daily_reset}")
            print(f"Memo: '{rank.memo}'")
            print(f"Updated At: {rank.updated_at}")
        else:
            print(f"No External Ranking Data for User {user_id}")

    finally:
        db.close()

if __name__ == "__main__":
    check_ranking_data()
