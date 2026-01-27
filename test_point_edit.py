
import sys
import os
from sqlalchemy import create_engine, text
from app.core.config import get_settings

def test_point_edit():
    settings = get_settings()
    engine = create_engine(settings.database_url)
    mission_id = 9
    
    payload = {
        "category": "WEEKLY",
        "title": "주간출석 테스트",
        "description": "주간출석 3회",
        "target_value": 3,
        "logic_key": "WEEKLY_LOGIN_STREAK_TEST",
        "action_type": "LOGIN",
        "reward_type": "POINT",
        "reward_amount": 100,
        "is_active": True
    }
    
    with engine.connect() as conn:
        print(f"Attempting update for ID {mission_id} with POINT reward...")
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
            print("Update for POINT reward successful!")
        except Exception as e:
            print(f"Update failed: {e}")
            conn.rollback()

if __name__ == "__main__":
    test_point_edit()
