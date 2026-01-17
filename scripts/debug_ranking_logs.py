
import sys
import os
from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker

# Add app to path
sys.path.append(os.getcwd())

from app.core.config import get_settings
from app.models.external_ranking import ExternalRankingRewardLog

# Setup DB
settings = get_settings()
engine = create_engine(settings.database_url)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def check_reward_logs():
    db = SessionLocal()
    try:
        user_id = 7
        print(f"## External Ranking Reward Logs (User {user_id})")
        
        stmt = select(ExternalRankingRewardLog).where(
            ExternalRankingRewardLog.user_id == user_id
        ).order_by(ExternalRankingRewardLog.created_at.desc()).limit(20)
        
        logs = db.execute(stmt).scalars().all()
        
        if not logs:
            print("No reward logs found.")
        
        for log in logs:
            print(f"[{log.created_at}] Type: {log.reward_type}, Amount: {log.reward_amount}, Reason: {log.reason}")

    finally:
        db.close()

if __name__ == "__main__":
    check_reward_logs()
