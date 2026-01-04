import sys
import os
import csv
from datetime import datetime, timedelta
from pytz import timezone

# Adjust path to include app
sys.path.append(os.getcwd())

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.config import get_settings
from app.db.base import Base
from app.models.user import User
from app.models.mission import Mission, MissionCategory, UserMissionProgress, MissionRewardType

def get_kst_date(dt_utc):
    if not dt_utc:
        return None
    kst = timezone('Asia/Seoul')
    # If dt has no timezone, assume UTC
    if dt_utc.tzinfo is None:
        dt_utc = dt_utc.replace(tzinfo=timezone('UTC'))
    return dt_utc.astimezone(kst).date()

def migrate_day2_login(dry_run=True, dump_csv=None):
    settings = get_settings()
    engine = create_engine(settings.database_url)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()

    print(f"--- Migration Started (Dry Run: {dry_run}) ---")
    
    # 1. Find the target mission
    # Criteria: Category=NEW_USER, Action=LOGIN, Target=2 (Day 2)
    # We'll look for any LOGIN mission in NEW_USER, but specifically target value 2 is the "Day 2" one usually.
    # To be safe, let's fetch all NEW_USER + LOGIN missions.
    
    target_missions = db.query(Mission).filter(
        Mission.category == MissionCategory.NEW_USER,
        Mission.action_type == 'LOGIN'
    ).all()
    
    if not target_missions:
        print("No 'LOGIN' missions found in 'NEW_USER' category.")
        return

    print(f"Found {len(target_missions)} target mission(s).")
    for m in target_missions:
        print(f" - ID: {m.id}, Title: {m.title}, Target: {m.target_value}")

    # We typically only care about the one with target_value >= 2, or just logic implies if they logged in 2 days, they progress.
    # The 'Day 2' mission usually implies target_value=2 (Login 2 times? Or Login on 2nd day?).
    # Based on file review, it seems "Day 2 Login" is what we want.
    # Logic: If user logged in on >= 2 distinct days, they should satisfy target_value=2.
    
    users = db.query(User).all()
    print(f"Scanning {len(users)} users...")
    
    affected_count = 0
    updates_list = []

    for user in users:
        # Determine eligibility
        # 1. First Login (or Created)
        start_dt = user.first_login_at or user.created_at
        last_dt = user.last_login_at
        
        if not start_dt or not last_dt:
            continue
            
        start_date_kst = get_kst_date(start_dt)
        last_date_kst = get_kst_date(last_dt)
        
        # Eligibility: Last login date > Start login date (in KST)
        # This means they logged in on at least one DIFFERENT day after start day.
        # So distinct days >= 2.
        if last_date_kst <= start_date_kst:
            continue
            
        # User is eligible for "Login Day 2" completion
        
        for mission in target_missions:
            # Check progress
            progress = db.query(UserMissionProgress).filter(
                UserMissionProgress.user_id == user.id,
                UserMissionProgress.mission_id == mission.id
            ).first()
            
            # If not completed, we should complete it.
            # Even if current_value is 1, if they are eligible (2nd day), we bump to target_value.
            
            needs_update = False
            
            if not progress:
                needs_update = True
                current_val = 0
            else:
                if not progress.is_completed:
                    needs_update = True
                    current_val = progress.current_value
            
            if needs_update:
                affected_count += 1
                updates_list.append({
                    "user_id": user.id,
                    "nickname": user.nickname,
                    "first_login": start_date_kst,
                    "last_login": last_date_kst,
                    "mission_id": mission.id,
                    "current_val": current_val,
                    "target_val": mission.target_value
                })
                
                if not dry_run:
                    if not progress:
                        progress = UserMissionProgress(
                            user_id=user.id,
                            mission_id=mission.id,
                            reset_date="STATIC", # NEW_USER missions usually use STATIC
                            current_value=0
                        )
                        db.add(progress)
                    
                    progress.current_value = mission.target_value
                    progress.is_completed = True
                    progress.completed_at = datetime.utcnow()
                    # We do NOT mark is_claimed = True, user must claim manually.
    
    if dump_csv and updates_list:
        with open(dump_csv, 'w', newline='', encoding='utf-8') as f:
            writer = csv.DictWriter(f, fieldnames=updates_list[0].keys())
            writer.writeheader()
            writer.writerows(updates_list)
        print(f"Dumped affected users to {dump_csv}")

    print(f"Total eligible but incomplete users found: {affected_count}")
    
    if not dry_run:
        try:
            db.commit()
            print("Changes committed to database.")
        except Exception as e:
            db.rollback()
            print(f"Error committing changes: {e}")
    else:
        print("Dry run completed. No changes made.")

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true", help="Do not commit changes")
    parser.add_argument("--execute", action="store_true", help="Commit changes (overrides dry-run)")
    parser.add_argument("--dump-csv", type=str, help="Path to dump CSV")
    
    args = parser.parse_args()
    
    # Default to dry-run unless execute is specified
    is_dry_run = not args.execute
    
    migrate_day2_login(dry_run=is_dry_run, dump_csv=args.dump_csv)
