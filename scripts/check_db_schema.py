import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.session import SessionLocal
from sqlalchemy import text

def check_schema():
    db = SessionLocal()
    try:
        res = db.execute(text("SHOW COLUMNS FROM team")).fetchall()
        for row in res:
            print(row)
    finally:
        db.close()

if __name__ == "__main__":
    check_schema()
