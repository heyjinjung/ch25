
from sqlalchemy.orm import Session
from sqlalchemy import create_engine, text
from app.core.config import get_settings
from app.models.external_ranking import ExternalRankingData
from app.v2.services.admin_cc_deposit_service import V2AdminCCDepositService
from app.v2.schemas.v2_cc_deposit import CCDepositCreate
from app.models.user import User
from app.models.level_xp import UserLevelProgress

def recover_levels_final():
    settings = get_settings()
    engine = create_engine(settings.database_url)
    user_ids = [16, 17]
    
    with Session(engine) as db:
        print(f"Daily Max Steps: {settings.external_ranking_deposit_max_steps_per_day}")
        
        for uid in user_ids:
            row = db.query(ExternalRankingData).filter(ExternalRankingData.user_id == uid).first()
            if not row:
                print(f"User {uid}: No deposit data found.")
                continue
            
            print(f"\nProcessing User {uid} (Current Deposit: {row.deposit_amount})")
            
            # 1. 베이스라인 초기화 (소급 적립을 위해)
            row.daily_base_deposit = 0
            row.deposit_remainder = 0
            db.commit()
            db.refresh(row)
            
            # 2. XP 적립 로직 실행
            # 2,000,000 입금 시 20스텝이지만, 일일 한도 5스텝(100XP)이 적용되어야 함
            payload = CCDepositCreate(
                user_id=row.user_id,
                cc_id=None,
                deposit_amount=row.deposit_amount,
                play_count=row.play_count
            )
            V2AdminCCDepositService.upsert_many(db, [payload])
            db.commit()
            
            # 결과 확인
            db.refresh(row)
            user = db.query(User).filter(User.id == uid).first()
            progress = db.query(UserLevelProgress).filter(UserLevelProgress.user_id == uid).first()
            
            print(f"User {uid} Results:")
            print(f"- Level (User Table): {user.level}")
            print(f"- Level (Progress Table): {progress.level if progress else 'N/A'}")
            print(f"- XP: {progress.xp if progress else 'N/A'}")

if __name__ == "__main__":
    recover_levels_final()
