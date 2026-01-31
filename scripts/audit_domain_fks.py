from sqlalchemy import text
from app.db.session import SessionLocal

def audit_fks():
    db = SessionLocal()
    domains = {
        "Vault": ["vault_ledger", "vault_status", "vault_earn_event", "vault_withdrawal_request"],
        "Games": ["v2_dice_log", "v2_roulette_log", "v2_lottery_log"],
        "Missions": ["user_mission_progress", "user_streak"],
        "Level/XP": ["user_level_progress", "user_xp_event_log", "user_level_reward_log"],
        "Inventory/Shop": ["user_game_wallet", "user_inventory_item", "v2_shop_order"],
        "Retention": ["user_retention_state", "v2_retention_roi_log", "v2_user_retention_state", "retention_roi_log", "user_segment"]
    }

    all_tables = [t for tables in domains.values() for t in tables]
    
    query = text("""
        SELECT TABLE_NAME, CONSTRAINT_NAME, REFERENCED_TABLE_NAME 
        FROM information_schema.KEY_COLUMN_USAGE 
        WHERE TABLE_SCHEMA=DATABASE() 
        AND TABLE_NAME IN :tables
        AND REFERENCED_TABLE_NAME IS NOT NULL
        AND COLUMN_NAME = 'user_id'
    """)
    
    rows = db.execute(query, {"tables": tuple(all_tables)}).fetchall()
    results = {}
    for row in rows:
        results.setdefault(row[0], []).append((row[1], row[2]))

    print("--- Detailed V2 Domain FK Audit ---")
    for domain, tables in domains.items():
        print(f"\n[{domain}]")
        for table in tables:
            found = results.get(table, [])
            if not found:
                print(f"  ? {table}: No user_id FK found (checks needed if using manual IDs)")
                continue
            for constraint, ref_table in found:
                status = "✅" if ref_table == "v2_user" else "❌"
                print(f"  {status} {table}: {constraint} -> {ref_table}")
    db.close()

if __name__ == "__main__":
    audit_fks()
