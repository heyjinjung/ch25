
import sys
import os
from pathlib import Path
from fastapi import HTTPException

# Add project root to path
sys.path.append(str(Path(__file__).parent.parent))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.db.base_class import Base
from app.models.user import User

# Import the function to test
from app.api.admin.routes.admin_game_tokens import _resolve_user_id

def test_token_resolution():
    # Setup In-Memory DB
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()

    print("--- Token Username Resolution Test Start ---")

    # 1. Setup User
    u1 = User(id=1, external_id="ext1", telegram_username="test_user", status="ACTIVE")
    db.add(u1)
    db.commit()

    # 2. Test Success (Clean Username)
    try:
        uid = _resolve_user_id(db, None, None, "test_user")
        assert uid == 1
        print("   -> [PASS] Resolved 'test_user' -> 1")
    except Exception as e:
        print(f"   -> [FAIL] 'test_user' Error: {e}")

    # 3. Test Success (With @)
    try:
        uid = _resolve_user_id(db, None, None, "@test_user")
        assert uid == 1
        print("   -> [PASS] Resolved '@test_user' -> 1")
    except Exception as e:
        print(f"   -> [FAIL] '@test_user' Error: {e}")

    # 4. Test Fail (Unknown)
    try:
        _resolve_user_id(db, None, None, "unknown_user")
        print("   -> [FAIL] 'unknown_user' should have raised 404")
    except HTTPException as e:
        if e.status_code == 404:
            print("   -> [PASS] 'unknown_user' raised 404 as expected")
        else:
            print(f"   -> [FAIL] 'unknown_user' raised wrong status: {e.status_code}")
    except Exception as e:
        print(f"   -> [FAIL] 'unknown_user' raised wrong exception: {type(e)}")

    print("--- Token Username Resolution Test Complete ---")

if __name__ == "__main__":
    test_token_resolution()
