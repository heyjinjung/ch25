import sys
import os
from datetime import date, datetime

# Add app base to path
sys.path.append(os.getcwd())

from app.db.session import SessionLocal
from app.services.roulette_service import RouletteService
from app.models.user import User
from app.models.game_wallet import GameTokenType 
from app.services.game_wallet_service import GameWalletService

def verify_roulette_vault():
    db = SessionLocal()
    try:
        # 1. Setup User
        user_id = 12345
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            user = User(id=user_id, external_id=f"test-{user_id}", vault_locked_balance=0, cash_balance=0)
            db.add(user)
            db.commit()
        
        # Reset vault balance
        user.vault_locked_balance = 0
        db.add(user)
        db.commit()
        
        initial_balance = user.vault_locked_balance or 0
        print(f"Initial Vault Balance: {initial_balance}")

        # 2. Grant Diamond Key
        wallet_service = GameWalletService()
        wallet_service.grant_tokens(db, user_id, GameTokenType.DIAMOND_KEY, 1, "TEST_GRANT")
        
        # 3. Play Roulette (Simulating Diamond Key Spin)
        # We need to ensure the outcome is a POINT reward. 
        # Since play() outcome is random, we might need to mock or force it, 
        # but for now let's try to see if we can trigger the code path.
        # Actually random is hard to reproduce. 
        # Instead, let's call the `record_trial_result_earn_event` directly with the exact params used in RouletteService
        # to verify the VAULT SIDE logic first.
        
        from app.services.vault_service import VaultService
        from app.models.feature import FeatureType
        
        vault_service = VaultService()
        
        # Simulate parameters from RouletteService.play for a 10,000 P win with Diamond Key
        # chosen.reward_type = "POINT"
        # chosen.reward_amount = 10000
        # token_type_enum = GameTokenType.DIAMOND_KEY
        
        print("Simulating Diamond Key -> 10,000 Point Reward Accrual...")
        
        added = vault_service.record_trial_result_earn_event(
            db,
            user_id=user_id,
            game_type=FeatureType.ROULETTE.value,
            game_log_id=999999, # Dummy ID
            token_type=GameTokenType.DIAMOND_KEY.value, # "DIAMOND_KEY"
            reward_type="POINT",
            reward_amount=10000,
            payout_raw={
                "segment_id": 999,
                "original_reward_type": "POINT",
                "is_key_spin_point": True
            },
            force_enable=True, # Verify forced accrual
        )
        
        print(f"Added Amount returned by service: {added}")
        
        db.refresh(user)
        final_balance = user.vault_locked_balance
        print(f"Final Vault Balance: {final_balance}")
        
        if final_balance == initial_balance + 10000:
            print("SUCCESS: Vault balance increased by 10,000.")
        else:
            print("FAILURE: Vault balance mismatch.")

    except Exception as e:
        print(f"ERROR: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    verify_roulette_vault()
