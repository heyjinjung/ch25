import sys
import os
from datetime import date
import random

# Add project root to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.session import SessionLocal
from app.services.roulette_service import RouletteService
from app.services.dice_service import DiceService
from app.services.game_wallet_service import GameWalletService
from app.models.user import User
from app.models.game_wallet import GameTokenType

def test_game_limits():
    db = SessionLocal()
    try:
        # 1. Create Test User
        user_id = 999999  # Dedicated test user ID
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            user = User(id=user_id, external_id=f"limit_test_{user_id}", nickname="LimitTester")
            db.add(user)
            db.commit()
            print(f"Created Test User: {user_id}")
        
        # 2. Grant Tokens (Enough for 100 plays)
        wallet_service = GameWalletService()
        wallet_service.grant_tokens(db, user_id, GameTokenType.ROULETTE_COIN, 100, "TEST_SEED", auto_commit=True)
        wallet_service.grant_tokens(db, user_id, GameTokenType.DICE_TOKEN, 100, "TEST_SEED", auto_commit=True)
        print("Granted 100 Roulette Coins and 100 Dice Coins")

        # 3. Test Roulette (Expected Limit: 50)
        print("\n--- Testing Roulette (Max 50) ---")
        roulette_service = RouletteService()
        today = date.today()
        
        roulette_count = 0
        try:
            for i in range(1, 60): # Try up to 60
                roulette_service.play(db, user_id, today, GameTokenType.ROULETTE_COIN.value)
                roulette_count += 1
                if i % 10 == 0:
                    print(f"Roulette Play {i} OK")
        except Exception as e:
            print(f"Roulette Stopped at {roulette_count}: {e}")

        # 4. Test Dice (Expected Limit: 50)
        print("\n--- Testing Dice (Max 50) ---")
        dice_service = DiceService()
        
        dice_count = 0
        try:
            for i in range(1, 60): # Try up to 60
                dice_service.play(db, user_id, today)
                dice_count += 1
                if i % 10 == 0:
                    print(f"Dice Play {i} OK")
        except Exception as e:
            print(f"Dice Stopped at {dice_count}: {e}")

    except Exception as e:
        print(f"Global Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    test_game_limits()
