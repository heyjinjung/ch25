
from sqlalchemy.orm import Session
from sqlalchemy import create_engine, text
from app.core.config import get_settings
from app.v2.models.user import V2User
from app.models.user import User

def fix_user_id_mismatch_v2():
    settings = get_settings()
    engine = create_engine(settings.database_url)
    
    with Session(engine) as db:
        cc_id = "cc001"
        print(f"--- Fixing ID Mismatch for {cc_id} (V2) ---")
        
        # 1. 기존 잘못된 V2 유저 삭제
        v2_user = db.query(V2User).filter(V2User.cc_id == cc_id).first()
        if v2_user and v2_user.id != 17: # level 유저의 legacy ID는 17임
            print(f"Deleting incorrect V2 User with ID {v2_user.id}")
            db.delete(v2_user)
            db.commit()
            print("Deleted old record.")
        
        # 2. 신규 로직으로 재생성 테스트 (get_or_create_v2_user_from_legacy 호출)
        from app.v2.services.user_service import V2UserService
        synced_user = V2UserService.get_or_create_v2_user_from_legacy(db, cc_id)
        if synced_user:
            print(f"SUCCESS: Synced user created with ID: {synced_user.id}")
            db.commit()
        else:
            print("FAILURE: Sync failed.")

if __name__ == "__main__":
    fix_user_id_mismatch_v2()
