
from sqlalchemy import create_engine, text
from app.core.config import get_settings

def check_baseline():
    settings = get_settings()
    engine = create_engine(settings.database_url)
    with engine.connect() as conn:
        for uid in [16, 17]:
            res = conn.execute(text(f"SELECT user_id, deposit_amount, daily_base_deposit, last_daily_reset FROM external_ranking_data WHERE user_id = {uid}")).mappings().first()
            print(f"User {uid}: {res}")

if __name__ == "__main__":
    check_baseline()
