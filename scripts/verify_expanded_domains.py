import os
from sqlalchemy import text
from app.db.session import SessionLocal

def check_file(path):
    if not os.path.exists(path):
        return f"[MISSING] {path}"
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
        v2_user_import = "from app.v2.models.user import V2User" in content
        v2_user_usage = "V2User" in content
        return {
            "path": path,
            "v2_user_import": v2_user_import,
            "v2_user_usage": v2_user_usage
        }

def audit_expanded_domain(domain_name, files, tables):
    print(f"\n--- Expanded Domain Audit: {domain_name} ---")
    
    print(" [Code Audit]")
    for f in files:
        res = check_file(f)
        if isinstance(res, str):
            print(f"  {res}")
        else:
            status = "✅" if res["v2_user_import"] or res["v2_user_usage"] else "⚠️"
            print(f"  [{status}] {res['path']}")
            print(f"    - V2User Import: {res['v2_user_import']}")
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
    # 1. Team Battle
    audit_expanded_domain("Team Battle", 
        ["app/v2/services/team_battle_service.py", "app/v2/services/team_service.py"],
        ["team_member", "team_battle_event_log"])

    # 2. Admin & RBAC
    audit_expanded_domain("Admin & RBAC", 
        ["app/v2/services/admin_user_service.py", "app/v2/api/admin/user_routes.py", "app/api/deps.py"],
        ["v2_admin_message"])

    # 3. Advanced Vault & Levels
    audit_expanded_domain("Advanced Vault & Levels", 
        ["app/v2/services/vault2_service.py", "app/v2/services/level_xp_service.py"],
        ["vault_program", "user_level_reward_log"])

if __name__ == "__main__":
    main()
