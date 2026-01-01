import subprocess
import time

def verify_on_server():
    # Python script to run INSIDE the container
    inner_script = """
import sys
from app.db.session import SessionLocal
from app.services.team_battle_service import TeamBattleService
from datetime import datetime

db = SessionLocal()
svc = TeamBattleService()

try:
    print("--- SERVER: Creating Dummy Season ---")
    season = svc.create_season(db, {
        "name": "ServerTest_999",
        "starts_at": datetime.now(),
        "ends_at": datetime.now(),
        "is_active": False
    })
    print(f"Created Season ID: {season.id}")
    
    print("--- SERVER: Updating Season ---")
    svc.update_season(db, season.id, {"name": "ServerTest_Updated_999"})
    print("Update Success")
    
    print("--- SERVER: Deleting Season ---")
    svc.delete_season(db, season.id)
    print("Delete Success")
    
except Exception as e:
    print(f"FAIL: {e}")
    sys.exit(1)
finally:
    db.close()
"""
    
    # We pipe this script into docker exec python
    cmd = [
        "ssh", "-o", "StrictHostKeyChecking=no", "root@149.28.135.147",
        f"docker exec -i xmas-backend python -c '{inner_script}'"
    ]
    
    print("Transmitting verification script to server...")
    res = subprocess.run(cmd, capture_output=True, text=True)
    print("STDOUT:", res.stdout)
    print("STDERR:", res.stderr)

if __name__ == "__main__":
    verify_on_server()
