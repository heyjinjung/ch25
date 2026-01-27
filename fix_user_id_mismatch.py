
from sqlalchemy.orm import Session
from sqlalchemy import create_engine, text
from app.core.config import get_settings
from app.v2.models.user import V2User
from app.models.user import User

def fix_user_id_mismatch():
    settings = get_settings()
    engine = create_engine(settings.database_url)
    
    with Session(engine) as db:
        cc_id = "cc001"
        print(f"--- Fixing ID Mismatch for {cc_id} ---")
        
        legacy_user = db.query(User).filter(User.external_id == cc_id).first()
        v2_user = db.query(V2User).filter(V2User.cc_id == cc_id).first()
        
        if not legacy_user or not v2_user:
            print("Required records not found.")
            return
            
        if v2_user.id != legacy_user.id:
            print(f"Mismatch found: Legacy ID {legacy_user.id} vs V2 ID {v2_user.id}")
            
            # PK를 직접 수정하는 것은 위험하므로 삭제 후 재생성 (또는 수동 쿼리)
            # 여기서는 안전하게 삭제 후 명시적 ID 대입으로 삽입
            old_id = v2_user.id
            new_id = legacy_user.id
            
            # v2_user_segment 등 관계 테이블이 있다면 CASCADE 등이 필요할 수 있음
            # 현재는 단순하게 v2_user 테이블만 처리 (이미 생성된 데이터가 거의 없음)
            db.delete(v2_user)
            db.flush()
            
            # RAW SQL을 사용하여 PK를 수동으로 삽입 (ORM 자동생성 회피)
            insert_stmt = text(
                "INSERT INTO v2_user (id, cc_id, nickname, telegram_id, telegram_username, created_at, updated_at) "
                "VALUES (:id, :cc_id, :nickname, :telegram_id, :telegram_username, :created_at, :updated_at)"
            )
            db.execute(insert_stmt, {
                "id": new_id,
                "cc_id": v2_user.cc_id,
                "nickname": v2_user.nickname,
                "telegram_id": v2_user.telegram_id,
                "telegram_username": v2_user.telegram_username,
                "created_at": v2_user.created_at,
                "updated_at": v2_user.updated_at
            })
            
            db.commit()
            print(f"SUCCESS: V2 User ID updated from {old_id} to {new_id} to match Legacy.")
        else:
            print("IDs already match.")

if __name__ == "__main__":
    fix_user_id_mismatch()
