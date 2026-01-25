from app.db.session import SessionLocal
from sqlalchemy import text

def diagnose():
    db = SessionLocal()
    try:
        print("=== Data Integrity Diagnostic ===")
        
        # 1. Check User 15
        user = db.execute(text("SELECT id, nickname, external_id FROM user WHERE id = 15")).fetchone()
        print(f"Legacy User 15: {user}")
        
        v2_user = db.execute(text("SELECT id, cc_id FROM v2_user WHERE id = 15")).fetchone()
        print(f"V2 User 15: {v2_user}")
        
        # 2. Check Orphaned user_game_wallet
        orphans = db.execute(text("SELECT count(*) FROM user_game_wallet WHERE user_id NOT IN (SELECT id FROM user)")).scalar()
        print(f"Orphaned user_game_wallet rows: {orphans}")
        
        if orphans > 0:
            print("  -> This is causing the migration 1711 failure.")
            
    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    diagnose()
