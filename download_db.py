
import subprocess

cmd = [
    "ssh",
    "-i", r"C:\Users\JAVIS\.ssh\id_ed25519_vultr",
    "-o", "StrictHostKeyChecking=no",
    "root@149.28.135.147",
    "docker exec xmas-db mysqldump -u xmasuser -p2026 xmas_event user admin_user_profile"
]

print("Starting download...")
with open("production_dump_py.sql", "wb") as f:
    process = subprocess.Popen(cmd, stdout=f, stderr=subprocess.PIPE)
    stderr = process.communicate()[1]
    
    if process.returncode != 0:
        print(f"Error: {stderr.decode()}")
    else:
        print("Download complete: production_dump_py.sql")
        # Print stderr anyway (warnings)
        if stderr:
            print(f"Stderr: {stderr.decode()}")
