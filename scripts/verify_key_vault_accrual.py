import sys
import os
from datetime import date, datetime

# Add project root to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.base_class import Base
from app.services.roulette_service import RouletteService
from app.services.game_wallet_service import GameWalletService
from app.services.season_pass_service import SeasonPassService
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
    season_svc = SeasonPassService()
    
    # Setup Test User
    user_id = 505505
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

    user = User(id=user_id, external_id="test_key_vault")
    db.add(user)
    db.commit()
    print(f"User Created: {user_id}")

    # 1. Provide GOLD_KEY
    wallet_svc.grant_tokens(db, user_id, GameTokenType.GOLD_KEY, 1, reason="TEST_SETUP")
    print("Granted 1 GOLD_KEY")

    # 2. Setup Config (Guaranteed 10,000 POINT)
    config = RouletteConfig(name="Gold Key Test", is_active=True, ticket_type="GOLD_KEY")
    db.add(config)
    db.commit()
    
    seg = RouletteSegment(
        config_id=config.id,
        slot_index=0,
        label="10,000 P",
        reward_type="POINT",
        reward_amount=10000,
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

    print("Roulette Configured: GOLD_KEY -> 10,000 POINT (plus 5 dummy segments)")
    
    # Snapshot Status
    status_before = season_svc.get_status(db, user_id, datetime.utcnow())
    xp_before = status_before["progress"]["current_xp"]
    db.refresh(user)
    vault_before = user.vault_locked_balance or 0
    print(f"Before: Vault={vault_before}, XP={xp_before}")

    # 3. Spin with GOLD_KEY
    print("\n[Test] Spin with GOLD_KEY")
    res = svc.play(db, user_id, datetime.utcnow(), ticket_type="GOLD_KEY")
    print(f"Result: {res.segment.reward_amount} {res.segment.reward_type}")

    # 4. Verify (Vault Should Increase, XP Should NOT)
    db.refresh(user)
    vault_after = user.vault_locked_balance or 0
    
    status_after = season_svc.get_status(db, user_id, datetime.utcnow())
    xp_after = status_after["progress"]["current_xp"]
    
    print(f"After: Vault={vault_after}, XP={xp_after}")
    
    # Logic: 10,000 Point -> 10,000 Cash (Vault) + 200 Base Earn = 10,200
    if vault_after == vault_before + 10200:
        print("✅ Vault Accrual Verified (+10,200 = 10k Reward + 200 Base)")
    else:
        print(f"❌ Vault Fail (Expected {vault_before + 10200}, Got {vault_after})")
        
    if xp_after == xp_before:
        print("✅ XP Exclusivity Verified (+0 XP)")
    else:
        print(f"❌ XP Fail (Expected {xp_before}, Got {xp_after}) - Should not grant XP on Key spin")

    db.close()

if __name__ == "__main__":
    verify()
