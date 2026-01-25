from app.db.session import SessionLocal
from sqlalchemy import text

def verify_schema():
    db = SessionLocal()
    try:
        print("=== Schema Verification ===")
        
        # 1. Check v2_roulette_segment CHECK constraint
        # In MySQL, CHECK constraints are stored in information_schema.CHECK_CONSTRAINTS (MySQL 8.0+)
        # or we can check the table definition via SHOW CREATE TABLE
        print("Checking v2_roulette_segment definition...")
        # Note: Table name in migration is v2_roulette_segment, but verify table name first.
        # My check_tables showed 'roulette_segment'. Let's check which one it is.
        # Wait, check_tables.py output used the model name or table name? It was table names.
        # It listed 'roulette_segment'. 
        # But migration file 20260125_1600 uses 'v2_roulette_segment'. 
        # Let's check 'roulette_segment' first.
        
        try:
            res = db.execute(text("SHOW CREATE TABLE roulette_segment")).fetchone()
            print(f"Table roulette_segment: {res[1]}")
        except Exception:
            print("Table roulette_segment not found, trying v2_roulette_segment")
            try:
                res = db.execute(text("SHOW CREATE TABLE v2_roulette_segment")).fetchone()
                print(f"Table v2_roulette_segment: {res[1]}")
            except Exception as e:
                print(f"Neither table found: {e}")

        # 2. Check mission Enum
        print("\nChecking mission reward_type enum...")
        res = db.execute(text("SHOW COLUMNS FROM mission LIKE 'reward_type'")).fetchone()
        print(f"mission.reward_type type: {res[1]}")
        
        if "'GOOGLE_GIFTICON_10000'" in res[1]:
            print("✅ Mission Enum Updated (20260124_1500 applied)")
        else:
            print("❌ Mission Enum Outdated")

    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    verify_schema()
