from app.db.session import engine
from sqlalchemy import text
import sys

def main():
    try:
        with engine.connect() as conn:
            res = conn.execute(text("SHOW CREATE TABLE user_game_wallet"))
            row = res.fetchone()
            if row:
                print(row[1])
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
