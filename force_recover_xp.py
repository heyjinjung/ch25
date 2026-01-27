
from sqlalchemy.orm import Session
from sqlalchemy import create_engine
from app.core.config import get_settings
from app.v2.services.level_xp_service import V2LevelXPService
from app.models.user import User
from app.models.level_xp import UserLevelProgress

def force_recover_xp():
    settings = get_settings()
    engine = create_engine(settings.database_url)
    user_ids = [16, 17]
    level_xp = V2LevelXPService()
    
    with Session(engine) as db:
        print("Starting direct XP recovery for users 16 and 17...")
        for uid in user_ids:
            # 2,000,000원 입금에 대해 일일 한도인 100 XP(5스텝 * 20XP)를 직접 부여
            xp_to_add = 100
            print(f"\nProcessing User {uid}: Adding {xp_to_add} XP...")
            
            # 직접 add_xp 호출 (중복 방지 로직이 없으므로 주의)
            result = level_xp.add_xp(
                db,
                user_id=uid,
                delta=xp_to_add,
                source="CC_DEPOSIT_RECOVERY",
                meta={"reason": "Manual recovery for missing deposit XP"}
            )
            db.commit()
            
            # 결과 확인
            user = db.query(User).filter(User.id == uid).first()
            progress = db.query(UserLevelProgress).filter(UserLevelProgress.user_id == uid).first()
            
            print(f"User {uid} Results:")
            print(f"- Final Level (User Table): {user.level}")
            print(f"- Final Level (Progress Table): {progress.level}")
            print(f"- Final XP: {progress.xp}")

if __name__ == "__main__":
    force_recover_xp()
