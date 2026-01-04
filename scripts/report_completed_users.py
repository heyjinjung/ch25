
import sys
import os
import csv
from datetime import datetime

# Adjust path to include app
sys.path.append(os.getcwd())

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.config import get_settings
from app.models.user import User
from app.models.admin_user_profile import AdminUserProfile
from app.models.mission import Mission, MissionCategory, UserMissionProgress

def report_completed_users(output_csv=None):
    settings = get_settings()
    engine = create_engine(settings.database_url)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()

    print("--- Report Started ---")

    # 1. Get all NEW_USER missions
    new_user_missions = db.query(Mission).filter(
        Mission.category == MissionCategory.NEW_USER,
        Mission.is_active == True
    ).all()

    if not new_user_missions:
        print("No active NEW_USER missions found.")
        return

    mission_ids = [m.id for m in new_user_missions]
    total_missions = len(mission_ids)
    print(f"Found {total_missions} active NEW_USER missions: {[m.title for m in new_user_missions]}")

    # 2. Query users who completed ALL of these missions
    # We can fetch all progress for these mission IDs
    progress_records = db.query(UserMissionProgress).filter(
        UserMissionProgress.mission_id.in_(mission_ids),
        UserMissionProgress.is_completed == True
    ).all()

    # Group by user_id
    user_completion_counts = {}
    for p in progress_records:
        user_completion_counts[p.user_id] = user_completion_counts.get(p.user_id, 0) + 1

    # Filter users who completed ALL
    completed_user_ids = [uid for uid, count in user_completion_counts.items() if count == total_missions]
    
    print(f"Found {len(completed_user_ids)} users who completed all {total_missions} missions.")

    if not completed_user_ids:
        return

    # 3. Fetch user details
    users = db.query(User).filter(User.id.in_(completed_user_ids)).all()
    
    results = []
    for user in users:
        # Check admin profile for extra details if exists
        real_name = user.admin_profile.real_name if user.admin_profile else ""
        phone = user.admin_profile.phone_number if user.admin_profile else ""
        
        results.append({
            "user_id": user.id,
            "nickname": user.nickname,
            "external_id": user.external_id,
            "real_name": real_name,
            "phone_number": phone,
            "telegram_username": user.telegram_username,
            "last_login_at": str(user.last_login_at)
        })

    # 4. Output
    if output_csv:
        with open(output_csv, 'w', newline='', encoding='utf-8') as f:
            fieldnames = ["user_id", "nickname", "external_id", "real_name", "phone_number", "telegram_username", "last_login_at"]
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(results)
        print(f"Report saved to {output_csv}")
    else:
        # Print to console
        print(f"{'ID':<6} | {'Nickname':<15} | {'Real Name':<10} | {'Phone':<15}")
        print("-" * 60)
        for r in results:
            print(f"{r['user_id']:<6} | {r['nickname'] or r['external_id']:<15} | {r['real_name']:<10} | {r['phone_number']:<15}")

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=str, help="Path to save CSV output (e.g. completed_users.csv)")
    
    args = parser.parse_args()
    
    report_completed_users(output_csv=args.output)
