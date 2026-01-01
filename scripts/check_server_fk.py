import subprocess
import shlex

def check_fk():
    # Helper to check CREATE TABLE on server
    tables = ["team_score", "team_event_log", "team_member"]
    
    for table in tables:
        print(f"--- Checking {table} ---")
        cmd = [
            "ssh", "-o", "StrictHostKeyChecking=no", "root@149.28.135.147",
            f"docker exec xmas-db mysql -u root -p2026 -D xmas_event -e 'SHOW CREATE TABLE {table}\\G'"
        ]
        
        try:
            # We use shell=False locally, so no weird quoting needed for wrapper
            res = subprocess.run(cmd, capture_output=True, text=True)
            if res.returncode != 0:
                print(f"Error: {res.stderr}")
            else:
                print(res.stdout)
                # Check for CASCADE in output
                if "ON DELETE CASCADE" in res.stdout:
                    print(f"[OK] {table} has CASCADE")
                    # Count occurrences
                    count = res.stdout.count("ON DELETE CASCADE")
                    print(f"     Found {count} CASCADE clauses.")
                else:
                    print(f"[FAIL] {table} MISSING CASCADE")
        except Exception as e:
            print(f"Failed to run SSH: {e}")

if __name__ == "__main__":
    check_fk()
