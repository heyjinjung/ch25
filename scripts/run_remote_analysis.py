import subprocess
import os

KEY_PATH = r"C:\Users\JAVIS\.ssh\id_ed25519_vultr"
REMOTE_HOST = "root@149.28.135.147"
LOCAL_SCRIPT = "scripts/analyze_retention_v2.py"
REMOTE_DIR_CMD = "find /root -maxdepth 2 -name ch25 -type d | head -n 1"

def run():
    print("🔍 Finding remote directory...")
    # 1. Find Remote Dir
    try:
        remote_dir = subprocess.check_output(
            ["ssh", "-i", KEY_PATH, "-o", "StrictHostKeyChecking=no", REMOTE_HOST, REMOTE_DIR_CMD]
        ).decode().strip()
    except subprocess.CalledProcessError as e:
        print("Failed to connect or find directory.")
        return

    if not remote_dir:
        print("Remote directory 'ch25' not found.")
        return

    print(f"✅ Found remote dir: {remote_dir}")

    # 2. SCP the script
    print("📤 Copying analysis script to remote host...")
    subprocess.check_call([
        "scp", "-i", KEY_PATH, "-o", "StrictHostKeyChecking=no", 
        LOCAL_SCRIPT, f"{REMOTE_HOST}:{remote_dir}/scripts/analyze_retention_remote.py"
    ])

    # 3. Run inside Docker
    print("🚀 Executing on remote backend...")
    docker_cmd = f"cd {remote_dir} && docker cp scripts/analyze_retention_remote.py xmas-backend:/app/scripts/analyze_retention_remote.py && docker compose exec -T backend python scripts/analyze_retention_remote.py"
    
    subprocess.call([
        "ssh", "-i", KEY_PATH, "-o", "StrictHostKeyChecking=no", REMOTE_HOST, docker_cmd
    ])

if __name__ == "__main__":
    run()
