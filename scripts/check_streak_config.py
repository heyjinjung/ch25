from app.db.session import SessionLocal
from app.services.ui_config_service import UiConfigService
import json

db = SessionLocal()
try:
    row = UiConfigService.get(db, "streak_reward_rules")
    if row:
        print("Config Found!")
        print(json.dumps(row.value_json, indent=2, ensure_ascii=False))
    else:
        print("Config NOT Found! (Using Hardcoded Defaults in Code)")
except Exception as e:
    print(f"Error: {e}")
finally:
    db.close()
