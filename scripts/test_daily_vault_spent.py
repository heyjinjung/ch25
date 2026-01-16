"""Test daily vault spent tracking implementation."""
import sys
import os
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.session import SessionLocal
from app.models.user import User
from app.services.vault_service import VaultService

def test_daily_vault_spent():
    db = SessionLocal()
    try:
        # Find test user
        user = db.query(User).filter(User.external_id == "test-user-001").first()
        
        if not user:
            print("❌ Test user not found")
            return
        
        print(f"✅ Testing daily vault spent with user: {user.external_id} (ID: {user.id})")
        print()
        
        # Check current state
        print("=== Current State ===")
        print(f"vault_spent_total: {user.vault_spent_total or 0}")
        print(f"vault_spent_today: {user.vault_spent_today or 0}")
        print(f"vault_spent_reset_date: {user.vault_spent_reset_date}")
        print(f"vault_locked_balance: {user.vault_locked_balance or 0}")
        print()
        
        # Initialize service
        service = VaultService()
        
        # Test 1: Consume some balance
        print("=== Test 1: Consume 5000 KRW ===")
        if user.vault_locked_balance >= 5000:
            try:
                service.consume_locked_balance(db, user.id, 5000, "TEST_CONSUME")
                db.commit()
                db.refresh(user)
                
                print(f"✅ Consumed 5000")
                print(f"   vault_spent_total: {user.vault_spent_total}")
                print(f"   vault_spent_today: {user.vault_spent_today}")
                print(f"   vault_spent_reset_date: {user.vault_spent_reset_date}")
            except Exception as e:
                db.rollback()
                print(f"❌ Error: {e}")
        else:
            print(f"⚠️ Insufficient balance: {user.vault_locked_balance}")
        print()
        
        # Test 2: Verify reset logic with future date
        print("=== Test 2: Simulate next day reset ===")
        now = datetime.utcnow()
        kst = ZoneInfo("Asia/Seoul")
        tomorrow = now + timedelta(days=1)
        
        # Manually trigger reset by changing the internal date check
        service._ensure_daily_vault_spent_reset(user, tomorrow)
        db.add(user)
        db.commit()
        db.refresh(user)
        
        print(f"After simulated reset:")
        print(f"   vault_spent_today: {user.vault_spent_today} (should be 0)")
        print(f"   vault_spent_reset_date: {user.vault_spent_reset_date}")
        print()
        
        # Test 3: Consume again to verify today tracking
        print("=== Test 3: Consume 3000 KRW after reset ===")
        if user.vault_locked_balance >= 3000:
            try:
                service.consume_locked_balance(db, user.id, 3000, "TEST_CONSUME_2")
                db.commit()
                db.refresh(user)
                
                print(f"✅ Consumed 3000")
                print(f"   vault_spent_today: {user.vault_spent_today} (should be 3000)")
                print(f"   vault_spent_total: {user.vault_spent_total} (cumulative)")
            except Exception as e:
                db.rollback()
                print(f"❌ Error: {e}")
        else:
            print(f"⚠️ Insufficient balance: {user.vault_locked_balance}")
        
        print()
        print("=" * 60)
        print("Daily vault spent tracking test complete!")
        print("=" * 60)
        
    finally:
        db.close()

if __name__ == "__main__":
    test_daily_vault_spent()
