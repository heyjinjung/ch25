from app.db.session import engine
from sqlalchemy import text
import sys

def migrate():
    tables = ["user_game_wallet", "user_game_wallet_ledger", "trial_token_bucket"]
    try:
        with engine.connect() as conn:
            for table in tables:
                print(f"Migrating {table}...")
                conn.execute(text(f"ALTER TABLE {table} MODIFY COLUMN token_type VARCHAR(50) NOT NULL"))
                conn.execute(text("COMMIT")) # Ensure commit in some environments
            print("Successfully widened all token_type columns.")
    except Exception as e:
        print(f"Migration Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    migrate()
