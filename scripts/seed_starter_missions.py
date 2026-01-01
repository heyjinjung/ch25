import sys
import os

# Set up path to import app modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.models.mission import Mission, MissionCategory, MissionRewardType

def seed_starter_missions():
    db: Session = SessionLocal()
    try:
        missions_data = [
            {
                "logic_key": "starter_play_1",
                "title": "게임 1회 완료하기",
                "description": "아무 게임이나 1회 플레이하세요.",
                "category": MissionCategory.NEW_USER,
                "action_type": "PLAY_GAME",
                "target_value": 1,
                "reward_type": MissionRewardType.CASH_UNLOCK,
                "reward_amount": 2500,
                "xp_reward": 0,
                "is_active": True
            },
            {
                "logic_key": "starter_play_3",
                "title": "게임 3회 완료하기",
                "description": "아무 게임이나 총 3회 플레이하세요.",
                "category": MissionCategory.NEW_USER,
                "action_type": "PLAY_GAME",
                "target_value": 3,
                "reward_type": MissionRewardType.CASH_UNLOCK,
                "reward_amount": 2500,
                "xp_reward": 0,
                "is_active": True
            },
            {
                "logic_key": "starter_channel_join",
                "title": "텔레그램 채널 구독",
                "description": "공식 텔레그램 채널에 가입하세요.",
                "category": MissionCategory.NEW_USER,
                "action_type": "JOIN_CHANNEL",
                "target_value": 1,
                "reward_type": MissionRewardType.CASH_UNLOCK,
                "reward_amount": 2500,
                "xp_reward": 0,
                "is_active": True
            },
            {
                "logic_key": "starter_attendance",
                "title": "내일 다시 와서 출석",
                "description": "가입 다음 날 다시 접속하세요.",
                "category": MissionCategory.NEW_USER,
                "action_type": "LOGIN",
                "target_value": 1,
                "reward_type": MissionRewardType.CASH_UNLOCK,
                "reward_amount": 2500,
                "xp_reward": 0,
                "is_active": True
            }
        ]

        for m_data in missions_data:
            existing = db.query(Mission).filter(Mission.logic_key == m_data["logic_key"]).first()
            if existing:
                print(f"Mission {m_data['logic_key']} already exists, updating...")
                for key, value in m_data.items():
                    setattr(existing, key, value)
            else:
                print(f"Creating mission {m_data['logic_key']}...")
                mission = Mission(**m_data)
                db.add(mission)
        
        db.commit()
        print("Successfully seeded starter missions.")
    except Exception as e:
        db.rollback()
        print(f"Error seeding missions: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed_starter_missions()
