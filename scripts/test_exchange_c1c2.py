import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.session import SessionLocal
from app.services.exchange_service import ExchangeService
from app.services.game_wallet_service import GameWalletService
from app.models.game_wallet import GameTokenType

def test_exchange():
    db = SessionLocal()
    exchange_svc = ExchangeService()
    wallet_svc = GameWalletService()
    user_id = 998899
    
    print("\n=== Testing C1+C2+J+M -> GOLD_KEY Exchange ===\n")
    
    # Check before balances
    c1_before = wallet_svc.get_balance(db, user_id, GameTokenType.PUZZLE_C1)
    c2_before = wallet_svc.get_balance(db, user_id, GameTokenType.PUZZLE_C2)
    j_before = wallet_svc.get_balance(db, user_id, GameTokenType.PUZZLE_J)
    m_before = wallet_svc.get_balance(db, user_id, GameTokenType.PUZZLE_M)
    key_before = wallet_svc.get_balance(db, user_id, GameTokenType.GOLD_KEY)
    
    print(f"BEFORE: C1={c1_before}, C2={c2_before}, J={j_before}, M={m_before}, GOLD_KEY={key_before}")
    
    # Execute Exchange
    try:
        result = exchange_svc.craft_key(db, user_id, "GOLD_KEY_FROM_PUZZLE")
        print(f"\n✅ EXCHANGE SUCCESS: {result}")
    except Exception as e:
        print(f"\n❌ EXCHANGE FAILED: {e}")
        db.close()
        return False
    
    # Check after balances
    c1_after = wallet_svc.get_balance(db, user_id, GameTokenType.PUZZLE_C1)
    c2_after = wallet_svc.get_balance(db, user_id, GameTokenType.PUZZLE_C2)
    j_after = wallet_svc.get_balance(db, user_id, GameTokenType.PUZZLE_J)
    m_after = wallet_svc.get_balance(db, user_id, GameTokenType.PUZZLE_M)
    key_after = wallet_svc.get_balance(db, user_id, GameTokenType.GOLD_KEY)
    
    print(f"AFTER:  C1={c1_after}, C2={c2_after}, J={j_after}, M={m_after}, GOLD_KEY={key_after}\n")
    
    # Validate
    if c1_after == c1_before - 1 and c2_after == c2_before - 1 and j_after == j_before - 1 and m_after == m_before - 1 and key_after == key_before + 1:
        print("✅ ALL CHECKS PASSED: Exchange correctly consumed C1, C2, J, M and granted GOLD_KEY\n")
        return True
    else:
        print("❌ VERIFICATION FAILED: Balances don't match expected deltas\n")
        return False
        
    db.close()

if __name__ == "__main__":
    success = test_exchange()
    sys.exit(0 if success else 1)
