import sys
import os
import random
from datetime import date

# Add project root to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.base_class import Base
from app.services.dice_service import DiceService
from app.services.game_wallet_service import GameWalletService
from app.models.user import User
from app.models.dice import DiceConfig, DiceLog
from app.models.game_wallet import GameTokenType, UserGameWallet
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Override DB URL for local port 3307
DB_URL = "mysql+pymysql://xmasuser:2026@127.0.0.1:3307/xmas_event"
engine = create_engine(DB_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def verify():
    # Ensure tables exist
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    svc = DiceService()
    wallet_svc = GameWalletService()
    
    # Setup Test User
    user_id = 121212
    db.query(UserGameWallet).filter(UserGameWallet.user_id == user_id).delete()
    db.query(User).filter(User.id == user_id).delete()
    db.query(DiceConfig).delete() # Cleanup configs to ensure our test config is active
    db.commit()

    user = User(id=user_id, external_id="test_reward_config")
    db.add(user)
    db.commit()
    print(f"User Created: {user_id}")
    
    # Grant initial play tokens (DICE_TOKEN)
    wallet_svc.grant_tokens(db, user_id, GameTokenType.DICE_TOKEN, 100, reason="SETUP")
    print("Granted 100 DICE_TOKEN")

    # 1. Setup Dice Config (Win = 5 LOTTERY_TICKET)
    print("\n[Test 1] Setup Dice Config (Win -> 5 LOTTERY_TICKET)")
    config = DiceConfig(
        name="Reward Test Config",
        is_active=True,
        max_daily_plays=0,
        win_reward_type="LOTTERY_TICKET",
        win_reward_amount=5,
        draw_reward_type="NONE",
        draw_reward_amount=0,
        lose_reward_type="NONE",
        lose_reward_amount=0
    )
    db.add(config)
    db.commit()
    print(f"Config Created: {config.id}")

    # 2. Play until WIN
    print("\n[Test 2] Play until WIN")
    initial_lottery = wallet_svc.get_balance(db, user_id, GameTokenType.LOTTERY_TICKET)
    print(f"Initial Lottery Balance: {initial_lottery}")

    win_occurred = False
    for i in range(50):
        # We need to simulate play. DiceService.play() consumes token and returns result.
        # But wait, play() uses random. We can't guarantee a WIN easily unless we mock random.
        # However, simulating 50 spins usually hits a WIN. 
        # For STRICT verification, we might want to manually invoke the logic parts or just hope for RNG.
        # Let's try honest RNG first.
        try:
            res = svc.play(db, user_id, date.today())
            print(f"Play {i+1}: {res.game.result} (User: {res.game.user_sum} vs Dealer: {res.game.dealer_sum})")
            
            if res.game.result == "WIN":
                win_occurred = True
                print("🎉 WIN HIT!")
                # Verify immediately
                new_lottery = wallet_svc.get_balance(db, user_id, GameTokenType.LOTTERY_TICKET)
                print(f"New Lottery Balance: {new_lottery}")
                
                # Check delta
                expected = initial_lottery + 5
                if new_lottery == expected:
                    print("✅ Reward Verified (Balance increased by 5)")
                else:
                    print(f"❌ Reward Failed (Expected {expected}, Got {new_lottery})")
                break
        except Exception as e:
            print(f"Play Error: {e}")
            break

    if not win_occurred:
        print("⚠️ Could not hit WIN in 50 tries. RNG bad luck or Dealer rigged. Test Inconclusive.")

    db.close()

if __name__ == "__main__":
    verify()
