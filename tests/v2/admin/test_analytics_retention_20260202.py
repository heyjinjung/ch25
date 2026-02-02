import pytest
from datetime import datetime, timedelta, date
from app.v2.api.admin.analytics_routes import get_retention_trend
from app.v2.models.user import V2User
from sqlalchemy.orm import Session

# Mock admin info
ADMIN_INFO = (1, "admin")

@pytest.fixture
def mock_retention_data(db: Session):
    """
    Creates test users to verify retention trend:
    - User A: Joined 3 days ago (Should show in trend)
    - User B: Joined 1 day ago (Yesterday) (Should show in trend)
    - User C: Joined today (Should NOT show in trend)
    """
    today = datetime.now().date()
    
    # 3 days ago
    user_3d = V2User(
        nickname="User3D",
        cc_id="TEST_CC_01",
        role="USER",
        status="ACTIVE",
        created_at=datetime.combine(today - timedelta(days=3), datetime.min.time()),
        last_login_at=datetime.now()
    )
    
    # 1 day ago (Yesterday)
    user_1d = V2User(
        nickname="User1D",
        cc_id="TEST_CC_02",
        role="USER", 
        status="ACTIVE",
        created_at=datetime.combine(today - timedelta(days=1), datetime.min.time()),
        last_login_at=datetime.now()
    )
    
    # Today
    user_today = V2User(
        nickname="UserToday",
        cc_id="TEST_CC_03",
        role="USER",
        status="ACTIVE",
        created_at=datetime.combine(today, datetime.min.time()),
        last_login_at=datetime.now()
    )

    db.add_all([user_3d, user_1d, user_today])
    db.commit()
    
    return [user_3d, user_1d, user_today]

def test_retention_trend_daterange(db: Session, mock_retention_data):
    """
    Verify that retention trend includes 'yesterday' but excludes 'today'.
    """
    # Act
    # Using a small range to keep it focused
    response = get_retention_trend(days=7, db=db, admin_info=ADMIN_INFO)
    
    trend_list = response.trend
    
    # Assert
    assert len(trend_list) > 0
    
    dates = [t.date for t in trend_list]
    today_str = datetime.now().date().isoformat()
    yesterday_str = (datetime.now().date() - timedelta(days=1)).isoformat()
    
    print(f"Trend Dates: {dates}")
    
    # 1. 'Yesterday' must be in the list
    assert yesterday_str in dates, "Trend should include yesterday's data"
    
    # 2. 'Today' must NOT be in the list (as per logic period_end = today - 1)
    assert today_str not in dates, "Trend should NOT include today's data (too early to calculate)"
    
    # Check Yesterday's Data
    yesterday_data = next(d for d in trend_list if d.date == yesterday_str)
    assert yesterday_data.new_users >= 1, "Should detect at least 1 new user from yesterday"

def test_retention_trend_calculation(db: Session, mock_retention_data):
    """
    Verify that recent dates show 0.0 for D30 (Pending state).
    """
    response = get_retention_trend(days=7, db=db, admin_info=ADMIN_INFO)
    trend_list = response.trend
    
    yesterday_str = (datetime.now().date() - timedelta(days=1)).isoformat()
    yesterday_data = next(d for d in trend_list if d.date == yesterday_str)
    
    # Yesterday's users cannot have reached D7 or D30 yet
    assert yesterday_data.d7_rate == 0.0
    assert yesterday_data.d30_rate == 0.0
