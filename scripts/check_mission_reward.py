import sys
import os
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.config import get_settings

def check_reward():
    settings = get_settings()
    engine = create_engine(settings.database_url)
    with engine.connect() as conn:
        result = conn.execute(text("SELECT title, reward_type, reward_amount FROM mission WHERE logic_key = 'NEW_USER_PLAY_1'"))
        row = result.fetchone()
        if row:
            print(f"Mission: {row[0]}, RewardType: {row[1]}, Amount: {row[2]}")
        else:
            print("Mission NOT FOUND")

if __name__ == "__main__":
    check_reward()
