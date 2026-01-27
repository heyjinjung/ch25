
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
            # 1. V2 user table (V2 정책 반영: 유저 SoT는 v2_user)
            v2_user = conn.execute(
                text("SELECT id, cc_id, nickname FROM v2_user WHERE id = :uid"),
                {"uid": uid},
            ).mappings().first()
            print(f"V2 User Table: {v2_user}")
            
            # 2. Level Progress
            progress = conn.execute(
                text("SELECT * FROM user_level_progress WHERE user_id = :uid"),
                {"uid": uid},
            ).mappings().first()
            print(f"Level Progress (user_level_progress): {progress}")
            
            # 3. Deposit Data
            deposit = conn.execute(
                text("SELECT * FROM external_ranking_data WHERE user_id = :uid"),
                {"uid": uid},
            ).mappings().first()
            print(f"Deposit Data (external_ranking_data): {deposit}")
            
            # 4. XP Events
            events = conn.execute(
                text(
                    "SELECT * FROM user_xp_event_log WHERE user_id = :uid ORDER BY created_at DESC LIMIT 5"
                ),
                {"uid": uid},
            ).mappings().all()
            print(f"Recent XP Events (user_xp_event_log): {list(events)}")

if __name__ == "__main__":
    inspect_users()
