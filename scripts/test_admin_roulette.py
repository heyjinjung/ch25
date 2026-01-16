import sys
import os
from sqlalchemy.orm import Session

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.session import SessionLocal
from app.services.admin_roulette_service import AdminRouletteService
from app.schemas.admin_roulette import AdminRouletteConfigCreate, AdminRouletteConfigUpdate

def test_admin_roulette_grade():
    print(">>> Testing Admin Roulette Grade Feature...")
    db = SessionLocal()
    
    try:
        # 1. Create a Test Config with Grade
        print("  1. Creating Config with grade='WHALE'...")
        create_data = AdminRouletteConfigCreate(
            name="Test Whale Config",
            ticket_type="ROULETTE_COIN",
            is_active=False,
            max_daily_spins=10,
            grade="WHALE",
            segments=[] # Will be auto-padded
        )
        config = AdminRouletteService.create_config(db, create_data)
        print(f"    [CREATED] ID: {config.id}, Name: {config.name}, Grade: {config.grade}")
        assert config.grade == "WHALE", f"Expected WHALE, got {config.grade}"

        # 2. Update Config Grade
        print("  2. Updating to grade='NEW'...")
        update_data = AdminRouletteConfigUpdate(grade="NEW")
        updated_config = AdminRouletteService.update_config(db, config.id, update_data)
        print(f"    [UPDATED] ID: {updated_config.id}, Grade: {updated_config.grade}")
        assert updated_config.grade == "NEW", f"Expected NEW, got {updated_config.grade}"
        
        # 3. List Configs
        print("  3. Listing Configs...")
        configs = AdminRouletteService.list_configs(db)
        found = False
        for c in configs:
            if c.id == config.id:
                print(f"    - Found Config #{c.id}: Grade={c.grade}")
                found = True
                assert c.grade == "NEW"
        
        if not found:
            print("!!! Config not found in list")
            raise Exception("Config not found")

        # Cleanup
        print("  4. Cleaning up...")
        AdminRouletteService.delete_config(db, config.id)
        print("    [DELETED] Config")
        
        print(">>> Admin Tests Passed!")

    except Exception as e:
        print(f"!!! TEST FAILED: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    test_admin_roulette_grade()
