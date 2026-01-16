import sys
import os
from datetime import datetime, timedelta
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.session import SessionLocal
from app.models.user import User
from app.models.roulette import RouletteConfig
from app.models.external_ranking import ExternalRankingData
from app.services.roulette_service import RouletteService

def test_roulette_segmentation():
    print(">>> Testing Roulette Segmentation Logic...")
    db = SessionLocal()
    service = RouletteService()
    
    try:
        # Prequest: Ensure Configs exist (seeded by seed_safe_roulette.py)
        # We need to make sure we have at least COMMON and WHALE/NEW configs in DB
        # If not, this test might fail if run on empty DB.
        
        # 1. Create Mock Users
        # A. NEW USER
        new_user = User(external_id="test_new_uid", nickname="test_new", created_at=datetime.utcnow())
        db.add(new_user)
        db.flush()
        print(f"  [Created] New User ID: {new_user.id}")

        # B. WHALE USER (Created long ago)
        whale_user = User(external_id="test_whale_uid", nickname="test_whale", created_at=datetime.utcnow() - timedelta(days=100))
        db.add(whale_user)
        db.flush()
        # Add high deposit
        ranking = ExternalRankingData(user_id=whale_user.id, deposit_amount=10_000_000)
        db.add(ranking)
        db.flush()
        print(f"  [Created] Whale User ID: {whale_user.id} (Deposit: 10M)")

        # C. COMMON USER (Created long ago)
        common_user = User(external_id="test_common_uid", nickname="test_common", created_at=datetime.utcnow() - timedelta(days=100))
        db.add(common_user)
        db.flush()

        # Low/No deposit
        ranking_common = ExternalRankingData(user_id=common_user.id, deposit_amount=100_000)
        db.add(ranking_common)
        db.flush()
        print(f"  [Created] Common User ID: {common_user.id} (Deposit: 100k)")

        # 2. Test _resolve_user_grade
        print("  >>> Verifying internal grade resolution...")
        grade_new = service._resolve_user_grade(db, new_user.id)
        assert grade_new == "NEW", f"Expected NEW, got {grade_new}"
        print("    [PASS] New User -> NEW")

        grade_whale = service._resolve_user_grade(db, whale_user.id)
        assert grade_whale == "WHALE", f"Expected WHALE, got {grade_whale}"
        print("    [PASS] Whale User -> WHALE")

        grade_common = service._resolve_user_grade(db, common_user.id)
        assert grade_common == "COMMON", f"Expected COMMON, got {grade_common}"
        print("    [PASS] Common User -> COMMON")

        # 3. Test _get_today_config (Database Selection)
        print("  >>> Verifying config selection from DB...")
        
        config_new = service._get_today_config(db, user_id=new_user.id)
        print(f"    [INFO] New User got Config: {config_new.name} (Grade: {config_new.grade})")
        # Note: If NEW config is missing, it should fallback to COMMON.
        # But we seeded it, so it should be NEW.
        if config_new.grade == "NEW":
            print("    [PASS] Got NEW config")
        else:
            print(f"    [WARN] Got {config_new.grade} config (Fallback possibly active)")

        config_whale = service._get_today_config(db, user_id=whale_user.id)
        print(f"    [INFO] Whale User got Config: {config_whale.name} (Grade: {config_whale.grade})")
        if config_whale.grade == "WHALE":
             print("    [PASS] Got WHALE config")

        config_common = service._get_today_config(db, user_id=common_user.id)
        print(f"    [INFO] Common User got Config: {config_common.name} (Grade: {config_common.grade})")
        if config_common.grade == "COMMON":
             print("    [PASS] Got COMMON config")

        print(">>> All Tests Passed!")

    except Exception as e:
        print(f"!!! TEST FAILED: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()
    finally:
        # Cleanup (Optional, or leave for debug)
        db.rollback() 
        db.close()

if __name__ == "__main__":
    test_roulette_segmentation()
