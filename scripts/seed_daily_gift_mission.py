import sys
from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.models.mission import Mission, MissionCategory, MissionRewardType
from app.models.game_wallet import GameTokenType

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

def seed_daily_gift():
    # Use local connection for verification script
    SQLALCHEMY_DATABASE_URL = "mysql+pymysql://xmasuser:2026@127.0.0.1:3307/xmas_event"
    engine = create_engine(SQLALCHEMY_DATABASE_URL)
    SessionLocalOverride = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db: Session = SessionLocalOverride()

    try:
        # Check if mission already exists by logic_key
        logic_key = "daily_login_gift"
        existing = db.query(Mission).filter(Mission.logic_key == logic_key).first()
        
        if existing:
            print(f"Mission '{logic_key}' already exists. Updating...")
            existing.title = "매일 선물 (Daily Gift)"
            existing.description = "매일 접속만 해도 다이아 10개를 드립니다."
            existing.category = MissionCategory.DAILY
            existing.action_type = "LOGIN"
            existing.target_value = 1
            existing.reward_type = MissionRewardType.DIAMOND
            existing.reward_amount = 10
            existing.is_active = True
        else:
            print(f"Creating new mission: {logic_key}")
            new_mission = Mission(
                title="매일 선물 (Daily Gift)",
                description="매일 접속만 해도 다이아 10개를 드립니다.",
                category=MissionCategory.DAILY,
                logic_key=logic_key,
                action_type="LOGIN",
                target_value=1,
                reward_type=MissionRewardType.DIAMOND,
                reward_amount=10,
                is_active=True
            )
            db.add(new_mission)
        
        # Also handle the legacy virtual mission if it exists and conflicts
        virtual_legacy = db.query(Mission).filter(Mission.logic_key == "daily_gift").first()
        if virtual_legacy:
            print("Deactivating legacy 'daily_gift' mission...")
            virtual_legacy.is_active = False
            
        db.commit()
        print("Success: Daily Gift mission seeded/updated.")
    except Exception as e:
        db.rollback()
        print(f"Error seeding mission: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed_daily_gift()
