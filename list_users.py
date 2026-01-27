
from sqlalchemy import create_engine, text
from app.core.config import get_settings

def list_users():
    settings = get_settings()
    engine = create_engine(settings.database_url)
    with engine.connect() as conn:
        res = conn.execute(text("SELECT id, external_id, nickname, level FROM user LIMIT 5"))
        rows = res.mappings().all()
        for row in rows:
            print(row)

if __name__ == "__main__":
    list_users()
