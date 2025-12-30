import sys
import os
import random
from datetime import date, datetime

# Add project root to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.base_class import Base
from app.services.roulette_service import RouletteService
from app.services.game_wallet_service import GameWalletService
from app.models.user import User
from app.models.roulette import RouletteConfig, RouletteSegment, RouletteLog
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
    svc = RouletteService()
    wallet_svc = GameWalletService()
    
    # Setup Test User
    user_id = 991199
    # Cascade cleanup manually to avoid FK error
    try:
        from sqlalchemy import text
        db.execute(text("DELETE FROM vault_status WHERE user_id = :uid"), {"uid": user_id})
        db.execute(text("DELETE FROM vault_earn_event WHERE user_id = :uid"), {"uid": user_id})
        db.execute(text("DELETE FROM season_pass_progress WHERE user_id = :uid"), {"uid": user_id})
        db.commit()
    except Exception as e:
        print(f"Cleanup Warning: {e}")
        db.rollback()

    db.query(UserGameWallet).filter(UserGameWallet.user_id == user_id).delete()
    db.query(User).filter(User.id == user_id).delete()
    db.query(RouletteConfig).delete() 
    db.commit()

    user = User(id=user_id, external_id="test_roulette_reward")
    db.add(user)
    db.commit()
    print(f"User Created: {user_id}")
    
    # Grant initial play tokens
    wallet_svc.grant_tokens(db, user_id, GameTokenType.ROULETTE_COIN, 100, reason="SETUP")
    print("Granted 100 ROULETTE_COIN")

    # 1. Setup Config (All segments = 500 Point)
    print("\n[Test 1] Setup Roulette Config (Deterministic: Always 500 POINT)")
    config = RouletteConfig(name="Deterministic Test", is_active=True, max_daily_spins=0)
    db.add(config)
    db.commit()
    
    # Create segments that ALL give 500 POINT to guarantee result
    segments = []
    for i in range(6):
        segments.append(RouletteSegment(
            config_id=config.id,
            slot_index=i,
            label="500 Point",
            reward_type="POINT",
            reward_amount=500,
            weight=100 
        ))
    db.add_all(segments)
    db.commit()
    print("Roulette Configured for Guaranteed 500 POINT")

    # 2. Spin
    print("\n[Test 2] Spin Roulette")
    # Need to check Balance(POINT) before? Wait, Point is not in Wallet, it's usually Season XP or internal.
    # But wait, User cash balance or just a log?
    # According to `RouletteService`, POINT awards are delivered via `RewardService`.
    # `RewardService.deliver` for "POINT" calls `SeasonPassService.add_bonus_xp`.
    # SO we should check SEASON XP increase!
    
    from app.services.season_pass_service import SeasonPassService
    season_svc = SeasonPassService()
    # Ensure season exists for XP
    # We rely on existing season or let service handle gracefully.
    
    # Check initial "POINT" logic?
    # Actually, let's verify if `RewardService` delivers Point as XP.
    # Design says: "Point is Season XP".
    
    old_status = season_svc.get_status(db, user_id, datetime.utcnow())
    old_xp = old_status["progress"]["current_xp"]
    print(f"Initial Season XP: {old_xp}")

    res = svc.play(db, user_id, date.today(), GameTokenType.ROULETTE_COIN.value)
    print(f"Spin Result: {res.segment.label} (Reward: {res.segment.reward_amount} {res.segment.reward_type})")
    
    # 3. Verify XP Increase
    new_status = season_svc.get_status(db, user_id, datetime.utcnow())
    new_xp = new_status["progress"]["current_xp"]
    print(f"New Season XP: {new_xp}")
    
    # Base XP + Reward Amount?
    # Service says: xp_award = BASE_GAME_XP (0)
    # deliver(POINT, 500) -> add_bonus_xp(500)
    
    # Strict Rule: Game Rewards Point -> NO XP, NO Point (Cash). Just ignored/logged.
    if new_xp == old_xp:
         print("✅ Strict XP Rule Verified (XP did NOT increase from Game Reward)")
    else:
         print(f"❌ Strict XP Rule Failed (Expected {old_xp}, Got {new_xp}) - Game Reward granted XP!")

    db.close()

if __name__ == "__main__":
    verify()
