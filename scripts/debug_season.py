import os
import sys
from datetime import date
from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker

# Import models
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.models.season_pass import SeasonPassConfig
from app.db.base_class import Base

# Database URL
DATABASE_URL = os.getenv("DATABASE_URL", "mysql+pymysql://xmasuser:2026@localhost:3307/xmas_event")

def debug():
    engine = create_engine(DATABASE_URL)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    session = SessionLocal()

    try:
        today = date.today()
        print(f"Current Date: {today}")
        
        stmt = select(SeasonPassConfig)
        seasons = session.execute(stmt).scalars().all()

        print(f"Total seasons found: {len(seasons)}")
        for s in seasons:
            print(f"ID: {s.id}, Name: {s.season_name}, Start: {s.start_date}, End: {s.end_date}, Active: {s.is_active}")
            
            is_valid_date = s.start_date <= today <= s.end_date
            print(f"  - Valid Date: {is_valid_date}")
            print(f"  - Overall Active: {is_valid_date and s.is_active}")
            
    finally:
        session.close()

if __name__ == "__main__":
    debug()
