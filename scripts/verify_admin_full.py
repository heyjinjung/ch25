
import sys
import os
from pathlib import Path
from datetime import datetime

# Add project root to path
sys.path.append(str(Path(__file__).parent.parent))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.db.base_class import Base
from app.models.user import User
from app.models.team_battle import Team
from app.models.season_pass import SeasonPassConfig
from app.api.admin.routes.admin_users import list_users
from app.api.admin.routes.admin_team_battle import list_seasons as list_team_seasons
from app.api.admin.routes.admin_seasons import list_seasons as list_pass_seasons
from app.api.admin.routes.admin_dashboard import get_dashboard_metrics

def test_admin_full_inspection():
    # Setup In-Memory DB
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()

    print("--- Admin Full Inspection Start ---")

    # 1. Admin Users
    print("\n[1] Checking Admin Users API...")
    # Create dummy users
    db.add(User(id=1, external_id="user1", nickname="Alpha"))
    db.add(User(id=2, external_id="user2", nickname="Beta"))
    db.commit()
    
    users = list_users(db=db, q=None)
    print(f"   -> Found {len(users)} users.")
    assert len(users) >= 2
    print("   -> PASSED: User list retrieval.")

    # 2. Admin Team Battle (Seasons)
    print("\n[2] Checking Admin Team Battle API...")
    try:
        # Team seasons check
        seasons = list_team_seasons(db=db, limit=10)
        print(f"   -> Team seasons found: {len(seasons)}")
        print("   -> PASSED: Team Battle seasons retrieval.")
    except Exception as e:
        print(f"   -> FAILED: {e}")

    # 3. Admin Season Pass
    print("\n[3] Checking Admin Season Pass API...")
    # Create dummy season
    db.add(SeasonPassConfig(
        season_name="Test Season",
        start_date=datetime(2025, 1, 1).date(),
        end_date=datetime(2025, 12, 31).date(),
        max_level=10,
        base_xp_per_stamp=10
    ))
    db.commit()

    try:
        seasons = list_pass_seasons(db=db)
        print(f"   -> Found {len(seasons.items)} seasons.")
        print("   -> PASSED: Season list retrieval.")
    except Exception as e:
        print(f"   -> FAILED: {e}")

    # 4. Admin Dashboard
    print("\n[4] Checking Admin Dashboard Stats...")
    try:
        stats = get_dashboard_metrics(db=db, range_hours=24)
        print(f"   -> Stats generated_at: {stats.generated_at}")
        print("   -> PASSED: Dashboard stats retrieval.")
    except Exception as e:
        print(f"   -> FAILED: {e}")

    print("\n--- all Admin Tests Completed ---")

def keys_or_str(obj):
    if hasattr(obj, "dict"):
        return list(obj.dict().keys())
    if isinstance(obj, dict):
        return list(obj.keys())
    return str(obj)

if __name__ == "__main__":
    test_admin_full_inspection()
