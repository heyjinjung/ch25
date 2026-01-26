
import os
import sys
from sqlalchemy import create_engine, text

# Pointing to the "Real" DB with data
DB_URL = "mysql+pymysql://xmasuser:2026@localhost:3307/xmas_event"

def check_v2_status():
    print(f"Connecting to: {DB_URL}")
    try:
        engine = create_engine(DB_URL)
        with engine.connect() as conn:
            print("\n=== V2 Feature Status Check (Row Counts) ===")
            
            tables_to_check = [
                "v2_user",
                "v2_user_segment",
                "v2_admin_message",
                "v2_admin_message_inbox",
                # Games
                "v2_roulette_config",
                "v2_lottery_config",
                "v2_dice_config",
                # Economy
                "v2_shop_order",
                "v2_ticket_conversion_policy",
                "v2_level_reward_table"
            ]

            for table in tables_to_check:
                try:
                    count = conn.execute(text(f"SELECT count(*) FROM {table}")).scalar()
                    status = "✅ Active" if count > 0 else "⚠️ Empty"
                    print(f" - {table}: {count} rows ({status})")
                except Exception as e:
                    print(f" - {table}: ❌ Missing or Error ({e})")

    except Exception as e:
        print(f"Connection failed: {e}")

if __name__ == "__main__":
    check_v2_status()
