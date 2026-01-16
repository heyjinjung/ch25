
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.session import SessionLocal
from app.models.user import User
from app.api.routes.new_user_onboarding import claim_welcome, status
from app.services.game_wallet_service import GameWalletService
from app.models.game_wallet import GameTokenType
import uuid

def test_full_welcome_flow():
    db = SessionLocal()
    ext_id = f"test-welcome-{uuid.uuid4().hex[:8]}"
    try:
        # 1. Create User
        user = User(external_id=ext_id, nickname=ext_id)
        db.add(user)
        db.commit()
        db.refresh(user)
        print(f"Created user {user.id} ({ext_id})")

        wallet_service = GameWalletService()
        initial_balance = wallet_service.get_balance(db, user.id, GameTokenType.ROULETTE_COIN)
        initial_vault = user.vault_locked_balance or 0
        print(f"Initial Roulette Balance: {initial_balance}, Vault: {initial_vault}")

        # 2. Check Status (might trigger LOGIN progress)
        print("Calling /status...")
        status(db, user.id)
        db.refresh(user)
        
        balance_after_status = wallet_service.get_balance(db, user.id, GameTokenType.ROULETTE_COIN)
        print(f"Balance after /status: {balance_after_status}")

        # 3. Claim Welcome
        print("Calling /claim-welcome...")
        result = claim_welcome(db, user.id)
        print(f"Claim Success: {result.success}, Rewards: {result.rewards}")
        
        db.refresh(user)
        final_balance = wallet_service.get_balance(db, user.id, GameTokenType.ROULETTE_COIN)
        final_vault = user.vault_locked_balance or 0
        print(f"Final Roulette Balance: {final_balance}, Vault: {final_vault}")

        if final_balance - initial_balance == 5 and final_vault - initial_vault == 2000:
            print("✅ SUCCESS: Granted 5 tickets and 2000 cash.")
        else:
            print(f"❌ FAILURE: Granted {final_balance - initial_balance} tickets and {final_vault - initial_vault} cash.")

    finally:
        db.close()

if __name__ == "__main__":
    test_full_welcome_flow()
