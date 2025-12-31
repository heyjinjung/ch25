import sys
import os
sys.path.append(os.getcwd())

from app.services.team_battle_service import TeamBattleService
from app.db.session import SessionLocal

def test_list_seasons():
    db = SessionLocal()
    try:
        service = TeamBattleService()
        print("Fetching Seasons...")
        seasons = service.list_seasons(db, limit=5)
        print(f"Found {len(seasons)} seasons:")
        for s in seasons:
            print(f"- ID: {s.id}, Name: {s.name}, Active: {s.is_active}")
        
        if len(seasons) >= 1:
            print("SUCCESS: list_seasons returned data.")
        else:
            print("WARNING: list_seasons empty (might be fine if DB clean).")
            
    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    test_list_seasons()
