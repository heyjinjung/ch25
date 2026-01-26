
import os
import sys
from sqlalchemy import create_engine, text

# Force connection string
DB_URL = "mysql+pymysql://xmasuser:2026@localhost:3307"

def list_databases():
    print(f"Connecting to: {DB_URL}")
    try:
        engine = create_engine(DB_URL)
        with engine.connect() as conn:
            print("\n=== Databases ===")
            result = conn.execute(text("SHOW DATABASES"))
            for row in result:
                print(f" - {row[0]}")
                
            print("\n=== Checking 'v2' tables ===")
            try:
                conn.execute(text("USE v2"))
                result = conn.execute(text("SHOW TABLES"))
                for row in result:
                    print(f" - {row[0]}")
            except Exception as e:
                print(f"Could not check v2 tables: {e}")

            print("\n=== Checking 'xmas_event' tables ===")
            try:
                conn.execute(text("USE xmas_event"))
                result = conn.execute(text("SHOW TABLES"))
                for row in result:
                    print(f" - {row[0]}")
            except Exception as e:
                print(f"Could not check xmas_event tables: {e}")

    except Exception as e:
        print(f"Connection failed: {e}")

if __name__ == "__main__":
    list_databases()
