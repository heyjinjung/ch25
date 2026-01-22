from app.db.session import engine
from sqlalchemy import text
import sys

def main():
    try:
        with engine.connect() as conn:
            # Add missing tokens and convert to VARCHAR for safety
            conn.execute(text("ALTER TABLE user_game_wallet MODIFY COLUMN token_type VARCHAR(50) NOT NULL"))
            print("Successfully converted token_type to VARCHAR(50)")
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
