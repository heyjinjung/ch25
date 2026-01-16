import sys
import os
import random
from datetime import datetime

# Add project root to sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.session import SessionLocal
from app.services.lottery_service import LotteryService
from app.services.exchange_service import ExchangeService
from app.services.game_wallet_service import GameWalletService
from app.models.game_wallet import GameTokenType, UserGameWallet
from app.models.user import User
from app.models.lottery import LotteryPrize

def verify_full_stack():
    db = SessionLocal()
    lottery_svc = LotteryService()
    exchange_svc = ExchangeService()
    wallet_svc = GameWalletService()
    
    user_id = 998899 # New Test User
    
    print("\n=== 🧪 Starting Full Stack Verification (C1/C2 Split) ===\n")

    # 1. [ADMIN ACTION] Setup User & Seed Assets
    print("1. [ADMIN] Seeding User and Assets...")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        user = User(id=user_id, external_id="test_full_stack")
        db.add(user)
        db.commit()
    
    
    # Reset Puzzle Wallets (Delete existing)
    for token in [GameTokenType.PUZZLE_C1, GameTokenType.PUZZLE_C2, GameTokenType.PUZZLE_J, GameTokenType.PUZZLE_M, GameTokenType.GOLD_KEY]:
        existing = db.query(UserGameWallet).filter_by(user_id=user_id, token_type=token).all()
        for w in existing:
            db.delete(w)
    db.commit()


    # Grant 1 of each for crafting
    wallet_svc.grant_tokens(db, user_id, GameTokenType.PUZZLE_C1, 1, "SEED_TEST")
    wallet_svc.grant_tokens(db, user_id, GameTokenType.PUZZLE_C2, 1, "SEED_TEST")
    wallet_svc.grant_tokens(db, user_id, GameTokenType.PUZZLE_J, 1, "SEED_TEST")
    wallet_svc.grant_tokens(db, user_id, GameTokenType.PUZZLE_M, 1, "SEED_TEST")
    
    print("   ✅ Assets Seeded: C1=1, C2=1, J=1, M=1")

    # 2. [USER ACTION] Check Status (Frontend Simulation)
    print("\n2. [USER] Checking Lottery Status...")
    status = lottery_svc.get_status(db, user_id, datetime.utcnow().date())
    col = status.collection_progress
    print(f"   📊 Collection Progress: {col}")
    
    if col.get("C1") == 1 and col.get("C2") == 1 and col.get("J") == 1 and col.get("M") == 1:
        print("   ✅ Status Verified: API returns correct balances.")
    else:
        print(f"   ❌ Status Mismatch! Expected 1 each. Got {col}")
        return

    # 3. [GAME ACTION] Craft Gold Key (Exchange)
    print("\n3. [GAME] Attempting Exchange (C1+C2+J+M -> Gold Key)...")
    try:
        result = exchange_svc.craft_key(db, user_id, "GOLD_KEY_FROM_PUZZLE")
        print(f"   🎉 Exchange Result: {result}")
        if result["result"] == "OK" and result["reward_token"] == "GOLD_KEY":
             print("   ✅ Exchange Validated.")
        else:
             print("   ❌ Exchange Failed or Unexpected Result.")
             return
    except Exception as e:
        print(f"   ❌ Exchange Exception: {e}")
        return

    # 4. [VAULT/INVENTORY] Check Final Inventory
    print("\n4. [INVENTORY] Verifying Final Balances...")
    c1 = wallet_svc.get_balance(db, user_id, GameTokenType.PUZZLE_C1)
    c2 = wallet_svc.get_balance(db, user_id, GameTokenType.PUZZLE_C2)
    key = wallet_svc.get_balance(db, user_id, GameTokenType.GOLD_KEY)
    
    print(f"   📦 Final: C1={c1}, C2={c2}, GoldKey={key}")
    
    if c1 == 0 and c2 == 0 and key == 1:
        print("   ✅ Inventory Correct: Ingredients consumed, Key granted.")
    else:
        print("   ❌ Inventory Error: Consumed/Granted amounts incorrect.")

    # 5. [CONFIG] Verify Prize Config Exists
    print("\n5. [CONFIG] Verifying Prize Configuration...")
    c1_prize = db.query(LotteryPrize).filter(LotteryPrize.reward_type == "PUZZLE_C1").first()
    c2_prize = db.query(LotteryPrize).filter(LotteryPrize.reward_type == "PUZZLE_C2").first()
    
    if c1_prize and c2_prize:
        print(f"   ✅ Prize Config Found: C1(ID:{c1_prize.id}, W:{c1_prize.weight}), C2(ID:{c2_prize.id}, W:{c2_prize.weight})")
    else:
        print("   ❌ Missing Prize Config for C1 or C2!")

    print("\n=== 🏆 Verification Complete ===")
    db.close()

if __name__ == "__main__":
    verify_full_stack()
