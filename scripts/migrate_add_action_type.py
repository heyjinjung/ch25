
import sys
import os

# Add parent directory to path to allow importing app modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.session import SessionLocal
from sqlalchemy import text

def migrate():
    db = SessionLocal()
    try:
        print("Migrating: Adding action_type to mission table...")
        # Check if column exists first to be safe
        check_sql = "SHOW COLUMNS FROM mission LIKE 'action_type'"
        result = db.execute(text(check_sql)).fetchone()
        
        if not result:
            alter_sql = "ALTER TABLE mission ADD COLUMN action_type VARCHAR(50) NULL"
            db.execute(text(alter_sql))
            
            # Add index
            index_sql = "CREATE INDEX ix_mission_action_type ON mission(action_type)"
            db.execute(text(index_sql))
            
            db.commit()
            print("✅ Successfully added 'action_type' column.")
        else:
            print("ℹ️ Column 'action_type' already exists.")
            
    except Exception as e:
        print(f"❌ Migration failed: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    migrate()
