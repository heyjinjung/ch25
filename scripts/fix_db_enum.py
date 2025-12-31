import sys
import os
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.config import get_settings

def fix_enum():
    settings = get_settings()
    engine = create_engine(settings.database_url)
    with engine.connect() as conn:
        print("Altering mission.reward_type to VARCHAR(50)...")
        # Use raw SQL to safe-guard against Enum strictness
        try:
            conn.execute(text("ALTER TABLE mission MODIFY COLUMN reward_type VARCHAR(50)"))
            conn.commit()
            print("Success.")
        except Exception as e:
            print(f"Error: {e}")

if __name__ == "__main__":
    fix_enum()
