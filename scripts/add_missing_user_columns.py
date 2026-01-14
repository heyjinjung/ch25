
import sys
import os
from sqlalchemy import create_engine, text, inspect

# Add backend directory to path
sys.path.append(os.path.join(os.path.dirname(__file__), ".."))

from app.core.config import get_settings

def add_missing_columns():
    settings = get_settings()
    engine = create_engine(settings.database_url)
    connection = engine.connect()
    inspector = inspect(engine)
    
    existing_columns = [c['name'] for c in inspector.get_columns("user")]
    print(f"Existing columns: {existing_columns}")

    try:
        if "first_deposit_amount" not in existing_columns:
            print("Adding 'first_deposit_amount'...")
            # MySQL Syntax
            sql = "ALTER TABLE user ADD COLUMN first_deposit_amount INTEGER NOT NULL DEFAULT 0"
            if "sqlite" in settings.database_url:
                 sql = "ALTER TABLE user ADD COLUMN first_deposit_amount INTEGER NOT NULL DEFAULT 0"
            connection.execute(text(sql))
            print("Done.")

        if "first_deposit_at" not in existing_columns:
            print("Adding 'first_deposit_at'...")
            sql = "ALTER TABLE user ADD COLUMN first_deposit_at DATETIME NULL"
            if "sqlite" in settings.database_url:
                 sql = "ALTER TABLE user ADD COLUMN first_deposit_at DATETIME NULL"
            connection.execute(text(sql))
            print("Done.")

        connection.commit()
        print("Schema update complete.")
    except Exception as e:
        print(f"Error: {e}")
    finally:
        connection.close()

if __name__ == "__main__":
    add_missing_columns()
