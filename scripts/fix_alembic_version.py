#!/usr/bin/env python3
"""Fix alembic version after partial migration."""
import sys
sys.path.insert(0, "/app")

from app.db.session import SessionLocal
from sqlalchemy import text

def fix_version():
    db = SessionLocal()
    try:
        # Check current
        rows = db.execute(text("SELECT * FROM alembic_version")).fetchall()
        print(f"Before: {rows}")
        
        # Update to new version
        db.execute(text("UPDATE alembic_version SET version_num = '20260201_0900_add_hq_prospective_user' WHERE version_num = '20260131_1600_add_dice_golden_hour_time_columns'"))
        db.commit()
        
        # Verify
        rows_after = db.execute(text("SELECT * FROM alembic_version")).fetchall()
        print(f"After: {rows_after}")
        print("✅ Alembic version updated!")
    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    fix_version()
