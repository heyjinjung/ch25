import json
import urllib.request
import urllib.error

BASE_URL = "http://127.0.0.1:8000"  # Adjust if your backend is on a different port

def test_telegram_auth_failure():
    print("\n[Scenario 1] Testing Telegram Auth...")
    url = f"{BASE_URL}/api/telegram/auth"
    print(f"Checking URL: {url}")
    payload = json.dumps({"init_data": "", "start_param": ""}).encode("utf-8")
    req = urllib.request.Request(url, data=payload, headers={"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req) as response:
            print(f"  Result: Status {response.status}")
            if response.status == 200:
                print(f"  ✅ SUCCESS")
    except urllib.error.HTTPError as e:
        if e.code == 404:
            print(f"  ❌ Result: Status 404 Not Found. Backend may need restart.")
        else:
            body = json.loads(e.read().decode())
            print(f"  Result: Status {e.code}, Detail: {body.get('detail')}")
            if e.code == 400 or e.code == 422:
                print(f"  ✅ REACHABLE (Rejected invalid data as expected)")
    except Exception as e:
        print(f"  ❌ Connection Error: {e}")

def test_admin_login_compatibility():
    print("\n[Scenario 2] Testing Admin Login (Legacy ID/PW compatibility)...")
    url = f"{BASE_URL}/api/auth/token"
    payload = json.dumps({"external_id": "admin", "password": "admin1234"}).encode("utf-8")
    req = urllib.request.Request(url, data=payload, headers={"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req) as response:
            if response.status == 200:
                data = json.loads(response.read().decode())
                print(f"✅ Admin login successful! Nickname: {data['user']['nickname']}")
                print(f"✅ Access Token received: {data['access_token'][:15]}...")
            else:
                print(f"❌ Admin login failed: {response.status}")
    except urllib.error.HTTPError as e:
        print(f"❌ Admin login failed: {e.code} - {e.read().decode()}")
    except Exception as e:
        print(f"❌ Connection Error: {e}")

def main():
    print("=== Telegram-Only V3 Verification Suite ===")
    print(f"Target Backend: {BASE_URL}")
    
    test_telegram_auth_failure()
    test_admin_login_compatibility()
    
    print("\nNote: Valid Telegram Auth (initData) requires a real hash from Telegram.")
    print("Verification of user creation can be done manually within the Admin UI.")

if __name__ == "__main__":
    main()
