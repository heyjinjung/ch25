"""
Reset user test data (Vault, Missions, etc.) for testing purposes.

Usage:
    python scripts/reset_user_test_data.py --user_id <ID>
    python scripts/reset_user_test_data.py --external_id <EID>
"""
import os
import sys
import argparse
from datetime import datetime

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

try:
    from sqlalchemy import create_engine, text
    from sqlalchemy.orm import sessionmaker
except ModuleNotFoundError as e:
    if getattr(e, "name", None) == "sqlalchemy":
        print(
            "ERROR: sqlalchemy is not installed.\n"
            "Install dependencies first, e.g.:\n"
            "  python3 -m pip install -r requirements.txt\n"
            "(Recommended) Use a virtualenv on the server."
        )
        sys.exit(1)
    raise

# Load environment
from dotenv import load_dotenv
load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    print("ERROR: DATABASE_URL not set")
    sys.exit(1)

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)


def _column_exists(db, table: str, column: str) -> bool:
    # MySQL/MariaDB-style check (this repo's migrations use information_schema + DATABASE()).
    try:
        return bool(
            db.execute(
                text(
                    """
                    SELECT 1
                    FROM information_schema.columns
                    WHERE table_schema = DATABASE()
                      AND table_name = :table
                      AND column_name = :column
                    LIMIT 1
                    """
                ),
                {"table": table, "column": column},
            ).scalar()
        )
    except Exception:
        return False


def _table_exists(db, table: str) -> bool:
    try:
        return bool(
            db.execute(
                text(
                    """
                    SELECT 1
                    FROM information_schema.tables
                    WHERE table_schema = DATABASE()
                      AND table_name = :table
                    LIMIT 1
                    """
                ),
                {"table": table},
            ).scalar()
        )
    except Exception:
        return False

def reset_user(db, user_id=None, external_id=None):
    if user_id:
        user_row = db.execute(text("SELECT id, external_id, nickname, vault_locked_balance FROM user WHERE id = :uid"), {"uid": user_id}).fetchone()
    elif external_id:
        user_row = db.execute(text("SELECT id, external_id, nickname, vault_locked_balance FROM user WHERE external_id = :eid"), {"eid": external_id}).fetchone()
    else:
        print("Error: No user specified")
        return

    if not user_row:
        print(f"❌ User not found (user_id={user_id}, external_id={external_id})")
        return

    uid = user_row[0]
    eid = user_row[1]
    nick = user_row[2] or "N/A"
    balance = user_row[3]

    print(f"\n--- Resetting User: {nick} (ID: {uid}, ExtID: {eid}) ---")
    print(f"Current Vault Balance: {balance}")

    # 1. Reset Vault Balance & Expiry
    db.execute(
        text("UPDATE user SET vault_locked_balance = 0, vault_balance = 0, vault_locked_expires_at = NULL, vault_fill_used_at = NULL, play_streak = 0 WHERE id = :uid"),
        {"uid": uid}
    )
    print("✅ User vault and streak reset.")

    # 1.1 Reset Telegram linkage/auth (for clean testing)
    telegram_updates = []
    if _column_exists(db, "user", "telegram_id"):
        telegram_updates.append("telegram_id = NULL")
    if _column_exists(db, "user", "telegram_username"):
        telegram_updates.append("telegram_username = NULL")
    if _column_exists(db, "user", "telegram_is_blocked"):
        telegram_updates.append("telegram_is_blocked = 0")
    if _column_exists(db, "user", "telegram_join_count"):
        telegram_updates.append("telegram_join_count = 0")
    if _column_exists(db, "user", "telegram_link_nonce"):
        telegram_updates.append("telegram_link_nonce = NULL")
    if _column_exists(db, "user", "telegram_link_nonce_expires_at"):
        telegram_updates.append("telegram_link_nonce_expires_at = NULL")

    if telegram_updates:
        db.execute(
            text(f"UPDATE user SET {', '.join(telegram_updates)} WHERE id = :uid"),
            {"uid": uid},
        )
        print("✅ Telegram linkage/auth fields reset.")

    if _table_exists(db, "telegram_link_code"):
        db.execute(text("DELETE FROM telegram_link_code WHERE user_id = :uid"), {"uid": uid})
        print("✅ Telegram link codes cleared.")

    if _table_exists(db, "admin_user_profile") and _column_exists(db, "admin_user_profile", "telegram_id"):
        db.execute(
            text("UPDATE admin_user_profile SET telegram_id = NULL WHERE user_id = :uid"),
            {"uid": uid},
        )
        print("✅ Admin profile telegram_id cleared.")

    # 2. Delete Mission Progress
    db.execute(text("DELETE FROM user_mission_progress WHERE user_id = :uid"), {"uid": uid})
    print("✅ Mission progress cleared.")

    # 3. Delete Vault Earn Events
    db.execute(text("DELETE FROM vault_earn_event WHERE user_id = :uid"), {"uid": uid})
    print("✅ Vault earn events cleared.")

    # 4. Reset User Activity (for withdrawal testing)
    db.execute(text("UPDATE user_activity SET last_charge_at = NULL WHERE user_id = :uid"), {"uid": uid})
    print("✅ User activity reset.")

    db.commit()
    print("\n🎉 Reset complete! The user can now start 'Welcome Missions' from scratch.")

def main():
    parser = argparse.ArgumentParser(description="Reset user test data")
    parser.add_argument("--user_id", type=int, help="Internal User ID")
    parser.add_argument("--external_id", type=str, help="External ID (e.g. tg_...)")
    args = parser.parse_args()

    if not args.user_id and not args.external_id:
        parser.print_help()
        sys.exit(1)

    db = SessionLocal()
    try:
        reset_user(db, user_id=args.user_id, external_id=args.external_id)
    except Exception as e:
        print(f"❌ Error during reset: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    main()
