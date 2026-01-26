
import os
import sys
from sqlalchemy import create_engine, text

DB_URL = "mysql+pymysql://xmasuser:2026@localhost:3307"

def check_data_location():
    print(f"Connecting to: {DB_URL}")
    try:
        engine = create_engine(DB_URL)
        with engine.connect() as conn:
            # Check 'v2' DB
            print("\n=== [Database: v2] ===")
            try:
                conn.execute(text("USE v2"))
                user_count = conn.execute(text("SELECT count(*) FROM v2_user")).scalar()
                msg_count = conn.execute(text("SELECT count(*) FROM v2_admin_message")).scalar()
                inbox_count = conn.execute(text("SELECT count(*) FROM v2_admin_message_inbox")).scalar()
                print(f" - v2_user count: {user_count}")
                print(f" - v2_admin_message count: {msg_count}")
                print(f" - v2_admin_message_inbox count: {inbox_count}")
            except Exception as e:
                print(f"Error checking v2: {e}")

            # Check 'xmas_event' DB
            print("\n=== [Database: xmas_event] ===")
            try:
                conn.execute(text("USE xmas_event"))
                user_count = conn.execute(text("SELECT count(*) FROM v2_user")).scalar()
                msg_count = conn.execute(text("SELECT count(*) FROM v2_admin_message")).scalar()
                inbox_count = conn.execute(text("SELECT count(*) FROM v2_admin_message_inbox")).scalar()
                print(f" - v2_user count: {user_count}")
                print(f" - v2_admin_message count: {msg_count}")
                print(f" - v2_admin_message_inbox count: {inbox_count}")
            except Exception as e:
                print(f"Error checking xmas_event: {e}")

    except Exception as e:
        print(f"Connection failed: {e}")

if __name__ == "__main__":
    check_data_location()
