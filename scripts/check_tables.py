from app.db.session import engine
from sqlalchemy import text, inspect

def check_tables():
    try:
        insp = inspect(engine)
        tables = insp.get_table_names()
        print("Existing Tables:")
        for t in sorted(tables):
            print(f"- {t}")
            
        # Check specifically for v2_user or user table
        # Note: In the migration file, table is 'user', not 'v2_user'.
        # Wait, let's look at the migration file 20260119_0904...
        # It creates 'user' table (line 242).
        # The script inspect_vault_status.py failed with "Table 'v2.v2_user' doesn't exist".
        # This implies that app code expects 'v2_user' but migration creates 'user'?
        # Or maybe 'v2_user' is a view? or the model maps to 'v2_user' table?
        
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check_tables()
