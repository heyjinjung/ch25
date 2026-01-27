
from sqlalchemy import create_engine, text
from app.core.config import get_settings

def list_users():
    settings = get_settings()
    engine = create_engine(settings.database_url)
    with engine.connect() as conn:
        # V2 정책 반영: 유저 SoT는 v2_user
        res = conn.execute(text("SELECT id, cc_id, nickname FROM v2_user LIMIT 5"))
        rows = res.mappings().all()
        for row in rows:
            print(row)

if __name__ == "__main__":
    list_users()
