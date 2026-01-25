
from sqlalchemy import create_engine, text
from app.core.config import get_settings

def check_table():
    settings = get_settings()
    engine = create_engine(settings.database_url)
    with engine.connect() as conn:
        try:
            result = conn.execute(text("SELECT count(*) FROM v2_roulette_config"))
            print(f"Count in v2_roulette_config: {result.scalar()}")
        except Exception as e:
            print(f"Error: {e}")

if __name__ == "__main__":
    check_table()
