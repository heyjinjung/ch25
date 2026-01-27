
from sqlalchemy import create_engine, text
from app.core.config import get_settings

def check_progress(user_id):
    settings = get_settings()
    engine = create_engine(settings.database_url)
    with engine.connect() as conn:
        res = conn.execute(text(f"SELECT * FROM user_level_progress WHERE user_id = {user_id}"))
        print(res.mappings().first())

if __name__ == "__main__":
    check_progress(6)
