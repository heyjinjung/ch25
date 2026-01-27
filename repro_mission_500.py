
import sys
import os
from sqlalchemy import create_engine, text
from app.core.config import get_settings

def reproduce():
    settings = get_settings()
    engine = create_engine(settings.database_url)
    mission_id = 9
    
    payload = {
        "category": "WEEKLY",
        "title": "주간출석",
        "description": "주간출석 3회",
        "target_value": 3,
        "logic_key": "WEEKLY_LOGIN_STREAK",
        "action_type": "LOGIN",
        "reward_type": "CHICKEN_GIFTICON_5000",
        "reward_amount": 1,
        "is_active": True
    }
    
    with engine.connect() as conn:
        print(f"Current data for ID {mission_id}:")
        res = conn.execute(text(f"SELECT * FROM mission WHERE id = {mission_id}"))
        print(res.mappings().first())
        
        print("\nAttempting update...")
        try:
            update_sql = text("""
                UPDATE mission 
                SET category = :category, title = :title, description = :description, 
                    target_value = :target_value, logic_key = :logic_key, 
                    action_type = :action_type, reward_type = :reward_type, 
                    reward_amount = :reward_amount, is_active = :is_active
                WHERE id = :id
            """)
            conn.execute(update_sql, {**payload, "id": mission_id})
            conn.commit()
            print("Update successful!")
        except Exception as e:
            print(f"Update failed with error: {e}")
            conn.rollback()

if __name__ == "__main__":
    reproduce()
