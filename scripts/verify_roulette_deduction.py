import sys
import os
sys.path.append(os.getcwd())

from app.services.vault_service import VaultService
from app.models.user import User
from app.db.session import SessionLocal

def test_roulette_deduction():
    db = SessionLocal()
    try:
        # 1. Create a dummy user
        import random
        rnd = random.randint(1000, 9999)
        u_id = f"test_deduct_{rnd}"
        user = User(external_id=u_id, nickname=f"Tester{rnd}", vault_locked_balance=1000)
        db.add(user)
        db.commit()
        db.refresh(user)
        print(f"Created User {user.id} with Locked Balance: {user.vault_locked_balance}")

        # 2. Simulate Roulette Loss (Reward = 0)
        service = VaultService()
        # record_game_play_earn_event(db, user, game_type, reward_type, reward_amount)
        # Assuming Roulette Loss is RewardType="NONE" or amount=0
        print("Simulating Roulette Loss...")
        service.record_game_play_earn_event(
            db, 
            user_id=user.id,
            game_type="ROULETTE", 
            game_log_id=rnd,
            outcome="SEGMENT_TEST", # Mimic real service
            payout_raw={"reward_amount": 0} 
        )
        
        # 3. Check Balance
        db.refresh(user)
        print(f"User {user.id} New Locked Balance: {user.vault_locked_balance}")
        
        expected = 950 # 1000 - 50
        if user.vault_locked_balance == expected:
            print("SUCCESS: Deducted 50 won correctly.")
        else:
            print(f"FAILURE: Expected {expected}, got {user.vault_locked_balance}")

        # Cleanup
        try:
           db.delete(user)
           db.commit()
        except Exception:
           db.rollback() 
           print("Cleanup failed (FK constraints), ignoring.")

    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    test_roulette_deduction()
