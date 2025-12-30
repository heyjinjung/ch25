import sys
import os
from datetime import date, datetime

# Add project root to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.base_class import Base
from app.services.vault_service import VaultService
from app.models.user import User
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

# Override DB URL for local port 3307
DB_URL = "mysql+pymysql://xmasuser:2026@127.0.0.1:3307/xmas_event"
engine = create_engine(DB_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def verify():
    # Ensure tables exist
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    svc = VaultService()

    # Setup Test User
    user_id = 404404
    try:
        db.execute(text("DELETE FROM vault_status WHERE user_id = :uid"), {"uid": user_id})
        db.execute(text("DELETE FROM vault_earn_event WHERE user_id = :uid"), {"uid": user_id})
        db.execute(text("DELETE FROM season_pass_progress WHERE user_id = :uid"), {"uid": user_id})
        db.commit()
    except Exception as e:
        print(f"Cleanup Warning: {e}")
        db.rollback()
        
    db.query(User).filter(User.id == user_id).delete()
    db.commit()

    user = User(id=user_id, external_id="test_vault_loss")
    # Grant initial Locked Balance to ensure we can see changes
    user.vault_locked_balance = 10000 
    db.add(user)
    db.commit()
    print(f"User Created: {user_id} (Vault Locked: 10,000)")

    # 1. Simulate DICE LOSS (Pity Mock)
    # We call record_game_play_earn_event directly mocking a LOSS
    print("\n[Test 1] Simulate DICE LOSS Event")
    
    # Base: 200, Lose Bonus: 100 -> Expected Total: 300
    # Multiplier might be active. Let's check multiplier first.
    mult = svc.vault_accrual_multiplier(db, datetime.utcnow())
    print(f"Current Multiplier: {mult}")
    
    expected_gain = int((200 + 100) * mult)
    print(f"Expected Gain: {expected_gain}")

    svc.record_game_play_earn_event(
        db,
        user_id=user_id,
        game_type="DICE",
        game_log_id=99999, # Fake ID
        token_type="DICE_TOKEN",
        outcome="LOSE",
        payout_raw={"mock": True}
    )
    
    # Refresh User
    db.refresh(user)
    new_locked = user.vault_locked_balance
    print(f"New Vault Locked: {new_locked}")
    
    if new_locked == 10000 + expected_gain:
        print(f"✅ Vault INCREASED on Loss (Pity System verified). Gain: {expected_gain}")
    elif new_locked < 10000:
        print(f"❌ Vault DECREASED! (Unexpected behavior)")
    else:
        print(f"❌ Verification Failed (Expected {10000+expected_gain}, Got {new_locked})")

    db.close()

if __name__ == "__main__":
    verify()
