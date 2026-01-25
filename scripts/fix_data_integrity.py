from app.db.session import SessionLocal
from sqlalchemy import text

def fix_integrity():
    db = SessionLocal()
    try:
        print("=== Fix Integrity ===")
        
        # 1. Delete orphaned user_game_wallet rows
        rows = db.execute(text("DELETE FROM user_game_wallet WHERE user_id NOT IN (SELECT id FROM user)"))
        db.commit()
        print(f"Deleted {rows.rowcount} orphaned user_game_wallet rows.")
        
        # 2. Seed v2_user for user 15 if missing
        user = db.execute(text("SELECT * FROM user WHERE id = 15")).fetchone()
        if user:
            existing = db.execute(text("SELECT id FROM v2_user WHERE id = 15")).fetchone()
            if not existing:
                print(f"Seeding v2_user for user 15 (cc_id={user.external_id})")
                stmt = text("""
                    INSERT INTO v2_user (id, cc_id, nickname, telegram_id, telegram_username, vault_locked_balance, created_at, updated_at)
                    VALUES (:id, :cc_id, :nickname, :tid, :tname, :vlb, NOW(), NOW())
                """)
                db.execute(stmt, {
                    "id": user.id,
                    "cc_id": user.external_id,
                    "nickname": user.nickname,
                    "tid": user.telegram_id,
                    "tname": user.telegram_username,
                    "vlb": user.vault_locked_balance
                })
                db.commit()
                print("Seeded v2_user.")
        else:
            print("Warning: User 15 does not exist in legacy user table!")

    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    fix_integrity()
