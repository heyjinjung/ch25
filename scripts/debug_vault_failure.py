
import sys
import os

# Create a 'fake' environment for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine, select, desc
from sqlalchemy.orm import sessionmaker
from app.core.config import get_settings
from app.models.user import User
from app.models.vault_earn_event import VaultEarnEvent
from app.models.vault_ledger import VaultLedger
from app.services.vault2_service import Vault2Service
from app.services.vault_service import VaultService

def debug_vault_failure():
    settings = get_settings()
    engine = create_engine(settings.database_url)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()

    try:
        # 1. Check Global Config
        v2 = Vault2Service()
        db_flag = v2.get_config_value(db, "enable_game_earn_events", None)
        env_flag = settings.enable_vault_game_earn_events
        print(f"--- Configuration ---")
        print(f"DB enable_game_earn_events: {db_flag}")
        print(f"ENV ENABLE_VAULT_GAME_EARN_EVENTS: {env_flag}")
        
        # 2. Find User
        # Try to find by nickname or external_id or telegram_username
        user = db.query(User).filter(User.external_id == "jm956").first()
        if not user:
             user = db.query(User).filter(User.telegram_username == "jm956").first()

        if not user:
            print("User 'jm956' not found by external_id or telegram_username. Listing recent users:")
            recent_users = db.query(User).order_by(User.id.desc()).limit(5).all()
            for u in recent_users:
                print(f"ID: {u.id}, ExternalID: {u.external_id}, Nickname: {getattr(u, 'nickname', 'N/A')}")
            return

        print(f"\n--- User: {user.external_id} (ID: {user.id}) ---")
        print(f"Vault Locked: {user.vault_locked_balance}")
        print(f"Vault Spent: {user.vault_spent_total}")
        
        # 3. Check Recent Vault Earn Events
        print(f"\n--- Recent Vault Earn Events (Last 10) ---")
        events = db.query(VaultEarnEvent).filter(VaultEarnEvent.user_id == user.id).order_by(VaultEarnEvent.created_at.desc()).limit(10).all()
        for e in events:
            print(f"[{e.created_at}] Type: {e.earn_type}, Source: {e.source}, Amount: {e.amount}, EventID: {e.earn_event_id}")
            print(f"  PayoutRaw: {e.payout_raw_json}")

    finally:
        db.close()

if __name__ == "__main__":
    debug_vault_failure()
