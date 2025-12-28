import sys
import os
from datetime import datetime

# Add app directory to path
sys.path.append("/app")

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.models.user import User
from app.models.game_wallet import GameTokenType
from app.services.roulette_service import RouletteService
from app.core.config import get_settings

# Setup DB
settings = get_settings()
engine = create_engine(settings.database_url)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
db = SessionLocal()

def verify_key_roulette():
    print("--- Starting Key Roulette Verification ---")
    
    # 1. Create Test User
    user = db.query(User).filter(User.external_id == "test_key_user").first()
    if not user:
        user = User(external_id="test_key_user", nickname="TestKeyUser", level=1)
        db.add(user)
        db.commit()
        db.refresh(user)
    print(f"User ID: {user.id}")

    # 2. Grant Keys
    service = RouletteService()
    
    # Grant 5 Gold Keys
    service.wallet_service.grant_tokens(db, user.id, GameTokenType.GOLD_KEY, 5, "TEST_GRANT")
    # Grant 5 Diamond Keys
    service.wallet_service.grant_tokens(db, user.id, GameTokenType.DIAMOND_KEY, 5, "TEST_GRANT")
    db.commit()
    
    gold_bal = service.wallet_service.get_balance(db, user.id, GameTokenType.GOLD_KEY)
    diamond_bal = service.wallet_service.get_balance(db, user.id, GameTokenType.DIAMOND_KEY)
    print(f"Initial Balances -> Gold: {gold_bal}, Diamond: {diamond_bal}")
    
    # 3. Test Gold Roulette Spin
    print("\n[Test] Spinning Gold Roulette...")
    try:
        result = service.play(db, user.id, datetime.now(), ticket_type="GOLD_KEY")
        print(f"Result: {result.segment.label}, Reward: {result.segment.reward_amount}")
        
        # Verify Balance Deducted
        new_gold_bal = service.wallet_service.get_balance(db, user.id, GameTokenType.GOLD_KEY)
        print(f"New Gold Balance: {new_gold_bal}")
        assert new_gold_bal == gold_bal - 1, "Gold Key not deducted!"
        print("✅ Gold Key Logic Passed")
    except Exception as e:
        print(f"❌ Gold Roulette Failed: {e}")
        import traceback
        traceback.print_exc()

    # 4. Test Diamond Roulette Spin
    print("\n[Test] Spinning Diamond Roulette...")
    try:
        result = service.play(db, user.id, datetime.now(), ticket_type="DIAMOND_KEY")
        print(f"Result: {result.segment.label}, Reward: {result.segment.reward_amount}")
        
        # Verify Balance Deducted
        new_diamond_bal = service.wallet_service.get_balance(db, user.id, GameTokenType.DIAMOND_KEY)
        print(f"New Diamond Balance: {new_diamond_bal}")
        assert new_diamond_bal == diamond_bal - 1, "Diamond Key not deducted!"
        print("✅ Diamond Key Logic Passed")
    except Exception as e:
        print(f"❌ Diamond Roulette Failed: {e}")
        import traceback
        traceback.print_exc()

    print("\nTest Complete.")

if __name__ == "__main__":
    verify_key_roulette()
