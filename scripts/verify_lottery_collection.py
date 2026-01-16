import sys
import os
import random
from datetime import datetime

# Add project root to sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.session import SessionLocal
from app.services.lottery_service import LotteryService
from app.models.game_wallet import GameTokenType, UserGameWallet
from app.models.user import User

def verify_lottery_collection():
    db = SessionLocal()
    svc = LotteryService()
    user_id = 778877 # Re-use test user

    print("=== Verifying Lottery Collection (Backend) ===")
    
    # 1. Ensure User & Tickets
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        user = User(id=user_id, external_id="test_lottery_collection")
        db.add(user)
        db.commit()
    
    # Grant enough tickets to find a puzzle
    wallet = db.query(UserGameWallet).filter(
        UserGameWallet.user_id == user_id, 
        UserGameWallet.token_type == GameTokenType.LOTTERY_TICKET
    ).first()
    
    if not wallet:
         wallet = UserGameWallet(user_id=user_id, token_type=GameTokenType.LOTTERY_TICKET, balance=1000)
         db.add(wallet)
    else:
         wallet.balance += 1000
    db.commit()

    print(f"[INFO] User {user_id} has {wallet.balance} tickets.")

    # 2. Play until we find a PUZZLE piece
    found = False
    max_tries = 100
    
    for i in range(max_tries):
        try:
            res = svc.play(db, user_id, datetime.utcnow())
            
            # Print minimal log
            # print(f"Try {i+1}: {res.prize.label} ({res.prize.reward_type})")
            
            if "PUZZLE_" in res.prize.reward_type:
                print(f"\n[SUCCESS] Found Puzzle Piece at try {i+1}!")
                print(f"  - Label: {res.prize.label}")
                print(f"  - Reward Type: {res.prize.reward_type}")
                print(f"  - Game Data: {res.game_data}")
                
                # Verify game_data structure
                if res.game_data and "collection_piece" in res.game_data:
                    piece = res.game_data["collection_piece"]
                    print(f"  - Collection Piece extracted: {piece}")
                    found = True
                    break
                else:
                    print(f"  [ERROR] game_data.collection_piece is missing!")
                    break

        except Exception as e:
            print(f"[ERROR] Play failed: {e}")
            break
            
    if found:
        print("\n✅ Verification Passed: Puzzle pieces are droppable and API response is correct.")
    else:
        print(f"\n❌ Verification Failed: Could not find any puzzle piece in {max_tries} tries.")

    db.close()

if __name__ == "__main__":
    verify_lottery_collection()
