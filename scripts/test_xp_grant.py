
import sys
import os

sys.path.append(os.getcwd())

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.core.config import get_settings
from app.models.user import User
from app.services.season_pass_service import SeasonPassService
from app.models.season_pass import SeasonPassProgress

def test_xp_grant():
    db = sessionmaker(bind=create_engine(get_settings().database_url))()
    # Test on a specific user (or create a temp one, but let's use 67 for continuity)
    user_id = 67
    user = db.query(User).filter(User.id == user_id).first()
    
    if not user:
        print(f"User {user_id} not found.")
        return

    print(f"--- Before Test ---")
    initial_xp = user.xp
    print(f"User XP: {initial_xp}")
    
    svc = SeasonPassService()
    grant_amount = 10
    
    print(f"--- Action: Granting {grant_amount} XP ---")
    try:
        result = svc.add_bonus_xp(db, user_id=user.id, xp_amount=grant_amount)
        # Simplify output to avoid encoding issues
        print(f"Service returned: {result.get('added_xp')}")
    except Exception as e:
        print(f"Error calling add_bonus_xp: {e}")
        return

    # Refresh user to get DB update
    db.expire(user)
    db.refresh(user)
    
    print(f"--- After Test ---")
    final_xp = user.xp
    print(f"User XP: {final_xp}")
    
    delta = final_xp - initial_xp
    print(f"XP Delta: {delta}")
    
    if delta == grant_amount:
        print("RESULT: OK (Single Grant Verified)")
    elif delta == grant_amount * 2:
        print("RESULT: FAIL (Double Grant Detected)")
    else:
        print(f"RESULT: UNEXPECTED (Delta {delta} != {grant_amount})")

if __name__ == "__main__":
    test_xp_grant()
