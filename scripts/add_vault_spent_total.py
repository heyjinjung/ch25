import sys
import os
from sqlalchemy import create_engine, text

# Add backend directory to path
sys.path.append(os.path.join(os.path.dirname(__file__), "..", "backend"))
sys.path.append(os.path.join(os.path.dirname(__file__), ".."))

from app.core.config import get_settings

def add_vault_spent_total():
    settings = get_settings()
    engine = create_engine(settings.database_url)
    
    with engine.connect() as conn:
        try:
            # Check if column exists
            # This is a bit rough, but works for MySQL/SQLite usually
            # Better to use inspection, but for a quick script:
            print("Attempting to add 'vault_spent_total' column to 'user' table...")
            
            # Check if column exists first (Common standard approach)
            # This avoids reliance on specific DB error codes across drivers.
            from sqlalchemy.inspection import inspect
            inspector = inspect(engine)
            columns = [c["name"] for c in inspector.get_columns("user")]
            
            if "vault_spent_total" in columns:
                print("Column 'vault_spent_total' already exists. Skipping.")
                return

            # Add column if missing
            if "mysql" in settings.database_url:
                 conn.execute(text("ALTER TABLE user ADD COLUMN vault_spent_total INTEGER NOT NULL DEFAULT 0;"))
            elif "sqlite" in settings.database_url:
                 conn.execute(text("ALTER TABLE user ADD COLUMN vault_spent_total INTEGER NOT NULL DEFAULT 0"))
            else:
                 # Postgres/Others
                 conn.execute(text("ALTER TABLE user ADD COLUMN vault_spent_total INTEGER NOT NULL DEFAULT 0;"))
                 
            print("Successfully added 'vault_spent_total' column.")
            conn.commit()
        except Exception as e:
            if "duplicate" in str(e).lower() or "exists" in str(e).lower():
                 print("Column 'vault_spent_total' already exists.")
            else:
                 print(f"Error adding column: {e}")

if __name__ == "__main__":
    add_vault_spent_total()
