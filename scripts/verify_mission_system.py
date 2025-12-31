import urllib.request
import urllib.error
import json
import time

BASE_URL = "http://127.0.0.1:8000"

def get_token():
    print("Logging in as admin...")
    url = f"{BASE_URL}/api/auth/token"
    payload = json.dumps({"external_id": "admin", "password": "admin1234"}).encode("utf-8")
    req = urllib.request.Request(url, data=payload, method="POST")
    req.add_header("Content-Type", "application/json")
    try:
        with urllib.request.urlopen(req) as response:
            res = json.loads(response.read().decode())
            return res["access_token"]
    except Exception as e:
        print(f"Login failed: {e}")
        return None

def test_mission_list(token):
    print("\n[M-1] Testing Mission List...")
    url = f"{BASE_URL}/api/mission/"
    req = urllib.request.Request(url)
    req.add_header("Authorization", f"Bearer {token}")
    try:
        with urllib.request.urlopen(req) as response:
            res = json.loads(response.read().decode())
            print(f"  ✅ SUCCESS: Found {len(res)} missions")
            for m in res:
                print(f"    - {m['mission']['title']} ({m['mission']['logic_key']}): {m['progress']['current_value']}/{m['mission']['target_value']}")
    except Exception as e:
        print(f"  ❌ FAILED: {e}")

def test_daily_gift(token):
    print("\n[M-2] Testing Daily Gift...")
    url = f"{BASE_URL}/api/mission/daily-gift"
    req = urllib.request.Request(url, data=b"", method="POST")
    req.add_header("Authorization", f"Bearer {token}")
    try:
        with urllib.request.urlopen(req) as response:
            res = json.loads(response.read().decode())
            print(f"  ✅ SUCCESS: Claimed Daily Gift! {res['reward_type']} {res['amount']}")
    except urllib.error.HTTPError as e:
        if e.code == 400:
            print(f"  ℹ️ INFO: Already claimed or logic rejected (Expected if already run today)")
        else:
            print(f"  ❌ FAILED: {e.code} {e.read().decode()}")
    except Exception as e:
        print(f"  ❌ FAILED: {e}")

def get_missions(token):
    url = f"{BASE_URL}/api/mission/"
    req = urllib.request.Request(url)
    req.add_header("Authorization", f"Bearer {token}")
    try:
        with urllib.request.urlopen(req) as response:
            return json.loads(response.read().decode())
    except:
        return []

def test_dice_trigger(token):
    print("\n[M-3] Testing Dice Trigger (One Action -> Multiple Missions)...")
    
    # 1. Get initial progress
    missions_before = get_missions(token)
    if not missions_before:
        print("  ⚠️ Skipping trigger test (no missions found)")
        return

    def find_prog(ms, key):
        for m in ms:
            if m["mission"]["logic_key"] == key:
                return m["progress"]["current_value"]
        return 0

    initial_5 = find_prog(missions_before, "play_any_game_5")
    initial_10 = find_prog(missions_before, "play_any_game_10")
    initial_500 = find_prog(missions_before, "play_any_game_500")

    print(f"  Before: Play5={initial_5}, Play10={initial_10}, Weekly500={initial_500}")

    # 2. Play Dice (Action: PLAY_GAME)
    url = f"{BASE_URL}/api/dice/play"
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    data = json.dumps({"bet_amount": 100}).encode("utf-8")
    req = urllib.request.Request(url, data=data, headers=headers, method="POST")
    try:
        with urllib.request.urlopen(req) as response:
            if response.status == 200:
                print("  ✅ Dice Play Successful")
            else:
                print(f"  ❌ Dice Play Failed: {response.status}")
                return
    except Exception as e:
        print(f"  ❌ Dice Play Error: {e}")
        # Try to read error body
        try:
            print(f"  Error details: {e.read().decode()}")
        except:
            pass
        return

    # 3. Verify Progress
    missions_after = get_missions(token)
    final_5 = find_prog(missions_after, "play_any_game_5")
    final_10 = find_prog(missions_after, "play_any_game_10")
    final_500 = find_prog(missions_after, "play_any_game_500")
    
    print(f"  After:  Play5={final_5}, Play10={final_10}, Weekly500={final_500}")

    if final_5 == initial_5 + 1 and final_10 == initial_10 + 1:
        print("  ✅ SUCCESS: All 'PLAY_GAME' missions incremented correctly!")
    else:
        print("  ❌ FAILURE: Counts did not increment as expected.")

if __name__ == "__main__":
    token = get_token()
    if token:
        test_mission_list(token)
        test_daily_gift(token)
        test_dice_trigger(token)
