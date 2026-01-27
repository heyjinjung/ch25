from sqlalchemy import create_engine, text
from app.core.config import get_settings

def check_db():
    settings = get_settings()
    print(f"DEBUG: DATABASE_URL = {settings.database_url}")
    
    engine = create_engine(settings.database_url)
    with engine.connect() as conn:
        # 'level' 사용자 확인 (V2 정책 반영: 유저 SoT는 v2_user)
        sql = text("SELECT id, cc_id, nickname FROM v2_user WHERE cc_id = 'level' OR nickname = 'level'")
        res = conn.execute(sql).mappings().all()
        print(f"DEBUG: 'level' v2_user search result: {res}")
        
        # 외부 랭킹 데이터(입금 데이터) 확인
        sql_rank = text("SELECT * FROM external_ranking_data WHERE user_id IN (SELECT id FROM v2_user WHERE cc_id = 'level')")
        res_rank = conn.execute(sql_rank).mappings().all()
        print(f"DEBUG: 'level' v2_user deposit data: {res_rank}")

if __name__ == '__main__':
    check_db()
