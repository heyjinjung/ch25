from sqlalchemy import text
from app.db.session import SessionLocal

def audit_expanded_fks():
    db = SessionLocal()
    expanded_tables = [
        "team_member", "team_event_log", "team_score",
        "v2_admin_message_inbox", "v2_user_auth_event",
        "user_level_reward_log", "user_xp_event_log"
    ]
    
    query = text("""
        SELECT TABLE_NAME, COLUMN_NAME, CONSTRAINT_NAME, REFERENCED_TABLE_NAME 
        FROM information_schema.KEY_COLUMN_USAGE 
        WHERE TABLE_SCHEMA=DATABASE() 
        AND TABLE_NAME IN :tables
        AND REFERENCED_TABLE_NAME IS NOT NULL
        AND COLUMN_NAME = 'user_id'
    """)
    
    rows = db.execute(query, {"tables": tuple(expanded_tables)}).fetchall()
    print("--- Exhaustive Expanded Domain FK Audit ---")
    for row in rows:
        status = "✅" if row[3] == "v2_user" else "❌"
        print(f"[{status}] {row[0]}.{row[1]} ({row[2]}) -> {row[3]}")
    
    # Check for missing FK placeholders
    found_tables = {row[0] for row in rows}
    for t in expanded_tables:
        if t not in found_tables:
            # Check if user_id column exists but no FK
            try:
                cols = db.execute(text(f"SHOW COLUMNS FROM `{t}`")).fetchall()
                if any(c[0] == 'user_id' for c in cols):
                    print(f"[⚠️] {t}: user_id exists but no FK constraint found.")
                else:
                    print(f"[INFO] {t}: No user_id column (broadcast/static table).")
            except:
                pass
    db.close()

if __name__ == "__main__":
    audit_expanded_fks()
