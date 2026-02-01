#!/usr/bin/env python3
"""Check tables in database for segment and hq."""
import sys
sys.path.insert(0, "/app")

from sqlalchemy import text
from app.db.session import SessionLocal

def main():
    db = SessionLocal()
    try:
        result = db.execute(text("SHOW TABLES")).fetchall()
        print("=== Tables with 'segment' or 'hq' ===")
        for r in result:
            t = r[0]
            if "segment" in t.lower() or "hq" in t.lower() or "prospective" in t.lower():
                print(f"  - {t}")
        
        print("\n=== All tables ===")
        for r in result:
            print(f"  - {r[0]}")
    finally:
        db.close()

if __name__ == "__main__":
    main()
