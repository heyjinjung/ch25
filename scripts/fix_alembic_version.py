from app.db.session import SessionLocal
from sqlalchemy import text

def fix_version():
    db = SessionLocal()
    try:
        # Check current
        rows = db.execute(text("SELECT * FROM alembic_version")).fetchall()
        print(f"Before: {rows}")
        
        # Delete ghost revision
        db.execute(text("DELETE FROM alembic_version WHERE version_num = '20260117_1200'"))
        db.commit()
        
        # Verify
        rows_after = db.execute(text("SELECT * FROM alembic_version")).fetchall()
        print(f"After: {rows_after}")
        print("✅ Fixed alembic_version table.")
    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    fix_version()
