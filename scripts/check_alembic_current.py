from app.db.session import engine
from sqlalchemy import text

def check_version():
    try:
        with engine.connect() as conn:
            rows = conn.execute(text("SELECT * FROM alembic_version")).fetchall()
            print(f"Current DB Revision: {rows}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check_version()
