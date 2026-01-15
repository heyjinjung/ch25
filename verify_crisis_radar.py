
import sys
import os
import requests
import json
from pprint import pprint

# Adjust path if needed
sys.path.append(os.getcwd())

# Configuration
API_URL = "http://localhost:8000"
ADMIN_EMAIL = "admin@example.com" # Replace with valid admin credentials if needed
ADMIN_PASSWORD = "admin" # Replace with valid admin password

def login_admin():
    """Login and get access token."""
    # Updated login endpoint
    url = f"{API_URL}/api/auth/token"
    # Using 'admin' credentials as per seed script
    payload = {
        "external_id": "admin",
        "password": "admin1234"
    }
    headers = {
        "Content-Type": "application/json"
    }
    try:
        response = requests.post(url, json=payload, headers=headers)
        response.raise_for_status()
        return response.json()["access_token"]
    except Exception as e:
        print(f"Login failed: {e}")
        if 'response' in locals() and response.text:
            print(f"Response: {response.text}")
        return None

def test_scenario_segment(token, scenario_id):
    """Test fetching users for a specific scenario."""
    url = f"{API_URL}/admin/api/crm/segment-detail"
    headers = {
        "Authorization": f"Bearer {token}"
    }
    params = {
        "segment_type": scenario_id,
        "limit": 5
    }
    
    print(f"\n--- Testing Scenario: {scenario_id} ---")
    try:
        response = requests.get(url, headers=headers, params=params)
        response.raise_for_status()
        data = response.json()
        print(f"Status Code: {response.status_code}")
        print(f"User Count: {len(data)}")
        if len(data) > 0:
            print("First User Sample:")
            pprint(data[0])
        else:
            print("No users found in this scenario (might be expected if DB is empty).")
        return True
    except Exception as e:
        print(f"Request failed: {e}")
        if hasattr(e, 'response') and e.response:
            print(f"Response: {e.response.text}")
        return False

def main():
    print("Starting Crisis Radar Verification...")
    
    # 1. Login
    token = login_admin()
    if not token:
        print("Aborting: Could not login.")
        return

    # 2. Test Scenarios
    # "SCENARIO_01" (Unlucky Newbie) is a good candidate
    test_scenario_segment(token, "SCENARIO_01")
    
    # "SCENARIO_04" (Sleeping Vault)
    test_scenario_segment(token, "SCENARIO_04")
    
    # "SCENARIO_11" (External VIP)
    test_scenario_segment(token, "SCENARIO_11")

if __name__ == "__main__":
    main()
