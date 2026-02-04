import json
import os
import sys
import urllib.request
import urllib.error

BASE_URL = os.getenv("BASE_URL", "http://localhost:8000").rstrip("/")
CC_ID = os.getenv("TARGET_CC_ID")
DELTA_XP = int(os.getenv("DELTA_XP", "10"))
REASON = os.getenv("REASON", "ADMIN_ADJUST_VERIFY")
ADMIN_TOKEN = os.getenv("ADMIN_TOKEN")
ADMIN_USER_ID = os.getenv("ADMIN_USER_ID")
ADMIN_CC_ID = os.getenv("ADMIN_CC_ID")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD")


def _request(method: str, path: str, token: str | None = None, payload: dict | None = None):
    url = f"{BASE_URL}{path}"
    data = None
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    if payload is not None:
        data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as resp:
            body = resp.read().decode("utf-8")
            return resp.status, body
    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8") if exc.fp else ""
        return exc.code, body


def _issue_token() -> str | None:
    if ADMIN_TOKEN:
        return ADMIN_TOKEN

    payload: dict = {}
    if ADMIN_USER_ID:
        payload["user_id"] = int(ADMIN_USER_ID)
    if ADMIN_CC_ID:
        payload["cc_id"] = ADMIN_CC_ID
    if ADMIN_PASSWORD:
        payload["password"] = ADMIN_PASSWORD

    if not payload:
        return None

    status, body = _request("POST", "/api/v2/auth/token", payload=payload)
    if status != 200:
        print("TOKEN_FAIL", status, body)
        return None
    data = json.loads(body)
    return data.get("access_token")


def main():
    if not CC_ID:
        print("TARGET_CC_ID env is required.")
        sys.exit(1)

    token = _issue_token()
    if not token:
        print("ADMIN_TOKEN or ADMIN_USER_ID/ADMIN_CC_ID(+ADMIN_PASSWORD) is required.")
        sys.exit(1)

    # 1) current snapshot
    status, body = _request("GET", f"/api/v2/admin/users/level?cc_id={CC_ID}", token=token)
    print("GET_LEVEL", status, body)
    if status != 200:
        sys.exit(2)

    # 2) adjust
    payload = {"ccId": CC_ID, "deltaXp": DELTA_XP, "reason": REASON}
    status, body = _request("POST", "/api/v2/admin/users/level/adjust", token=token, payload=payload)
    print("ADJUST", status, body)
    if status != 200:
        sys.exit(3)

    # 3) re-fetch
    status, body = _request("GET", f"/api/v2/admin/users/level?cc_id={CC_ID}", token=token)
    print("GET_LEVEL_AFTER", status, body)
    if status != 200:
        sys.exit(4)


if __name__ == "__main__":
    main()
