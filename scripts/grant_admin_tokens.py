
import sys
import os

# Add the project root to sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.db.session import SessionLocal
from app.models.user import User
from app.services.game_wallet_service import GameWalletService, GameTokenType

def grant_tokens():
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.external_id == "admin").first()
        if not user:
            print("Admin user not found.")
            return

        service = GameWalletService()
        
        # Grant Dice Tokens (or just Cash if your system uses cash for betting, but error said TOKENS)
        # Actually message was NOT_ENOUGH_TOKENS, assume it checked wallet.
        # But wait, dice usually uses cash or specific tokens? 
        # Let's give both CASH and TOKENS just to be sure.
        
        # 1. Grant Cash
        user.cash_balance = (user.cash_balance or 0) + 1000000
        db.add(user)
        
        # 2. Grant Tokens
        service.grant_tokens(db, user.id, GameTokenType.DICE_TOKEN, 100, "TEST_GRANT", "Test Grant")
        
        db.commit()
        print("✅ Granted 1,000,000 Cash and 100 Dice Tokens to Admin.")
        
    except Exception as e:
        print(f"Error granting tokens: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    grant_tokens()
