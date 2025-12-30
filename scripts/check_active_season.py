import sys
import os
from datetime import datetime, timedelta

# Add app base to path
sys.path.append(os.getcwd())

from app.db.session import SessionLocal
from app.services.team_battle_service import TeamBattleService
from app.models.team_battle import TeamSeason

def check_active_season():
    db = SessionLocal()
    try:
        service = TeamBattleService()
        now_utc = datetime.utcnow()
        print(f"Current Server Time (UTC): {now_utc}")
        
        season = service.get_active_season(db, now_utc, ignore_dates=True)
        if not season:
            print("No active season found.")
            # List all seasons
            seasons = db.query(TeamSeason).all()
            print(f"Total Seasons in DB: {len(seasons)}")
            for s in seasons:
                print(f" - ID={s.id}, Name={s.name}, Active={s.is_active}, Start={s.starts_at}, End={s.ends_at}")
            return

        print(f"Active Season Found: ID={season.id} Name='{season.name}'")
        print(f"  Starts At (UTC): {season.starts_at}")
        print(f"  Ends At (UTC):   {season.ends_at}")
        
        # Check window
        start_utc = service._normalize_to_utc(season.starts_at)
        join_deadline = start_utc + timedelta(hours=24) # Hardcoded from service constant
        
        print(f"  Join Deadline (UTC): {join_deadline}")
        
        if now_utc < start_utc:
            print("  [Result] TOO EARLY (now < start)")
        elif now_utc > join_deadline:
            print("  [Result] CLOSED (now > deadline)")
        else:
            print("  [Result] OPEN")

    except Exception as e:
        print(f"ERROR: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    check_active_season()
