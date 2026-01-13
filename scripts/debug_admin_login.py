
import sys
import os
import requests

# Add the project root to sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.db.session import SessionLocal
from app.models.user import User
from app.core.security import hash_password, verify_password

def debug_admin_login():
    db = SessionLocal()
    try:
        username = "admin"
        password = "2wP?+!Etm8#Qv4Mn"
        
        print("\n--- 1. DATABASE CHECK ---")
        user = db.query(User).filter(User.external_id == username).first()
        if not user:
            print("ERROR: User 'admin' not found in database!")
            return
            
        print(f"User found: ID={user.id}, Status={user.status}")
        print(f"Stored Hash: {user.password_hash}")
        
        calculated_hash = hash_password(password)
        print(f"Calculated Hash of input: {calculated_hash}")
        
        matches = verify_password(password, user.password_hash)
        print(f"Password Verify Result: {matches}")
        
        if not matches:
            print("CRITICAL: Password verification failed locally in Python!")
        
        print("\n--- 2. API CHECK (Localhost) ---")
        # Try to call the container API
        try:
            url = "http://localhost:8000/api/auth/token"
            payload = {
                "external_id": username,
                "password": password
            }
            print(f"Sending POST to {url} with payload {payload}")
            resp = requests.post(url, json=payload)
            print(f"Response Status: {resp.status_code}")
            print(f"Response Body: {resp.text}")
        except Exception as e:
            print(f"Could not connect to API: {e}")

    except Exception as e:
        print(f"General Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    debug_admin_login()
