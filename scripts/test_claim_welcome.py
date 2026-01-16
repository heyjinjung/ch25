"""
Test script to call /api/new-user/claim-welcome endpoint directly
and identify the exact error being returned.
"""
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.session import SessionLocal
from app.models.user import User
from app.api.routes.new_user_onboarding import claim_welcome

def test_claim_welcome():
    db = SessionLocal()
    try:
        # Find test user (test-user-001 from seed_test_data.py)
        user = db.query(User).filter(User.external_id == "test-user-001").first()
        
        if not user:
            print("❌ Test user not found. Run: python scripts/seed_test_data.py")
            return
        
        print(f"✅ Testing with user: {user.external_id} (ID: {user.id})")
        print(f"   Created: {user.created_at}")
        print(f"   First Login: {user.first_login_at}")
        print()
        
        # Call the claim_welcome endpoint directly
        print("🔄 Calling claim_welcome()...")
        try:
            result = claim_welcome(db=db, user_id=user.id)
            print()
            print("=" * 60)
            print("RESPONSE:")
            print(f"  Success: {result.success}")
            print(f"  Reason: {result.reason}")
            print(f"  Rewards Count: {len(result.rewards)}")
            if result.rewards:
                print("  Rewards:")
                for r in result.rewards:
                    print(f"    - {r['logic_key']}: {r['reward_type']} x{r['amount']}")
            else:
                print("  Rewards: (empty)")
            print("=" * 60)
            
        except Exception as e:
            print()
            print("=" * 60)
            print(f"❌ EXCEPTION CAUGHT:")
            print(f"   Type: {type(e).__name__}")
            print(f"   Message: {str(e)}")
            print("=" * 60)
            import traceback
            traceback.print_exc()
            
    finally:
        db.close()

if __name__ == "__main__":
    test_claim_welcome()
