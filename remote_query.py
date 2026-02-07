import subprocess

def run_query(query):
    # Use full path for docker to avoid PATH issues in non-interactive shell
    cmd = f"/usr/bin/docker exec xmas-db mysql -uroot -p2026 xmas_event -N -e \"{query}\""
    try:
        # Capture stderr as well to debug
        result = subprocess.check_output(cmd, shell=True, stderr=subprocess.STDOUT).decode().strip()
        return result
    except subprocess.CalledProcessError as e:
        return f"Error: {e.output.decode().strip()}"
    except Exception as e:
        return f"Error: {str(e)}"

# Feb 6th Full Day
q_created = "SELECT COUNT(id) FROM v2_user WHERE created_at >= '2026-02-06 00:00:00' AND created_at < '2026-02-07 00:00:00'"
q_deposit = "SELECT COUNT(id) FROM v2_user WHERE first_deposit_at >= '2026-02-06 00:00:00' AND first_deposit_at < '2026-02-07 00:00:00'"
q_joins = "SELECT COUNT(cc_id) FROM hq_prospective_user WHERE linked_at >= '2026-02-06 00:00:00' AND linked_at < '2026-02-07 00:00:00'"

print(f"Created: {run_query(q_created)}")
print(f"Deposit: {run_query(q_deposit)}")
print(f"Joins: {run_query(q_joins)}")
