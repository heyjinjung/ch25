
import sys
import os
from datetime import datetime, timedelta, date, time
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from zoneinfo import ZoneInfo

# Add project root to python path
sys.path.append(os.getcwd())

from app.core.config import get_settings
from app.api.deps import get_db
from app.models.user import User
from app.models.game_wallet import UserGameWallet, GameTokenType
from app.models.inventory import UserInventoryItem
from app.services.mission_service import MissionService
from app.services.game_wallet_service import GameWalletService
from app.services.inventory_service import InventoryService
from sqlalchemy.orm import Session

# Mock datetime to control time
import unittest.mock

def verify_streak_rewards():
    settings = get_settings()
    # FORCE LOCAL CONNECTION for script execution outside docker
    # Assuming user is running this from host machine where port 3307 is mapped to 3306
    # You might need to adjust password if it's not '2026' or 'xmaspass'
    settings.database_url = "mysql+pymysql://xmasuser:2026@127.0.0.1:3307/xmas_event"
    
    # FORCE ENABLE STREAK REWARDS for testing
    settings.streak_milestone_rewards_enabled = True
    
    print(f"Using DB URL: {settings.database_url}")
    print(f"Streak Rewards Enabled: {settings.streak_milestone_rewards_enabled}")

    engine = create_engine(settings.database_url)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()

    try:
        # 1. Create a test user
        test_id_str = f"test_{int(datetime.now().timestamp())}"
        user = User(
            external_id=test_id_str, # Using external_id instead of email
            nickname="StreakTester",
            password_hash="hashed_password",
            play_streak=0,
            last_play_date=None,
            status="ACTIVE"
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        user_id = user.id
        print(f"Created test user: {user.id} ({user.external_id})")

        # 2. Simulate Day 1 Play
        print("\n--- Day 1 Simulation ---")
        day1 = datetime(2026, 1, 1, 12, 0, 0, tzinfo=ZoneInfo("Asia/Seoul"))
        
        with unittest.mock.patch('app.services.mission_service.MissionService._now_tz', return_value=day1):
            ms = MissionService(db)
            ms.update_progress(user_id, "PLAY_GAME", 1)
            
        db.refresh(user)
        print(f"Day 1 Streak: {user.play_streak} (Expected: 1)")
        print(f"Day 1 Last Play Date: {user.last_play_date}")

        # 3. Simulate Day 2 Play
        print("\n--- Day 2 Simulation ---")
        day2 = day1 + timedelta(days=1)
        with unittest.mock.patch('app.services.mission_service.MissionService._now_tz', return_value=day2):
            ms = MissionService(db)
            ms.update_progress(user_id, "PLAY_GAME", 1)
            
        db.refresh(user)
        print(f"Day 2 Streak: {user.play_streak} (Expected: 2)")

        # 4. Simulate Day 3 Play (Milestone Reward Day)
        print("\n--- Day 3 Simulation ---")
        day3 = day1 + timedelta(days=2)
        with unittest.mock.patch('app.services.mission_service.MissionService._now_tz', return_value=day3):
            ms = MissionService(db)
            ms.update_progress(user_id, "PLAY_GAME", 1)
            
        db.refresh(user)
        print(f"Day 3 Streak: {user.play_streak} (Expected: 3)")

        # 5. Verify Rewards for Day 3
        # Default rules say Day 3 gives: 1 Roulette Coin, 1 Dice Token, 1 Lottery Ticket
        print("\n--- Verifying Day 3 Rewards ---")
        
        # Query specific tokens directly
        print("\n--- Verifying Day 3 Rewards ---")
        
        rewards_received = {
            "ROULETTE_COIN": 0,
            "DICE_TOKEN": 0,
            "LOTTERY_TICKET": 0
        }
        
        # Check Wallet Tokens
        for token_str in ["ROULETTE_COIN", "DICE_TOKEN", "LOTTERY_TICKET"]:
            try:
                token_enum = GameTokenType(token_str)
                balance = GameWalletService().get_balance(db, user_id, token_enum)
                rewards_received[token_str] = balance
            except Exception as e:
                print(f"Error checking {token_str}: {e}")


        expected_rewards = {
            "ROULETTE_COIN": 1,
            "DICE_TOKEN": 1,
            "LOTTERY_TICKET": 1
        }
        
        success = True
        for token, amount in expected_rewards.items():
            actual = rewards_received.get(token, 0)
            if actual >= amount:
                print(f"[PASS] {token}: Received {actual} (Expected >= {amount})")
            else:
                print(f"[FAIL] {token}: Received {actual} (Expected >= {amount})")
                success = False

        if success:
            print("\n✅ Streak Reward Verification Successful!")
        else:
            print("\n❌ Streak Reward Verification Failed!")

    except Exception as e:
        print(f"An error occurred: {e}")
        import traceback
        traceback.print_exc()
    finally:
        # Cleanup
        try:
            # Delete user (cascade should handle wallet/progress)
            # But let's be careful. For now, we leave it or delete if confirmed safe.
            # db.delete(user) 
            # db.commit()
            print("Test user preserved for manual inspection if needed.")
        except:
            pass
        db.close()

if __name__ == "__main__":
    verify_streak_rewards()
