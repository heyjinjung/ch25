import sys
import os

# Add project root to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.base_class import Base
from app.services.reward_service import RewardService
from app.services.game_wallet_service import GameWalletService
from app.models.user import User
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
    svc = RewardService()
    wallet_svc = GameWalletService()
    
    # Setup Test User
    user_id = 333333
    db.query(UserGameWallet).filter(UserGameWallet.user_id == user_id).delete()
    db.query(User).filter(User.id == user_id).delete()
    db.commit()

    user = User(id=user_id, external_id="test_bundle")
    db.add(user)
    db.commit()
    print(f"User Created: {user_id}")

    # 1. Grant Bundle (Amount 3 = All-in-one)
    print("\n[Test 1] Grant 'BUNDLE' (Amount 3 -> 1 Roulette, 1 Dice, 1 Lottery)")
    svc.deliver(db, user_id, "BUNDLE", 3, meta={"reason": "Test Bundle"})
    
    # 2. Verify Wallets
    b_roulette = wallet_svc.get_balance(db, user_id, GameTokenType.ROULETTE_COIN)
    b_dice = wallet_svc.get_balance(db, user_id, GameTokenType.DICE_TOKEN)
    b_lottery = wallet_svc.get_balance(db, user_id, GameTokenType.LOTTERY_TICKET)
    
    print(f"Roulette: {b_roulette}, Dice: {b_dice}, Lottery: {b_lottery}")
    
    if b_roulette == 1 and b_dice == 1 and b_lottery == 1:
        print("✅ Bundle Grant Verified")
    else:
        print("❌ Bundle Verification Failed")
    
    db.close()

if __name__ == "__main__":
    verify()
