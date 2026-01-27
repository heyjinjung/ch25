from sqlalchemy import create_engine, text
from app.core.config import get_settings

def compare_users():
    settings = get_settings()
    engine = create_engine(settings.database_url)
    with engine.connect() as conn:
        print("--- Table: v2_user (V2 정책 반영) ---")
        sql_v2 = text("SELECT id, cc_id, nickname FROM v2_user WHERE nickname = 'level' OR cc_id = 'level' OR cc_id = 'cc001'")
        res_v2 = conn.execute(sql_v2).mappings().all()
        for r in res_v2:
            print(r)

if __name__ == '__main__':
    compare_users()
