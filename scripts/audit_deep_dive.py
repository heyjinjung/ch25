
import sys
import os
from pathlib import Path
from datetime import datetime

# Add project root to path
sys.path.append(str(Path(__file__).parent.parent))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.db.base_class import Base

# Models
from app.models.user import User
from app.models.game_wallet import GameTokenType, UserGameWallet
from app.models.game_wallet_ledger import UserGameWalletLedger
from app.models.inventory import UserInventoryItem, UserInventoryLedger
from app.models.vault_earn_event import VaultEarnEvent
from app.models.vault2 import VaultProgram

# Services
from app.services.reward_service import RewardService
from app.services.game_wallet_service import GameWalletService
from app.services.inventory_service import InventoryService
from app.services.vault_service import VaultService
from app.services.vault2_service import Vault2Service

def test_economy_deep_dive():
    # Setup In-Memory DB
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()

    print("--- Admin Audit Phase 2+ (Deep Dive) Start ---")

    # 1. User Setup
    u1 = User(id=1, external_id="audit_deep", telegram_username="deep_user", status="ACTIVE", cash_balance=0, vault_locked_balance=0)
    db.add(u1)
    db.commit()

    reward_service = RewardService()

    # 2. Diamond (Inventory) vs Diamond Key (Wallet)
    print("\n[1] Testing Diamond vs Diamond Key Reflection...")
    
    # Diamond Key -> Wallet Ledger
    reward_service.grant_ticket(db, u1.id, GameTokenType.DIAMOND_KEY, 5)
    wallet_ledger = db.query(UserGameWalletLedger).filter(UserGameWalletLedger.token_type == GameTokenType.DIAMOND_KEY).first()
    print(f"   -> Diamond Key Ledger Found: {wallet_ledger.token_type} (Delta: {wallet_ledger.delta})")
    assert wallet_ledger.delta == 5

    # Diamond -> Inventory Ledger
    reward_service.grant_ticket(db, u1.id, "DIAMOND", 100)
    inv_ledger = db.query(UserInventoryLedger).filter(UserInventoryLedger.item_type == "DIAMOND").first()
    print(f"   -> Diamond Inventory Ledger Found: {inv_ledger.item_type} (Delta: {inv_ledger.change_amount})")
    assert inv_ledger.change_amount == 100

    # 3. CC_COIN Management
    print("\n[2] Testing CC_COIN Management...")
    reward_service.grant_ticket(db, u1.id, GameTokenType.CC_COIN, 50)
    coin_ledger = db.query(UserGameWalletLedger).filter(UserGameWalletLedger.token_type == GameTokenType.CC_COIN).first()
    print(f"   -> CC_COIN Ledger Found: {coin_ledger.token_type} (Delta: {coin_ledger.delta})")
    assert coin_ledger.delta == 50

    # 4. Vault Accrual Management via Config
    print("\n[3] Testing Vault Accrual Management via Config...")
    vault_service = VaultService()
    v2_service = Vault2Service()
    
    # Create a default program with custom earn config
    program = VaultProgram(
        key="NEW_MEMBER_VAULT", 
        name="Default Program", 
        is_active=True,
        config_json={
            "enable_game_earn_events": True,
            "game_earn_config": {
                "ROULETTE": {
                    "WIN": 500,  # Custom: 500 points on win
                    "LOSE": 100
                }
            }
        }
    )
    db.add(program)
    db.commit()

    # Simulate Roulette Win
    # outcome="WIN" will be mapped to game_earn_config["ROULETTE"]["WIN"]
    vault_service.record_game_play_earn_event(
        db, 
        user_id=u1.id, 
        game_type="ROULETTE", 
        game_log_id=1, 
        outcome="WIN"
    )
    db.refresh(u1)
    print(f"   -> Roulette WIN accrued: {u1.vault_locked_balance} (Expected 500)")
    assert u1.vault_locked_balance == 500

    # 5. Coupon State
    print("\n[4] Testing Coupon State (Verification of TODO)...")
    try:
        reward_service.grant_coupon(db, u1.id, "TEST_COUPON")
        print("   -> Coupon call success (but check logs for TODO)")
    except Exception as e:
        print(f"   -> Coupon call failed: {e}")

    print("\n--- Deep Dive Audit Completed ---")

if __name__ == "__main__":
    test_economy_deep_dive()
