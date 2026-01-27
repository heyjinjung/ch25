
from sqlalchemy.orm import Session
from sqlalchemy import create_engine, text, func
from app.core.config import get_settings
from app.v2.services.admin_cc_deposit_service import V2AdminCCDepositService
from app.models.external_ranking_daily_deposit_delta import ExternalRankingDailyDepositDelta
from app.models.external_ranking import ExternalRankingData
from app.models.user import User
from app.models.level_xp import UserLevelProgress
from datetime import date

def verify_api_fix():
    settings = get_settings()
    engine = create_engine(settings.database_url)
    user_id = 4 # test002 (Level 1, 0 XP)
    
    with Session(engine) as db:
        print(f"--- Verifying API Fix for User {user_id} ---")
        
        # 1. 이전 상태 확인
        user = db.query(User).filter(User.id == user_id).first()
        progress = db.query(UserLevelProgress).filter(UserLevelProgress.user_id == user_id).first()
        print(f"Before: Level={user.level}, XP={progress.xp if progress else 0}")
        
        # 2. _sync_cumulative_deposit 로직 시뮬레이션 (수정된 로직)
        # 100,000원 입금 기록 추가
        log = ExternalRankingDailyDepositDelta(
            user_id=user_id,
            kst_date=date(2026, 1, 27),
            deposit_delta=100000
        )
        db.add(log)
        db.commit()
        
        # economy_routes.py의 _sync_cumulative_deposit 내부 로직 실행
        total = db.query(func.sum(ExternalRankingDailyDepositDelta.deposit_delta)).filter(ExternalRankingDailyDepositDelta.user_id == user_id).scalar() or 0
        from app.v2.schemas.v2_cc_deposit import CCDepositCreate
        
        rank_row = db.query(ExternalRankingData).filter(ExternalRankingData.user_id == user_id).first()
        current_play_count = rank_row.play_count if rank_row else 0
        
        payload = CCDepositCreate(
            user_id=user_id,
            cc_id=None,
            deposit_amount=int(total),
            play_count=current_play_count
        )
        V2AdminCCDepositService.upsert_many(db, [payload])
        db.commit()
        
        # 3. 결과 확인
        db.refresh(user)
        progress = db.query(UserLevelProgress).filter(UserLevelProgress.user_id == user_id).first()
        print(f"After: Level={user.level}, XP={progress.xp if progress else 0}")
        
        if progress and progress.xp > 0:
            print("SUCCESS: XP successfully triggered from manual deposit sync!")
        else:
            print("FAILURE: XP not updated.")

if __name__ == "__main__":
    verify_api_fix()
