import sys
import os
from datetime import date, datetime

# Add project root to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.base_class import Base
from app.services.roulette_service import RouletteService
from app.services.season_pass_service import SeasonPassService
from app.models.user import User
from app.models.roulette import RouletteConfig, RouletteSegment
from app.models.season_pass import SeasonPassConfig
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
    season_svc = SeasonPassService()
    
    # Setup Test User
    user_id = 101010
    try:
        db.execute(text("DELETE FROM vault_status WHERE user_id = :uid"), {"uid": user_id})
        db.execute(text("DELETE FROM vault_earn_event WHERE user_id = :uid"), {"uid": user_id})
        db.execute(text("DELETE FROM season_pass_progress WHERE user_id = :uid"), {"uid": user_id})
        db.execute(text("DELETE FROM external_ranking_data WHERE user_id = :uid"), {"uid": user_id})
        db.commit()
    except Exception:
        db.rollback()

    db.query(UserGameWallet).filter(UserGameWallet.user_id == user_id).delete()
    db.query(User).filter(User.id == user_id).delete()
    db.commit()

    user = User(id=user_id, external_id="strict_xp_test")
    db.add(user)
    db.commit()
    
    # Grant Roulette Coins
    from app.services.game_wallet_service import GameWalletService
    GameWalletService().grant_tokens(db, user_id, GameTokenType.ROULETTE_COIN, 10, reason="SETUP")
    print(f"User Created: {user_id}. Granted tokens.")

    # Check Initial XP
    status_0 = season_svc.get_status(db, user_id, datetime.utcnow())
    xp_0 = status_0["progress"]["current_xp"]
    print(f"Initial Season XP: {xp_0}")

    # 1. Test Game Play (Win Point) -> Expect 0 XP Change
    print("\n[Test 1] Play Roulette (Win 1000 POINT)")
    # Setup Config
    db.query(RouletteConfig).delete() 
    config = RouletteConfig(name="Strict XP Test", is_active=True)
    db.add(config)
    db.commit()
    
    # Add dummy segments + Guaranteed Win
    seg = RouletteSegment(
        config_id=config.id, slot_index=0, label="1000 P", reward_type="POINT", reward_amount=1000, weight=100
    )
    db.add(seg)
    for i in range(1, 6):
        db.add(RouletteSegment(config_id=config.id, slot_index=i, label="L", reward_type="NONE", reward_amount=0, weight=0))
    db.commit()
    
    svc.play(db, user_id, datetime.utcnow())
    
    status_1 = season_svc.get_status(db, user_id, datetime.utcnow())
    xp_1 = status_1["progress"]["current_xp"]
    print(f"XP After Game: {xp_1}")
    
    if xp_1 == xp_0:
        print("✅ Strict XP Verified (Game Reward granted 0 XP)")
    else:
        print(f"❌ Strict XP Failed (Expected {xp_0}, Got {xp_1})")

    # 2. Test Deposit -> Expect XP Increase
    print("\n[Test 2] Simulate External Deposit (100,000 KRW)")
    # We call add_bonus_xp directly assuming the Ranking Service calls it, 
    # OR we can update `external_ranking_data` if `AdminExternalRankingService` is available.
    # Let's call `season_svc.add_bonus_xp` simulating the event source.
    # 100,000 KRW = 20 XP (Standard ratio)
    
    season_svc.add_bonus_xp(db, user_id, 20)
    
    status_2 = season_svc.get_status(db, user_id, datetime.utcnow())
    xp_2 = status_2["progress"]["current_xp"]
    print(f"XP After Deposit Event: {xp_2}")
    
    if xp_2 == xp_1 + 20:
        print("✅ Deposit XP Verified (XP increased by 20)")
    else:
        print(f"❌ Deposit XP Failed (Expected {xp_1 + 20}, Got {xp_2})")

    db.close()

if __name__ == "__main__":
    verify()
