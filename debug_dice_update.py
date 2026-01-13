import sys
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Add project root to path
sys.path.append("c:\\Users\\JAVIS\\ch\\ch25")

from app.db.session import SessionLocal
from app.services.admin_dice_service import AdminDiceService
from app.schemas.admin_dice import AdminDiceConfigUpdate
from app.models.dice import DiceConfig

def test_update():
    db = SessionLocal()
    try:
        # 1. Get existing config
        config_id = 1
        config = db.get(DiceConfig, config_id)
        if not config:
            print(f"Config {config_id} not found")
            return

        print(f"Before: win_reward_amount={config.win_reward_amount}")

        # 2. Update
        update_payload = AdminDiceConfigUpdate(win_reward_value=888)
        print(f"Payload dict: {update_payload.dict(exclude_unset=True)}")

        updated_config = AdminDiceService.update_config(db, config_id, update_payload)
        
        print(f"After (in memory): win_reward_amount={updated_config.win_reward_amount}")

        # 3. Verify persistence
        db.expire_all()
        config_refetched = db.get(DiceConfig, config_id)
        print(f"After (refetched): win_reward_amount={config_refetched.win_reward_amount}")
        
    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    test_update()
