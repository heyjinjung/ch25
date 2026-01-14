
import sys
import os
from sqlalchemy import create_engine, text

# Add backend directory to path
sys.path.append(os.path.join(os.path.dirname(__file__), ".."))

from app.core.config import get_settings

def add_vault_ledger_table():
    settings = get_settings()
    engine = create_engine(settings.database_url)
    connection = engine.connect()

    try:
        print("Creating 'vault_ledger' table...")
        
        # MySQL Syntax mostly, but generic enough
        create_sql = """
        CREATE TABLE IF NOT EXISTS vault_ledger (
            id INTEGER PRIMARY KEY AUTO_INCREMENT,
            user_id INTEGER NOT NULL,
            amount INTEGER NOT NULL,
            balance_after INTEGER NOT NULL,
            reason VARCHAR(255),
            ref_type VARCHAR(50),
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES user(id)
        );
        """
        
        # SQLite adjustment if needed
        if "sqlite" in settings.database_url:
             create_sql = """
            CREATE TABLE IF NOT EXISTS vault_ledger (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                amount INTEGER NOT NULL,
                balance_after INTEGER NOT NULL,
                reason VARCHAR(255),
                ref_type VARCHAR(50),
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES user(id)
            );
            """

        connection.execute(text(create_sql))
        print("Successfully created 'vault_ledger' table.")
        connection.commit()
    except Exception as e:
        print(f"Error: {e}")
    finally:
        connection.close()

if __name__ == "__main__":
    add_vault_ledger_table()
