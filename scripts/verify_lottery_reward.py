import sys
import os
from datetime import date, datetime

# Add project root to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.base_class import Base
from app.services.lottery_service import LotteryService
from app.services.game_wallet_service import GameWalletService
from app.services.season_pass_service import SeasonPassService
from app.models.user import User
from app.models.lottery import LotteryConfig, LotteryPrize, LotteryLog
from app.models.game_wallet import GameTokenType, UserGameWallet
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
    svc = LotteryService()
    wallet_svc = GameWalletService()
    season_svc = SeasonPassService()
    
    # Setup Test User
    user_id = 778877
    try:
        db.execute(text("DELETE FROM vault_status WHERE user_id = :uid"), {"uid": user_id})
        db.execute(text("DELETE FROM vault_earn_event WHERE user_id = :uid"), {"uid": user_id})
        db.execute(text("DELETE FROM season_pass_progress WHERE user_id = :uid"), {"uid": user_id})
        db.commit()
    except Exception as e:
        print(f"Cleanup Warning: {e}")
        db.rollback()

    db.query(UserGameWallet).filter(UserGameWallet.user_id == user_id).delete()
    db.query(User).filter(User.id == user_id).delete()
    db.query(LotteryConfig).delete()
    db.commit()

    user = User(id=user_id, external_id="test_lottery_reward")
    db.add(user)
    db.commit()
    print(f"User Created: {user_id}")
    
    # Grant initial play tokens
    wallet_svc.grant_tokens(db, user_id, GameTokenType.LOTTERY_TICKET, 100, reason="SETUP")
    print("Granted 100 LOTTERY_TICKET")

    # 1. Setup Lottery Config (Winner Takes All -> 1000 POINT)
    print("\n[Test 1] Setup Lottery Config (Deterministic: Always 1000 POINT)")
    config = LotteryConfig(name="Deterministic Lottery", is_active=True)
    db.add(config)
    db.commit()
    
    prize = LotteryPrize(
        config_id=config.id,
        label="1st Prize",
        reward_type="POINT",
        reward_amount=1000,
        weight=100,
        is_active=True,
        stock=999
    )
    db.add(prize)
    db.commit()
    print("Lottery Configured for Guaranteed 1000 POINT")
    
    # Check Initial XP
    old_status = season_svc.get_status(db, user_id, datetime.utcnow())
    old_xp = old_status["progress"]["current_xp"]
    print(f"Initial Season XP: {old_xp}")

    # 2. Play
    print("\n[Test 2] Play Lottery")
    res = svc.play(db, user_id, datetime.utcnow())
    print(f"Lottery Result: {res.prize.label} (Reward: {res.prize.reward_amount} {res.prize.reward_type})")
    
    # 3. Verify XP
    new_status = season_svc.get_status(db, user_id, datetime.utcnow())
    new_xp = new_status["progress"]["current_xp"]
    print(f"New Season XP: {new_xp}")
    
    if new_xp == old_xp + 1000:
         print("✅ Reward Verified (XP increased by 1000)")
    else:
         print(f"❌ Reward Failed (Expected {old_xp + 1000}, Got {new_xp})")

    db.close()

if __name__ == "__main__":
    verify()
