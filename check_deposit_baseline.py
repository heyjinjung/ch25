
from sqlalchemy import create_engine, text
from app.core.config import get_settings

def check_baseline():
    settings = get_settings()
    engine = create_engine(settings.database_url)
    with engine.connect() as conn:
        for uid in [16, 17]:
            v2_user = conn.execute(
                text("SELECT id, cc_id, nickname FROM v2_user WHERE id = :uid"),
                {"uid": uid},
            ).mappings().first()
            res = conn.execute(
                text(
                    "SELECT user_id, deposit_amount, daily_base_deposit, last_daily_reset "
                    "FROM external_ranking_data WHERE user_id = :uid"
                ),
                {"uid": uid},
            ).mappings().first()
            print(f"V2 User {uid}: {v2_user}")
            print(f"Deposit Baseline {uid}: {res}")

if __name__ == "__main__":
    check_baseline()
