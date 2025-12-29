from sqlalchemy import func
from app.db.session import SessionLocal
from app.models.vault2 import VaultProgram, VaultStatus
from app.models.user import User
from app.models.roulette import RouletteLog
from app.models.vault_earn_event import VaultEarnEvent

def inspect():
    db = SessionLocal()
    try:
        # Check Default Program
        program = db.query(VaultProgram).filter(VaultProgram.key == "NEW_MEMBER_VAULT").first()
        if program:
            print(f"Program: {program.name} ({program.key})")
            print(f"Is Active: {program.is_active}")
            print(f"Config: {program.config_json}")
        else:
            print("Default program NOT FOUND")

        # Find latest user who played roulette
        latest_log = db.query(RouletteLog).order_by(RouletteLog.id.desc()).first()
        if latest_log:
            user_id = latest_log.user_id
            user = db.query(User).filter(User.id == user_id).first()
            print(f"\nLatest User: {user.nickname} (ID: {user.id}, Ext: {user.external_id})")
            print(f"Vault Locked Balance: {user.vault_locked_balance}")
            print(f"Vault Expires At: {user.vault_locked_expires_at}")
            
            # Check VaultStatus
            status = db.query(VaultStatus).filter(VaultStatus.user_id == user_id).first()
            if status:
                print(f"VaultStatus State: {status.state}")
                print(f"VaultStatus Locked Amt: {status.locked_amount}")
                print(f"VaultStatus Progress: {status.progress_json}")
            else:
                print("VaultStatus NOT FOUND for user")

            # Check late Earn Events
            events = db.query(VaultEarnEvent).filter(VaultEarnEvent.user_id == user_id).order_by(VaultEarnEvent.id.desc()).limit(5).all()
            print(f"\nRecent Earn Events for user {user_id}:")
            for e in events:
                print(f"- ID: {e.id}, Type: {e.earn_type}, Amt: {e.amount}, Created: {e.created_at}")
        else:
            print("\nNo Roulette logs found")

    finally:
        db.close()

if __name__ == "__main__":
    inspect()
