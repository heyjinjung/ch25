
import sys
import os

# Add project root to path to import app modules if possible, 
# but for safety and speed, we will use raw SQL via a simple connector or existing app db session.
# Assuming standard app structure, let's try to load the db session.

# Since loading the full app might fail due to missing env vars, 
# I will try to connect using sqlalchemy if the config is simple, or just use a mock approach if I can't access DB.
# ...Wait, I am in the user's environment. I should try to use the project's own db utilities.

sys.path.append(os.getcwd())

# Manually load key env vars for script (since dotenv might not be autoloaded)
os.environ["DATABASE_URL"] = "mysql+pymysql://xmasuser:2026@localhost:3307/xmas_event"

try:
    from app.db.session import SessionLocal, engine
    from sqlalchemy import text
    
    def check_db():
        print(f"=== Checking V2 Inbox Database Tables ===")
        # print(f"DB URL: {settings.SQLALCHEMY_DATABASE_URI}")
        db = SessionLocal()
        try:
            # 0. Check User Count
            user_count = db.execute(text("SELECT count(*) FROM v2_user")).scalar()
            print(f"[0] User Count in DB: {user_count}")

            # 1. Check latest Admin Message
            print("\n[1] Latest Admin Messages (v2_admin_message):")
            result = db.execute(text("SELECT id, title, target_type, recipient_count, created_at FROM v2_admin_message ORDER BY id DESC LIMIT 3"))
            messages = result.fetchall()
            if not messages:
                print("   (No messages found)")
            for msg in messages:
                print(f"   - ID: {msg.id}, Title: '{msg.title}', Target: {msg.target_type}, Recipients: {msg.recipient_count}, Created: {msg.created_at}")

            # 2. Check Inbox for a specific user (or top users)
            # We suspect User 15 is the test user based on previous logs.
            print("\n[2] Latest Inbox Entries (v2_admin_message_inbox):")
            result = db.execute(text("""
                SELECT i.id, i.user_id, i.message_id, i.is_read, i.created_at, m.title 
                FROM v2_admin_message_inbox i
                JOIN v2_admin_message m ON i.message_id = m.id
                ORDER BY i.id DESC LIMIT 5
            """))
            inbox_items = result.fetchall()
            if not inbox_items:
                print("   (No inbox items found)")
            for item in inbox_items:
                print(f"   - InboxID: {item.id}, UserID: {item.user_id}, MsgID: {item.message_id}, Read: {item.is_read}, Title: '{item.title}'")

        except Exception as e:
            print(f"❌ Database Error: {e}")
        finally:
            db.close()

    if __name__ == "__main__":
        check_db()

except ImportError as e:
    print(f"❌ Could not import app modules. Please ensure you are running from the project root and dependencies are installed. Error: {e}")
    # Fallback or manual instruction? 
    # Attempt to locate database.py path
    print(f"Current CWD: {os.getcwd()}")
