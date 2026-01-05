
import sys
import os

# Set up path to import app modules
sys.path.append(os.getcwd())

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.core.config import get_settings
from app.models.user import User
from app.models.season_pass import SeasonPassStampLog, SeasonPassProgress

def verify_xp():
    db = sessionmaker(bind=create_engine(get_settings().database_url))()
    user = db.query(User).filter(User.id == 67).first()

    if not user:
        print("No user found")
        return

    print(f"=== XP Verification for User {user.id} ({user.nickname}) ===")
    print(f"User.xp (DB): {user.xp}")

    progress = db.query(SeasonPassProgress).filter(SeasonPassProgress.user_id == user.id).first()
    if progress:
        print(f"SeasonPassProgress.current_xp: {progress.current_xp}")
    else:
        print("No SeasonPassProgress found")

    logs = db.query(SeasonPassStampLog).filter(SeasonPassStampLog.user_id == user.id).all()
    print(f"--- XP Logs ({len(logs)}) ---")
    total_log_xp = 0
    for l in logs:
        print(f"  [{l.created_at}] Source: {l.source_feature_type:<20} | XP: {l.xp_earned} | Key: {l.period_key}")
        total_log_xp += l.xp_earned

    print("---------------------------")
    print(f"Total XP from Logs: {total_log_xp}")
    
    match = (user.xp == total_log_xp)
    print(f"Verification Result: {'MATCH OK' if match else 'MISMATCH ERROR'}")

    if not match:
        print(f"Difference: {user.xp - total_log_xp}")

if __name__ == "__main__":
    verify_xp()
