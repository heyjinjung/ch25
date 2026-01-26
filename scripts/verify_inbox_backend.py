
import sys
import os
import requests
import json
from datetime import datetime

# Configuration
BASE_URL = "http://localhost:8000"
# WARNING: In a real environment, getting a valid token programmatically requires a login flow.
# For local dev verification, we might need a workaround or assume a hardcoded token if available.
# Since I cannot easily login via script without credentials, I will assume a Dev Token or skip if not possible.
# Alternatively, I can test the endpoints if auth is disabled or mocked, but V2 usually has auth.
# I will try to use the 'login' endpoint if standard, or just print instructions if token is missing.

# Assuming a test user exists. 
TEST_USER_ID = 15 # Commonly used in troubleshooting logs
# For this script to work, we need an access token.
# I will try to login as a dev user if possible, otherwise I will mock the headers or ask user to provide token.
# Let's try to assume we can hit public endpoints or use a known dev token mechanism if it exists in the user's workflow.
# Since I don't have the token, I will make this script Interactive or just check Health for now.

# Better approach: Check if I can import the app and use the test client directly (Integration Test style).
# But that requires setting up the python path correctly.
# Let's try checking specific endpoints that might be open or checking 401 response to at least confirm routing exists.

def check_endpoint(method, url, tag):
    try:
        if method == 'GET':
            response = requests.get(url, timeout=2)
        elif method == 'POST':
            response = requests.post(url, timeout=2)
        elif method == 'PATCH':
            response = requests.patch(url, timeout=2)
        else:
            print(f"[{tag}] Unsupported method: {method}")
            return False
        
        print(f"[{tag}] {method} {url} -> Status: {response.status_code}")
        
        if response.status_code == 404:
            print(f"❌ [{tag}] Endpoint not found!")
            return False
        if response.status_code >= 500:
            print(f"❌ [{tag}] Server Error!")
            return False
        if response.status_code == 401 or response.status_code == 403:
             print(f"⚠️ [{tag}] Auth Required (as expected for protected routes). Route exists.")
             return True
        return True
    except Exception as e:
        print(f"❌ [{tag}] Connection Failed: {e}")
        return False

def main():
    print("=== V2 Inbox Backend Verification API Check (Lightweight) ===")
    
    # 1. Health Check (Generic)
    check_endpoint('GET', f"{BASE_URL}/health", "Health")
    
    # 2. Inbox List Route Check
    # Even if 401, it confirms the server is listening and routing.
    check_endpoint('GET', f"{BASE_URL}/api/v2/inbox", "Inbox List")
    
    # 3. Inbox Read Route Check
    check_endpoint('PATCH', f"{BASE_URL}/api/v2/inbox/read", "Inbox Mark Read")

    print("\n[Note] Full functional verification requires a valid Bearer Token.")
    print("To verify fully, please use the Swagger UI at http://localhost:8000/docs or the Frontend UI.")

if __name__ == "__main__":
    main()
