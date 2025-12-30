import sys
import os

# Add parent directory to path to allow importing app modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.session import SessionLocal
from app.models.mission import Mission, MissionCategory, MissionRewardType

def seed_missions():
    db = SessionLocal()
    try:
        missions = [
            # DAILY
            {
                "title": "일일 출석체크",
                "description": "매일 접속하고 다이아몬드와 경험치를 받으세요!",
                "category": MissionCategory.DAILY,
                "logic_key": "daily_login",
                "target_value": 1,
                "reward_type": MissionRewardType.DIAMOND,
                "reward_amount": 1,
                "xp_reward": 100
            },
            {
                "title": "게임 5회 플레이",
                "description": "아무 게임이나 5회 플레이하세요.",
                "category": MissionCategory.DAILY,
                "logic_key": "play_game_5",
                "target_value": 5,
                "reward_type": MissionRewardType.DIAMOND,
                "reward_amount": 5,
                "xp_reward": 200
            },
            {
                "title": "게임 10회 플레이",
                "description": "아무 게임이나 10회 플레이하세요.",
                "category": MissionCategory.DAILY,
                "logic_key": "play_game_10",
                "target_value": 10,
                "reward_type": MissionRewardType.DIAMOND,
                "reward_amount": 10,
                "xp_reward": 300
            },
            
            # WEEKLY
            {
                "title": "주간 500회 플레이",
                "description": "일주일 동안 게임을 500회 플레이하세요.",
                "category": MissionCategory.WEEKLY,
                "logic_key": "play_game_weekly_500",
                "target_value": 500,
                "reward_type": MissionRewardType.DIAMOND,
                "reward_amount": 50,
                "xp_reward": 1000
            },

            # SPECIAL
            {
                "title": "공식 채널 구독",
                "description": "공식 텔레그램 채널을 구독하세요.",
                "category": MissionCategory.SPECIAL,
                "logic_key": "subscribe_channel",
                "target_value": 1,
                "reward_type": MissionRewardType.DIAMOND,
                "reward_amount": 5,
                "xp_reward": 500
            },
        ]

        for m_data in missions:
            existing = db.query(Mission).filter(Mission.logic_key == m_data["logic_key"]).first()
            if not existing:
                print(f"Creating mission: {m_data['title']}")
                mission = Mission(**m_data)
                db.add(mission)
            else:
                print(f"Update existing mission: {m_data['title']}")
                # Update changeable fields
                existing.title = m_data["title"]
                existing.description = m_data["description"]
                existing.target_value = m_data["target_value"]
                existing.reward_type = m_data["reward_type"]
                existing.reward_amount = m_data["reward_amount"]
                existing.xp_reward = m_data["xp_reward"]
        
        db.commit()
        print("Mission seeding completed successfully.")

    except Exception as e:
        print(f"Error seeding missions: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_missions()
