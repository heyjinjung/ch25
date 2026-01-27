
from sqlalchemy import create_engine, text
from app.core.config import get_settings
import json

def inspect_users():
    settings = get_settings()
    engine = create_engine(settings.database_url)
    user_ids = [16, 17]
    with engine.connect() as conn:
        for uid in user_ids:
            print(f"\n=== User ID: {uid} ===")
            # 1. User table
            user = conn.execute(text(f"SELECT id, external_id, nickname, level FROM user WHERE id = {uid}")).mappings().first()
            print(f"User Table: {user}")
            
            # 2. Level Progress
            progress = conn.execute(text(f"SELECT * FROM user_level_progress WHERE user_id = {uid}")).mappings().first()
            print(f"Level Progress: {progress}")
            
            # 3. Deposit Data
            deposit = conn.execute(text(f"SELECT * FROM external_ranking_data WHERE user_id = {uid}")).mappings().first()
            print(f"Deposit Data: {deposit}")
            
            # 4. XP Events
            events = conn.execute(text(f"SELECT * FROM user_xp_event_log WHERE user_id = {uid} ORDER BY created_at DESC LIMIT 5")).mappings().all()
            print(f"Recent XP Events: {list(events)}")

if __name__ == "__main__":
    inspect_users()
