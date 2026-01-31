import os
import re

def check_file(path, pattern, description):
    if not os.path.exists(path):
        print(f"[ERROR] File not found: {path}")
        return False
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
        if re.search(pattern, content):
            print(f"[OK] {description} confirmed in {path}")
            return True
        else:
            print(f"[FAIL] {description} NOT found in {path}")
            return False

def main():
    print("--- Starting Production V2 User & Profile Audit ---")
    
    # 2.1 V2User Model
    check_file("app/v2/models/user.py", r"class V2User", "V2User model definition")
    check_file("app/v2/models/user.py", r"telegram_id.*unique=True", "Telegram ID unique constraint")
    check_file("app/v2/models/user.py", r"cc_id.*unique=True", "CC ID unique constraint")
    check_file("app/v2/models/user.py", r"vault_locked_balance", "Vault locked balance (SoT)")
    
    # 2.2 User Service & Migration
    check_file("app/v2/services/user_service.py", r"def get_or_create_v2_user_from_legacy", "Legacy migration logic")
    check_file("app/v2/services/admin_user_service.py", r"def purge_user", "User purge functionality")
    
    # LEVEL XP & Mission Issues (Investigative)
    print("\n--- Investigative: Level XP & Missions ---")
    check_file("app/v2/services/user_service.py", r"add_xp", "XP addition logic exists")
    check_file("app/api/deps.py", r"get_db", "DB session management") # To check if sync issues might occur

    print("--- Audit Complete ---")

if __name__ == "__main__":
    main()
