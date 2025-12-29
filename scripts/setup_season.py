import os
import sys
from datetime import date, timedelta
from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker

# Import models
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.models.season_pass import SeasonPassConfig, SeasonPassLevel
from app.db.base_class import Base

# Database URL
DATABASE_URL = os.getenv("DATABASE_URL", "mysql+pymysql://xmasuser:2026@localhost:3307/xmas_event")

def setup():
    engine = create_engine(DATABASE_URL)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    session = SessionLocal()

    try:
        # Check if any season exists
        stmt = select(SeasonPassConfig).where(SeasonPassConfig.is_active == True)
        season = session.execute(stmt).scalars().first()

        if not season:
            print("No active season found. Creating a default one...")
            today = date.today()
            new_season = SeasonPassConfig(
                season_name="2025 Winter Season",
                start_date=today - timedelta(days=5),
                end_date=today + timedelta(days=25),
                max_level=10,
                base_xp_per_stamp=100,
                is_active=True
            )
            session.add(new_season)
            session.commit()
            session.refresh(new_season)
            
            print(f"Created season: {new_season.season_name} (ID: {new_season.id})")

            # Add levels
            levels = []
            for i in range(1, 11):
                levels.append(SeasonPassLevel(
                    season_id=new_season.id,
                    level=i,
                    required_xp=(i - 1) * 200,
                    reward_type="TICKET_BUNDLE" if i % 3 == 0 else "ROULETTE_TICKET",
                    reward_amount=3,
                    auto_claim=True
                ))
            session.add_all(levels)
            session.commit()
            print("Added 10 levels to the season.")
        else:
            print(f"Active season already exists: {season.season_name} (ID: {season.id})")
    finally:
        session.close()

if __name__ == "__main__":
    setup()
