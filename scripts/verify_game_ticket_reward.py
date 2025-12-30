import sys
import os
from datetime import date, datetime

# Add project root to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.base_class import Base
from app.services.roulette_service import RouletteService
from app.services.game_wallet_service import GameWalletService
from app.models.user import User
from app.models.roulette import RouletteConfig, RouletteSegment
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
    svc = RouletteService()
    wallet_svc = GameWalletService()
    
    # Setup Test User
    user_id = 606606
    try:
        db.execute(text("DELETE FROM vault_status WHERE user_id = :uid"), {"uid": user_id})
        db.execute(text("DELETE FROM vault_earn_event WHERE user_id = :uid"), {"uid": user_id})
        db.execute(text("DELETE FROM season_pass_progress WHERE user_id = :uid"), {"uid": user_id})
        db.commit()
    except Exception:
        db.rollback()

    db.query(UserGameWallet).filter(UserGameWallet.user_id == user_id).delete()
    db.query(User).filter(User.id == user_id).delete()
    db.query(RouletteConfig).delete()
    db.commit()

    user = User(id=user_id, external_id="test_ticket_reward")
    db.add(user)
    db.commit()
    
    # Grant Roulette Coins to play
    wallet_svc.grant_tokens(db, user_id, GameTokenType.ROULETTE_COIN, 10, reason="SETUP")
    print(f"User Created: {user_id}. Granted 10 ROULETTE_COIN")

    # 1. Setup Config (Reward -> 5 DICE_TOKEN)
    config = RouletteConfig(name="Ticket Reward Test", is_active=True)
    db.add(config)
    db.commit()
    
    seg = RouletteSegment(
        config_id=config.id,
        slot_index=0,
        label="5 Dice Tokens",
        reward_type="TICKET_DICE", # Mapping handled in RewardService
        reward_amount=5,
        weight=100
    )
    db.add(seg)
    db.commit()
    
    # Add 5 dummy segments to strict validation (total 6 required)
    for i in range(1, 6):
        dummy = RouletteSegment(
            config_id=config.id,
            slot_index=i,
            label="Loss",
            reward_type="NONE",
            reward_amount=0,
            weight=0
        )
        db.add(dummy)
    db.commit()

    print("Roulette Configured: Win -> 5 DICE_TOKEN (plus 5 dummy segments)")
    
    # Check Initial Dice Balance
    dice_before = wallet_svc.get_balance(db, user_id, GameTokenType.DICE_TOKEN)
    print(f"Dice Balance Before: {dice_before}")

    # 2. Spin
    print("\n[Test] Spin Roulette")
    res = svc.play(db, user_id, datetime.utcnow())
    print(f"Result: {res.segment.reward_amount} {res.segment.reward_type}")

    # 3. Verify
    dice_after = wallet_svc.get_balance(db, user_id, GameTokenType.DICE_TOKEN)
    print(f"Dice Balance After: {dice_after}")
    
    if dice_after == dice_before + 5:
        print("✅ Ticket Reward Verified (+5 Dice Tokens)")
    else:
        print(f"❌ Ticket Reward Fail (Expected {dice_before + 5}, Got {dice_after})")

    db.close()

if __name__ == "__main__":
    verify()
