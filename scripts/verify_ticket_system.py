import sys
import os
from datetime import datetime

# Add project root to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.base_class import Base
from app.services.game_wallet_service import GameWalletService
from app.models.user import User
from app.models.game_wallet import GameTokenType, UserGameWallet
from app.models.game_wallet_ledger import UserGameWalletLedger
from fastapi import HTTPException
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
    svc = GameWalletService()
    
    # Setup Test User
    user_id = 777777
    db.query(UserGameWalletLedger).filter(UserGameWalletLedger.user_id == user_id).delete()
    db.query(UserGameWallet).filter(UserGameWallet.user_id == user_id).delete()
    db.query(User).filter(User.id == user_id).delete()
    db.commit()

    user = User(id=user_id, external_id="test_ticket_flow")
    db.add(user)
    db.commit()
    print(f"User Created: {user_id}")

    # 1. Grant Tickets (DICE_TOKEN)
    print("\n[Test 1] Grant 10 DICE_TOKEN")
    svc.grant_tokens(db, user_id, GameTokenType.DICE_TOKEN, 10, reason="TEST_GRANT")
    
    bal = svc.get_balance(db, user_id, GameTokenType.DICE_TOKEN)
    print(f"Balance: {bal}")
    if bal == 10:
        print("✅ Grant Success")
    else:
        print(f"❌ Grant Failed (Expected 10, Got {bal})")

    # 2. Consume Logic
    print("\n[Test 2] Consume 1 DICE_TOKEN")
    try:
        new_bal, used_trial = svc.require_and_consume_token(db, user_id, GameTokenType.DICE_TOKEN, 1)
        print(f"Consumed. New Balance: {new_bal}")
        if new_bal == 9:
            print("✅ Consume Success")
        else:
            print(f"❌ Consume Failed (Expected 9, Got {new_bal})")
    except Exception as e:
        print(f"❌ Consume Error: {e}")

    # 3. Ledger Check
    print("\n[Test 3] Ledger Verification")
    ledgers = db.query(UserGameWalletLedger).filter(
        UserGameWalletLedger.user_id == user_id
    ).order_by(UserGameWalletLedger.id.asc()).all()
    
    for l in ledgers:
        print(f"- [{l.reason}] Delta: {l.delta}, After: {l.balance_after}")

    if len(ledgers) >= 2:
        print("✅ Ledger Entries Verified")
    else:
        print("❌ Ledger Missing")

    db.close()

if __name__ == "__main__":
    verify()
