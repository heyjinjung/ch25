
import sys
import os
from sqlalchemy import create_engine, inspect

# Add backend directory to path
sys.path.append(os.path.join(os.path.dirname(__file__), ".."))

from app.core.config import get_settings

def inspect_schema():
    settings = get_settings()
    engine = create_engine(settings.database_url)
    inspector = inspect(engine)
    
    print(">>> Table: user")
    columns = inspector.get_columns("user")
    for c in columns:
        print(f" - {c['name']} ({c['type']})")

    print("\n>>> Table: vault_ledger")
    try:
        columns = inspector.get_columns("vault_ledger")
        for c in columns:
            print(f" - {c['name']} ({c['type']})")
    except Exception as e:
        print(f"Error inspecting vault_ledger: {e}")
        
if __name__ == "__main__":
    inspect_schema()
