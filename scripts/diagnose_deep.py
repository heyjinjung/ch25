from app.db.session import SessionLocal
from sqlalchemy import text

def diagnose_deep():
    db = SessionLocal()
    try:
        print("=== Deep Integrity Diagnostic ===")
        
        # 1. Re-check Orphans
        orphans = db.execute(text("SELECT count(*) FROM user_game_wallet WHERE user_id NOT IN (SELECT id FROM user)")).scalar()
        print(f"Orphaned user_game_wallet rows: {orphans}")
        
        # 2. Check for NULL user_ids (if schema allows, though it shouldn't)
        null_users = db.execute(text("SELECT count(*) FROM user_game_wallet WHERE user_id IS NULL")).scalar()
        print(f"NULL user_id rows: {null_users}")

        # 3. Check FK definition
        # distinct user_ids in wallet
        wallet_users = db.execute(text("SELECT DISTINCT user_id FROM user_game_wallet")).scalars().all()
        user_ids = set(db.execute(text("SELECT id FROM user")).scalars().all())
        
        bad_ids = [uid for uid in wallet_users if uid not in user_ids]
        print(f"Bad User IDs in Wallet: {bad_ids[:10]} (Total: {len(bad_ids)})")
        
        # 4. Check if we can disable FK check temporarily (Dangerous but might be needed for migration if data clean is hard)
        # But we prefer fixing data.
        
    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    diagnose_deep()
