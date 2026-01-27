
from sqlalchemy import create_engine, text
from app.core.config import get_settings

def list_levels():
    settings = get_settings()
    engine = create_engine(settings.database_url)
    with engine.connect() as conn:
        print("Fetching from v2_level_reward_table...")
        res = conn.execute(text("SELECT * FROM v2_level_reward_table ORDER BY level"))
        rows = res.mappings().all()
        for row in rows:
            print(row)

if __name__ == "__main__":
    list_levels()
