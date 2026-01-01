
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
from app.models.user_segment import UserSegment
from app.models.admin_user_profile import AdminUserProfile

# Import Service Layers (to test logic directly avoiding HTTP routing complexity for now)
from app.services.admin_user_service import AdminUserService
from app.services.user_segment_service import UserSegmentService
from app.services.admin_segment_service import AdminSegmentService

def test_audit_phase1():
    # Setup In-Memory DB
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()

    print("--- Audit Phase 1: User Management Start ---")

    # 1. Setup Data
    print("\n[Setup] Creating Dummy Users and Profiles...")
    user1 = User(id=1, external_id="u1", nickname="UserOne", level=10, last_login_at=datetime.utcnow())
    user2 = User(id=2, external_id="u2", nickname="UserTwo", level=5, last_login_at=datetime.utcnow())
    db.add_all([user1, user2])
    db.commit()

    # Add Profile for User1
    UserSegmentService.upsert_user_profile(db, 1, {"real_name": "Kim One", "memo": "VIP Candidate", "tags": ["whale", "beta"]})
    
    # Add Segment for User2
    db.add(UserSegment(user_id=2, segment="NEWBIE"))
    db.commit()

    # 2. Test Admin Users (List)
    print("\n[1] Testing Admin Users List...")
    users = AdminUserService.list_users(db, q=None)
    print(f"   -> Found {len(users)} users.")
    assert len(users) >= 2
    user_one = next((u for u in users if u.id == 1), None)
    assert user_one is not None
    assert user_one.nickname == "UserOne"
    print("   -> PASSED: Admin Users List")

    # 3. Test CRM Stats
    print("\n[2] Testing CRM Stats...")
    stats = UserSegmentService.get_overall_stats(db)
    # stats might be Pydantic model or dict. The service returns CrmStatsResponse which is Pydantic, 
    # but let's handle it safely if it returns dict in test env or due to serialization.
    # The error showed it's a dict.
    print(f"   -> Total Users: {stats.get('total_users')}")
    print(f"   -> Active Users: {stats.get('active_users')}")
    assert stats.get('total_users') >= 2
    print("   -> PASSED: CRM Stats")

    # 4. Test CRM Profile & Segments
    print("\n[3] Testing CRM Profile & Segment Detail...")
    profile = UserSegmentService.get_user_profile(db, 1)
    print(f"   -> User 1 Profile: Name={profile.real_name}, Tabs={profile.tags}")
    assert profile.real_name == "Kim One"
    assert "whale" in profile.tags
    print("   -> PASSED: CRM Profile Retrieval")

    # 5. Test Admin Segments
    print("\n[4] Testing Admin Segments List...")
    segments = AdminSegmentService.list_segments(db, limit=10)
    print(f"   -> Found {len(segments)} segment entries.")
    # Should find at least User2's NEWBIE segment
    seg_match = next((s for s in segments if s.user_id == 2 and s.segment == "NEWBIE"), None)
    assert seg_match is not None
    print("   -> PASSED: Admin Segments List")

    print("\n--- Audit Phase 1 Completed Successfully ---")

if __name__ == "__main__":
    test_audit_phase1()
