import sys
import os
from datetime import datetime
sys.path.append(os.getcwd())

from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.services.team_battle_service import TeamBattleService
from app.schemas.team_battle import TeamSeasonUpdate

def test_season_update():
    db = SessionLocal()
    svc = TeamBattleService()
    try:
        # 1. Create dummy season
        print("Creating dummy season...")
        try:
            season = svc.create_season(db, {
                "name": "Test Season 999", 
                "starts_at": datetime.now(), 
                "ends_at": datetime.now(), 
                "is_active": False
            })
            print(f"Created: {season.id}")
        except Exception as e:
            if "Duplicate entry" in str(e):
                season = svc.list_seasons(db)[0] # Grab any
                print(f"Using existing: {season.id}")
            else:
                raise e

        # 2. Update Season
        print("Updating season...")
        payload = TeamSeasonUpdate(name="Updated Name 999", is_active=True).model_dump(exclude_unset=True)
        # Simulate API call
        updated = svc.update_season(db, season.id, payload)
        print(f"Updated: {updated.name}, Active: {updated.is_active}")
        
        # 3. Delete Season
        print("Deleting season...")
        svc.delete_season(db, season.id)
        print("Deleted.")

    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"FAILED: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    test_season_update()
