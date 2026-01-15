import logging
import sys
import os

# Add project root to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.services.vault2_service import Vault2Service
from app.models.vault_config import VaultProgram

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def remove_roulette_config():
    db: Session = SessionLocal()
    try:
        service = Vault2Service()
        program = service.get_default_program(db)
        
        if not program:
            logger.info("No default VaultProgram found.")
            return

        config_json = program.config_json or {}
        game_earn_config = config_json.get("game_earn_config", {})
        
        roulette_config = game_earn_config.get("ROULETTE")
        
        if roulette_config:
            logger.info(f"Found ROULETTE config in DB: {roulette_config}")
            # Check for generic BASE/LOSE keys that might map to +200/-50
            keys_to_remove = ["BASE", "LOSE", "SEGMENT_5"]
            modified = False
            
            for key in keys_to_remove:
                if key in roulette_config:
                    logger.info(f"Removing key '{key}' from ROULETTE config.")
                    del roulette_config[key]
                    modified = True
            
            # If the config is empty or we want to wipe it all to enforce code defaults (0):
            # The user asked to "delete the setting".
            # If we delete the whole key "ROULETTE", it will fall back to code default (which is now 0).
            
            logger.info("Removing entire ROULETTE section from game_earn_config to enforce code defaults.")
            del game_earn_config["ROULETTE"]
            modified = True

            if modified:
                config_json["game_earn_config"] = game_earn_config
                program.config_json = config_json
                # Force update (SqlAlchemy JSON mutation tracking can be finicky)
                from sqlalchemy.orm.attributes import flag_modified
                flag_modified(program, "config_json")
                
                db.commit()
                logger.info("Successfully updated VaultProgram config.")
            else:
                logger.info("No relevant ROULETTE keys found to remove.")
        else:
            logger.info("No ROULETTE config found in game_earn_config.")

    except Exception as e:
        logger.error(f"Error removing config: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    remove_roulette_config()
