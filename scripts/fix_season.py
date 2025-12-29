import os
import sys
from datetime import date
from sqlalchemy import create_engine, update
from sqlalchemy.orm import sessionmaker

# Import models
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.models.season_pass import SeasonPassConfig
from app.db.base_class import Base

# Database URL
DATABASE_URL = os.getenv("DATABASE_URL", "mysql+pymysql://xmasuser:2026@localhost:3307/xmas_event")

def fix():
    engine = create_engine(DATABASE_URL)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    session = SessionLocal()

    try:
        today = date.today()
        new_end_date = date(2026, 1, 31)
        
        stmt = (
            update(SeasonPassConfig)
            .where(SeasonPassConfig.id == 2)
            .values(end_date=new_end_date, is_active=True)
        )
        session.execute(stmt)
        session.commit()
        
        print(f"Season ID 2 extended to {new_end_date}")
            
    finally:
        session.close()

if __name__ == "__main__":
    fix()
