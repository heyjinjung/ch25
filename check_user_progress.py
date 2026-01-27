
from sqlalchemy import create_engine, text
from app.core.config import get_settings

def check_progress(user_id):
    settings = get_settings()
    engine = create_engine(settings.database_url)
    with engine.connect() as conn:
        v2_user = conn.execute(
            text("SELECT id, cc_id, nickname FROM v2_user WHERE id = :uid"),
            {"uid": user_id},
        ).mappings().first()
        res = conn.execute(
            text("SELECT * FROM user_level_progress WHERE user_id = :uid"),
            {"uid": user_id},
        )
        print(f"V2 User: {v2_user}")
        print(res.mappings().first())

if __name__ == "__main__":
    check_progress(6)
