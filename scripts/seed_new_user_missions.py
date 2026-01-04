import sys
import os
from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker

# Add project root to sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.config import get_settings
from app.models.mission import Mission

def seed_new_user_missions():
    settings = get_settings()
    engine = create_engine(settings.database_url)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()

    missions_data = [
        {
            "title": "첫 게임 플레이",
            "description": "아무 게임이나 1회 플레이하세요.",
            "category": "NEW_USER",
            "logic_key": "NEW_USER_PLAY_1",
            "action_type": "PLAY_GAME",
            "target_value": 1,
            "reward_type": "CASH_UNLOCK",  # Custom type for unlock
            "reward_amount": 2500,
            "is_active": True,
        },
        {
            "title": "게임 마스터 (3회)",
            "description": "게임을 3회 더 플레이해보세요.",
            "category": "NEW_USER",
            "logic_key": "NEW_USER_PLAY_3",
            "action_type": "PLAY_GAME",
            "target_value": 3,
            "reward_type": "CASH_UNLOCK",
            "reward_amount": 2500,
            "is_active": True,
        },
        {
            "title": "커뮤니티 함께하기",
            "description": "공식 채널에 입장하거나 스토리를 공유하세요.",
            "category": "NEW_USER",
            "logic_key": "NEW_USER_VIRAL",
            "action_type": "JOIN_CHANNEL", # Shared logic, can also be fulfilled by SHARE_STORY manually if we alias it
            "target_value": 1,
            "reward_type": "CASH_UNLOCK",
            "reward_amount": 2500,
            "is_active": True,
        },
        {
            "title": "2일차 출석 체크",
            "description": "내일 다시 접속하여 출석체크를 완료하세요.",
            "category": "NEW_USER",
            "logic_key": "NEW_USER_LOGIN_DAY2",
            "action_type": "LOGIN",
            "target_value": 2,
            "reward_type": "CASH_UNLOCK",
            "reward_amount": 2500,
            "is_active": True,
        }
    ]

    for m_data in missions_data:
        existing = db.execute(select(Mission).where(Mission.logic_key == m_data["logic_key"])).scalar_one_or_none()
        if existing:
            print(f"Update: {m_data['title']}")
            for k, v in m_data.items():
                setattr(existing, k, v)
        else:
            print(f"Create: {m_data['title']}")
            new_mission = Mission(**m_data)
            db.add(new_mission)
    
    db.commit()
    print("New User Missions Seeded.")
    db.close()

if __name__ == "__main__":
    seed_new_user_missions()
