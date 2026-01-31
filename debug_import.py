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
    pass

try:
    print("Attempting to import app.v2.models.v2_dice...")
    import app.v2.models.v2_dice
    print("Import v2_dice successful!")
except Exception:
    traceback.print_exc()

try:
    print("Attempting to import app.v2.models.v2_roulette...")
    import app.v2.models.v2_roulette
    print("Import v2_roulette successful!")
except Exception:
    traceback.print_exc()

