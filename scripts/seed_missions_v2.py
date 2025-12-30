import sys
import os

# Add parent directory to path to allow importing app modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.models.mission import Mission, MissionCategory, MissionRewardType

def seed_missions_v2():
    db: Session = SessionLocal()
    try:
        missions = [
            # DAILY MISSIONS (Engagement Loop -> Diamond)
            {
                "title": "Daily Login",
                "description": "Log in to the app daily.",
                "category": MissionCategory.DAILY,
                "logic_key": "daily_login",
                "target_value": 1,
                "reward_type": MissionRewardType.DIAMOND,
                "reward_amount": 1,  # 1 Diamond
                "xp_reward": 0
            },
            {
                "title": "Play 5 Games",
                "description": "Play Dice or Roulette 5 times.",
                "category": MissionCategory.DAILY,
                "logic_key": "play_any_game_5",
                "target_value": 5,
                "reward_type": MissionRewardType.DIAMOND,
                "reward_amount": 5,  # 5 Diamonds
                "xp_reward": 0
            },
            {
                "title": "Play 10 Games",
                "description": "Play Dice or Roulette 10 times.",
                "category": MissionCategory.DAILY,
                "logic_key": "play_any_game_10",
                "target_value": 10,
                "reward_type": MissionRewardType.DIAMOND,
                "reward_amount": 10,  # 10 Diamonds
                "xp_reward": 0
            },
            
            # WEEKLY MISSIONS (Retention)
            {
                "title": "Weekly Marathon",
                "description": "Play 500 games in a week.",
                "category": MissionCategory.WEEKLY,
                "logic_key": "play_any_game_500",
                "target_value": 500,
                "reward_type": MissionRewardType.DIAMOND,
                "reward_amount": 50,  # 50 Diamonds
                "xp_reward": 0
            },
            
            # SPECIAL MISSIONS (One-time)
            {
                "title": "Join Telegram Channel",
                "description": "Subscribe to our official channel.",
                "category": MissionCategory.SPECIAL,
                "logic_key": "join_telegram_channel",
                "target_value": 1,
                "reward_type": MissionRewardType.DIAMOND,
                "reward_amount": 5,
                "xp_reward": 0  # Still 0 XP, purely Diamond economy
            },
            {
                "title": "Invite 5 Friends",
                "description": "Invite 5 friends to the game.",
                "category": MissionCategory.SPECIAL,
                "logic_key": "invite_friends_5",
                "target_value": 5,
                "reward_type": MissionRewardType.DIAMOND,
                "reward_amount": 50,
                "xp_reward": 0
            }
        ]

        print("--- Seeding Missions v2 (Diamond Economy) ---")
        for m_data in missions:
            existing = db.query(Mission).filter(Mission.logic_key == m_data["logic_key"]).first()
            if existing:
                print(f"Updating: {m_data['title']}")
                existing.title = m_data["title"]
                existing.description = m_data["description"]
                existing.target_value = m_data["target_value"]
                existing.reward_type = m_data["reward_type"]
                existing.reward_amount = m_data["reward_amount"]
                existing.xp_reward = m_data["xp_reward"]
            else:
                print(f"Creating: {m_data['title']}")
                new_mission = Mission(**m_data)
                db.add(new_mission)
        
        db.commit()
        print("--- Seeding Completed Successfully ---")

    except Exception as e:
        print(f"Error seeding missions: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_missions_v2()
