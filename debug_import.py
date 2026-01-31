import sys
import os
import traceback

# Add project root to path
sys.path.append(os.getcwd())

try:
    print("Attempting to import app.v2.api.admin...")
    import app.v2.api.admin
    print("Import successful!")
except Exception:
    traceback.print_exc()
