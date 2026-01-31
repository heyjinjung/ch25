from sqlalchemy import text
from app.db.session import SessionLocal

def check_columns():
    db = SessionLocal()
    print("--- 1. Verification of Issue 13/14 (Missing Columns) ---")
    tables_to_check = ["v2_dice_config", "v2_lottery_config"]
    for table in tables_to_check:
        print(f"\n[Table: {table}]")
        r = db.execute(text(f"SHOW COLUMNS FROM `{table}`")).fetchall()
        for col in r:
            print(f" - {col[0]}")

def check_fks():
    db = SessionLocal()
    print("\n--- 2. Verification of Issue 20 (V2User FK Mapping) ---")
    target_tables = [
        "trial_token_bucket", "user_level_progress", "user_xp_event_log",
        "user_streak", "user_segment", "user_retention_state",
        "user_level_reward_log", "user_cash_ledger", "vault_ledger",
        "vault_status", "vault_earn_event", "vault_withdrawal_request",
        "v2_retention_roi_log", "v2_user_retention_state", "retention_roi_log"
    ]
    
    query = text("""
        SELECT TABLE_NAME, CONSTRAINT_NAME, REFERENCED_TABLE_NAME 
        FROM information_schema.KEY_COLUMN_USAGE 
        WHERE TABLE_SCHEMA=DATABASE() 
        AND TABLE_NAME IN :tables
        AND REFERENCED_TABLE_NAME IS NOT NULL
    """)
    
    r = db.execute(query, {"tables": tuple(target_tables)}).fetchall()
    for row in r:
        status = "✅" if row[2] == "v2_user" else "❌"
        print(f"[{status}] {row[0]}: {row[1]} -> {row[2]}")

if __name__ == "__main__":
    try:
        check_columns()
        check_fks()
    finally:
        SessionLocal().close()
