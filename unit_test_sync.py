
from sqlalchemy.orm import Session
from sqlalchemy import create_engine
from app.core.config import get_settings
from app.v2.services.user_service import V2UserService
from app.models.user import User
from app.v2.models.user import V2User

def unit_test_sync():
    settings = get_settings()
    engine = create_engine(settings.database_url)
    
    with Session(engine) as db:
        cc_id = "cc001"
        print(f"--- Unit Test: Syncing {cc_id} ---")
        
        # 1. v2_user에 없는지 재확인
        v2_user = db.query(V2User).filter(V2User.cc_id == cc_id).first()
        print(f"V2 User exists before sync? {v2_user is not None}")
        
        # 2. 서비스 호출
        synced_user = V2UserService.get_or_create_v2_user_from_legacy(db, cc_id)
        if synced_user:
            print(f"SUCCESS: Synced user found/created. V2 ID: {synced_user.id}, Nickname: {synced_user.nickname}")
            db.commit()
        else:
            print("FAILURE: User not found in Legacy either.")
            
        # 3. 최종 확인
        final_check = db.query(V2User).filter(V2User.cc_id == cc_id).first()
        print(f"V2 User exists after sync? {final_check is not None}")

if __name__ == "__main__":
    unit_test_sync()
