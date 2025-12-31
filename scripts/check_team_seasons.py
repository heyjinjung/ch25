from app.db.session import SessionLocal
from app.models.team_battle import TeamSeason
from sqlalchemy import select

def check_seasons():
    db = SessionLocal()
    try:
        seasons = db.execute(select(TeamSeason).order_by(TeamSeason.id.desc())).scalars().all()
        print(f"Found {len(seasons)} seasons:")
        for s in seasons:
            print(f"ID: {s.id}, Name: {s.name}, Active: {s.is_active}, Start: {s.starts_at}, End: {s.ends_at}")
    finally:
        db.close()

if __name__ == "__main__":
    check_seasons()
