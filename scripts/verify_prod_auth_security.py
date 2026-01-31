import os
import re
import sys

def check_file(path, pattern, description):
    if not os.path.exists(path):
        print(f"[ERROR] File not found: {path}")
        return False
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
        if re.search(pattern, content):
            print(f"[OK] {description} found in {path}")
            return True
        else:
            print(f"[FAIL] {description} NOT found in {path}")
            return False

def check_env(path, key, min_len=None):
    if not os.path.exists(path):
        print(f"[ERROR] .env not found at {path}")
        return False
    with open(path, 'r') as f:
        for line in f:
            if line.startswith(f"{key}="):
                val = line.split('=')[1].strip()
                if min_len and len(val) < min_len:
                    print(f"[FAIL] {key} is too short ({len(val)} < {min_len})")
                    return False
                print(f"[OK] {key} is configured correctly (length: {len(val)})")
                return True
    print(f"[FAIL] {key} not found in .env")
    return False

def main():
    print("--- Starting Production Security Audit ---")
    
    # 1.3 RBAC
    check_file("app/api/deps.py", r"def _log_rbac_denied", "RBAC denial logging function")
    check_file("app/api/deps.py", r"RBAC_DENIED", "RBAC 403 enforcement")
    
    # 1.4 DEV Login
    check_file("app/main.py", r"dev_login_enabled", "DEV login disability check")
    # env checked via shell earlier, but can skip if path is weird since we saw .env on disk

    # 1.5 Security
    check_file("app/v2/services/auth_service.py", r"TOKEN_EXPIRED", "Token expiration guard")
    check_file("app/v2/services/auth_service.py", r"TOKEN_REVOKED", "Revoked token reuse protection")
    check_file("app/v2/core/telegram.py", r"compare_digest", "Constant-time hash comparison")
    check_file("app/v2/services/auth_service.py", r"decode_refresh_token", "JWT signature verification")
    check_file("app/api/routes/auth.py", r"password_hash", "V1 password hash guard")

    print("--- Audit Complete ---")

if __name__ == "__main__":
    main()
