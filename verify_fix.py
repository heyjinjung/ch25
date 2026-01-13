import sys
import os

# Ensure project root is in path
sys.path.append(os.getcwd())

from app.api.admin.routes.admin_crm import MessageCreate

try:
    # Simulate payload from frontend where target_value is missing
    payload = {
        "title": "Test Verify",
        "content": "Content Verify",
        "target_type": "ALL",
        "channels": ["telegram"]
    }
    
    print("Attempting to parse payload without target_value using ACTUAL MessageCreate model...")
    m = MessageCreate(**payload)
    print("Success! Model instantiated:", m)
    if m.target_value is None:
        print("Verification PASSED: target_value is None by default.")
    else:
        print("Verification FAILED: target_value is not None.")
        
except Exception as e:
    print("Verification FAILED with Error:", e)
