import os
import re
from sqlalchemy import text
from app.db.session import SessionLocal

def check_file_for_v2(path):
    if not os.path.exists(path):
        return f"[MISSING] {path}"
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
        v2_user_import = "from app.v2.models.user import V2User" in content
        deprecated_user_import = "from app.models.user import User" in content
        # Check if V2User is actually used in queries
        v2_user_usage = "V2User" in content
        return {
            "path": path,
            "v2_user_import": v2_user_import,
            "deprecated_user_import": deprecated_user_import,
            "v2_user_usage": v2_user_usage
        }

def audit_domain(domain_name, files, tables):
    print(f"\n--- Domain Audit: {domain_name} ---")
    
    print(" [Code Audit]")
    for f in files:
        res = check_file_for_v2(f)
        if isinstance(res, str):
            print(f"  {res}")
        else:
            status = "✅" if res["v2_user_import"] and not res["deprecated_user_import"] else "⚠️"
            print(f"  [{status}] {res['path']}")
            print(f"    - V2User Import: {res['v2_user_import']}")
            print(f"    - Legacy User Import: {res['deprecated_user_import']}")
            print(f"    - V2User Usage: {res['v2_user_usage']}")

    print("\n [Database FK Audit]")
    db = SessionLocal()
    query = text("""
        SELECT TABLE_NAME, COLUMN_NAME, CONSTRAINT_NAME, REFERENCED_TABLE_NAME 
        FROM information_schema.KEY_COLUMN_USAGE 
        WHERE TABLE_SCHEMA=DATABASE() 
        AND TABLE_NAME IN :tables
        AND REFERENCED_TABLE_NAME IS NOT NULL
        AND COLUMN_NAME = 'user_id'
    """)
    rows = db.execute(query, {"tables": tuple(tables)}).fetchall()
    for row in rows:
        status = "✅" if row[3] == "v2_user" else "❌"
        print(f"  [{status}] {row[0]}.{row[1]} ({row[2]}) -> {row[3]}")
    db.close()

def main():
    # 1. Vault
    audit_domain("Vault & Economy", 
        ["app/v2/services/vault_service.py", "app/v2/services/vault2_service.py"],
        ["vault_ledger", "vault_status", "vault_earn_event", "vault_withdrawal_request"])

    # 2. Missions
    audit_domain("Missions & Streak", 
        ["app/v2/services/mission_service.py"],
        ["user_mission_progress", "user_streak"])

    # 3. Games
    audit_domain("Games (Dice/Roulette/Lottery)", 
        ["app/v2/services/v2_dice_game_service.py", "app/v2/services/v2_roulette_game_service.py", "app/v2/services/v2_lottery_game_service.py"],
        ["v2_dice_log", "v2_roulette_log", "v2_lottery_log"])

    # 4. Level & XP
    audit_domain("Level & XP", 
        ["app/v2/services/level_xp_service.py"],
        ["user_level_progress", "user_xp_event_log", "user_level_reward_log"])

    # 5. Inventory
    audit_domain("Inventory & Shop", 
        ["app/v2/services/inventory_service.py"],
        ["user_game_wallet", "user_inventory_item"])

if __name__ == "__main__":
    main()
