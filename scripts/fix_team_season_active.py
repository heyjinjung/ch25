from app.db.session import SessionLocal
from app.models.team_battle import TeamSeason
from sqlalchemy import select

def deactivate_season_2():
    db = SessionLocal()
    try:
        season = db.get(TeamSeason, 2)
        if season:
            print(f"Season 2 found. Active: {season.is_active}. Deactivating...")
            season.is_active = False
            db.add(season)
            db.commit()
            print("Season 2 deactivated.")
        else:
            print("Season 2 not found.")
    finally:
        db.close()

if __name__ == "__main__":
    deactivate_season_2()
