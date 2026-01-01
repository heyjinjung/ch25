import sys
import os
sys.path.append(os.getcwd())

from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.services.team_battle_service import TeamBattleService
from app.api.admin.routes.admin_team_battle import list_teams
from app.schemas.team_battle import TeamResponse

def test_team_list():
    db = SessionLocal()
    svc = TeamBattleService()
    try:
        print("Creating test team...")
        # Create a team using service (handles defaults)
        try:
            team = svc.create_team(db, {"name": "Test Team Alpha", "icon": "https://example.com/icon.png", "is_active": True})
            print(f"Created Team: {team.id}, {team.name}")
        except Exception as e:
            if "Duplicate entry" in str(e):
                print("Team already exists.")
            else:
                db.rollback()
                # Try simple insert to bypass svc if needed, but svc is what we test
                pass
        
        print("Listing teams via Service...")
        teams = svc.list_teams(db, include_inactive=True)
        for t in teams:
            print(f"Team: id={t.id}, name={t.name}, icon={t.icon}, is_active={t.is_active}, created_at={t.created_at}")

        print("Testing Pydantic Serialization (Admin Route Logic)...")
        # Simulate what FastAPI does
        responses = [TeamResponse.model_validate(t) for t in teams]
        print(f"Successfully serialized {len(responses)} teams.")
        for r in responses:
            print(r.model_dump())

    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"FAILED: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    test_team_list()
