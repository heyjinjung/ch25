import requests
import json

BASE_URL = "http://localhost:8000/api/telegram" # Adjust if running on a different port or server

def test_telegram_linking():
    print("--- Starting Telegram Linking Verification ---")
    
    # 1. Setup: Create or get a test user
    # We'll assume a user with nickname 'testuser' and password 'password123' exists or we can use admin to find one.
    # For this script, we'll try to use the manual-link first with a known user.
    
    test_nickname = "heyjinjung" # Use an existing user from the DB or create one
    test_password = "password123"
    
    mock_init_data = "user=%7B%22id%22%3A12345678%2C%22first_name%22%3A%22Test%22%2C%22last_name%22%3A%22User%22%2C%22username%22%3A%22testuser_tg%22%2C%22language_code%22%3A%22en%22%7D&auth_date=1735600000&hash=mockhash"
    # Note: validation will fail because token is not real, so we might need to mock the validation in telegram.py for testing 
    # OR we can just check if the endpoint exists and returns 400 for bad init_data vs 401 for bad login.
    
    print("\n1. Testing Manual Link (Invalid Credentials)...")
    try:
        resp = requests.post(f"{BASE_URL}/manual-link", json={
            "init_data": mock_init_data,
            "external_id": "nonexistent",
            "password": "wrong"
        })
        print(f"Status: {resp.status_code}, Detail: {resp.json().get('detail')}")
    except Exception as e:
        print(f"Error: {e}")

    print("\n2. Testing Admin Bridge Token (User #1)...")
    try:
        # Assuming we have an admin session or just hit the public (for now) endpoint if security is same as other admin routes
        resp = requests.get(f"{BASE_URL}/admin/bridge-token/1")
        print(f"Status: {resp.status_code}")
        if resp.status_code == 200:
            print(f"Token: {resp.json().get('bridge_token')}")
    except Exception as e:
        print(f"Error: {e}")

    print("\n3. Testing Normal Bridge Token (Current User)...")
    # This requires a login token, let's skip for simple verification or mock it.
    print("Skipping as it requires auth header.")

if __name__ == "__main__":
    test_telegram_linking()
