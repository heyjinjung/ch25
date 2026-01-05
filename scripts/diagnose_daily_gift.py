import sys
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

def diagnose(fix=False):
    # Use verified local connection string
    SQLALCHEMY_DATABASE_URL = "mysql+pymysql://xmasuser:2026@127.0.0.1:3307/xmas_event"
    engine = create_engine(SQLALCHEMY_DATABASE_URL)
    SessionLocal = sessionmaker(bind=engine)
    db = SessionLocal()

    try:
        # 1. Find latest logged in user (Table: user)
        result = db.execute(text("SELECT id, external_id, last_login_at FROM user ORDER BY last_login_at DESC LIMIT 1"))
        user = result.fetchone()
        
        if not user:
            print("No users found.")
            return

        print(f"[User] {user.external_id} (ID: {user.id})")
        print(f"[Login] Last Login: {user.last_login_at}")

        # 2. Check Daily Gift Mission logic key (Table: mission)
        mission_res = db.execute(text("SELECT id, title, logic_key, target_value FROM mission WHERE logic_key = 'daily_login_gift'"))
        mission = mission_res.fetchone()
        
        if not mission:
            print("[Error] CRITICAL: 'daily_login_gift' mission NOT FOUND in DB.")
            return
        
        print(f"[Mission] Found: {mission.title} (ID: {mission.id})")

        # 3. Check Progress (Table: user_mission_progress)
        prog_res = db.execute(text(f"SELECT current_value, is_completed, is_claimed FROM user_mission_progress WHERE user_id = {user.id} AND mission_id = {mission.id}"))
        row = prog_res.fetchone()
        
        if row:
            print(f"[Progress] Value={row.current_value}/{mission.target_value}, Completed={row.is_completed}, Claimed={row.is_claimed}")
            
            if fix and not row.is_completed and not row.is_claimed:
                print("[Action] Fixing progress to COMPLETE...")
                db.execute(text(f"UPDATE user_mission_progress SET current_value = {mission.target_value}, is_completed = 1 WHERE user_id = {user.id} AND mission_id = {mission.id}"))
                db.commit()
                print("[Success] Progress updated. Toast should appear on refresh.")
        else:
            print("[Progress] NO RECORD (likely never triggered)")
            if fix:
                 # Insert new progress
                 # Note: using 1 for is_completed (True) and 0 for is_claimed (False)
                 # removed created_at as it doesn't exist on UserMissionProgress
                 # Added reset_date '2026-01-05' (hardcoded for verify or generate dynamic)
                 from datetime import datetime, timedelta
                 reset_date = (datetime.utcnow() + timedelta(hours=9)).strftime("%Y-%m-%d")
                 
                 db.execute(text(f"INSERT INTO user_mission_progress (user_id, mission_id, current_value, is_completed, is_claimed, reset_date, updated_at) VALUES ({user.id}, {mission.id}, {mission.target_value}, 1, 0, '{reset_date}', NOW())"))
                 db.commit()
                 print(f"[Success] Record created with reset_date='{reset_date}'. Toast should appear on refresh.")

    except Exception as e:
        print(f"[Error] {e}")
    finally:
        db.close()

if __name__ == "__main__":
    fix_arg = len(sys.argv) > 1 and sys.argv[1] == "--fix"
    diagnose(fix=fix_arg)
