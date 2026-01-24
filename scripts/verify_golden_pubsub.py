"""verify_golden_pubsub.py

Usage:
  python scripts/verify_golden_pubsub.py --payload '{"user_id":123,"result":"LOSE"}'

What it does (A → B → C automated):
 - A) Publishes a test event to Redis channel `golden:v2:events:game`
 - B) Collects recent backend logs and filters for golden-related lines
 - C) Queries DB (MySQL) for `v2_golden_intervention_log` and `v2_retention_roi_log` rows
 - Writes a timestamped verification snippet to `docs/v2_specs/00_sot_meta/v2_verification_test_logs_AUTOGEN.md`

Notes:
 - Script runs Docker Compose commands, so must be run in repo root where docker-compose.yml exists.
 - Requires Python 3.8+ and access to `docker`/`docker compose` CLI.

Exit codes:
 - 0: success (script ran and outputs collected)
 - 2: publish failed (no subscriber) or publish command error
 - 3: backend logs collection failed
 - 4: DB query failed

"""

import argparse
import json
import subprocess
import sys
import datetime
from shlex import quote

OUT_DOC = "docs/v2_specs/00_sot_meta/v2_verification_test_logs_AUTOGEN.md"
CHANNEL = "golden:v2:events:game"


def run(cmd, capture=True, check=False):
    try:
        if capture:
            p = subprocess.run(cmd, shell=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, check=check)
            return p.returncode, p.stdout.strip(), p.stderr.strip()
        else:
            p = subprocess.run(cmd, shell=True)
            return p.returncode, None, None
    except Exception as e:
        return 1, "", str(e)


def publish_event(payload_str: str):
    # Use subprocess with stdin to avoid shell quoting issues on Windows/PowerShell.
    # We call `docker compose exec -T redis redis-cli -x PUBLISH {CHANNEL}` and pass payload on stdin.
    cmd = f"docker compose exec -T redis redis-cli -x PUBLISH {CHANNEL}"
    try:
        p = subprocess.run(cmd, shell=True, input=payload_str, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        return p.returncode, p.stdout.strip(), p.stderr.strip()
    except Exception as e:
        return 1, "", str(e)


def collect_backend_logs(lines=400):
    cmd = f'docker compose logs --no-color --tail {lines} backend'
    rc, out, err = run(cmd)
    return rc, out, err


def query_db(query: str):
    # Using known root password and DB name from compose env
    cmd = f'docker compose exec db mysql -uroot -p2026 -Dxmas_event -e "{query}"'
    rc, out, err = run(cmd)
    return rc, out, err


def append_result(payload, publish_out, logs_snippet, db_snippet):
    t = datetime.datetime.utcnow().isoformat() + "Z"
    header = f"## Golden Pub/Sub verification - {t}\n\n"
    body = []
    body.append(header)
    body.append("**Payload**:\n")
    body.append("```")
    body.append(json.dumps(payload, ensure_ascii=False))
    body.append("```")
    body.append("\n**Publish output**:\n")
    body.append("```")
    body.append(publish_out)
    body.append("```")
    body.append("\n**Backend logs (filtered snippet)**:\n")
    body.append("```")
    body.append(logs_snippet)
    body.append("```")
    body.append("\n**DB query results (intervention log / roi log)**:\n")
    body.append("```")
    body.append(db_snippet)
    body.append("```")
    body.append("\n---\n")

    content = "\n".join(body) + "\n"
    with open(OUT_DOC, "a", encoding="utf-8") as f:
        f.write(content)


def filter_golden_logs(logs: str):
    # Return only lines containing keywords to reduce size
    keywords = ["golden", "intervention", "publish", "Failed to publish", "V2Golden"]
    out_lines = []
    for line in logs.splitlines():
        low = line.lower()
        if any(k.lower() in low for k in keywords):
            out_lines.append(line)
    if not out_lines:
        # fallback: return last 200 chars
        return logs[-200:]
    return "\n".join(out_lines[-200:])


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--payload", required=False, default='{"user_id":123,"result":"LOSE"}', help='JSON string payload to publish')
    args = parser.parse_args()

    try:
        payload_obj = json.loads(args.payload)
    except Exception:
        print("Invalid JSON payload", file=sys.stderr)
        sys.exit(1)

    payload_str = json.dumps(payload_obj)

    print("Publishing event to Redis channel...")
    rc, out, err = publish_event(payload_str)
    if rc != 0:
        print("Publish failed:", err or out, file=sys.stderr)
        sys.exit(2)
    print("Publish command returned:", out)

    print("Waiting 1s for worker to process...")
    import time
    time.sleep(1)

    print("Collecting backend logs...")
    rc, logs_out, logs_err = collect_backend_logs()
    if rc != 0:
        print("Failed to collect backend logs:", logs_err or logs_out, file=sys.stderr)
        sys.exit(3)

    logs_snippet = filter_golden_logs(logs_out)
    print("Filtered logs snippet:\n", logs_snippet)

    print("Querying DB for intervention logs...")
    q1 = "SELECT id,user_id,trigger_id,action_taken,created_at FROM v2_golden_intervention_log ORDER BY id DESC LIMIT 10;"
    rc1, out1, err1 = query_db(q1)
    if rc1 != 0:
        out1 = f"DB query failed or table missing: {err1 or out1}"

    q2 = "SELECT id,user_id,event_type,reward_amount,created_at FROM v2_retention_roi_log ORDER BY created_at DESC LIMIT 10;"
    rc2, out2, err2 = query_db(q2)
    if rc2 != 0:
        out2 = f"DB query failed or table missing: {err2 or out2}"

    db_snippet = "-- v2_golden_intervention_log --\n" + (out1 or "(no output)") + "\n\n-- v2_retention_roi_log --\n" + (out2 or "(no output)")

    print("Appending result to", OUT_DOC)
    append_result(payload_obj, out or (err or ""), logs_snippet, db_snippet)

    print("Done. Summary:\nPublish result:\n", out)
    print("Logs snippet:\n", logs_snippet)
    print("DB snippet:\n", db_snippet)


if __name__ == '__main__':
    main()
