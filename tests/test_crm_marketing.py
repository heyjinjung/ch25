
import sys
import os

# Add /app to sys.path just in case
sys.path.append("/app")

try:
    from app.db.session import SessionLocal
    from app.services.user_segment_service import UserSegmentService
    from app.models.user import User
    
    # Initialize DB session
    db = SessionLocal()
    
    print("Testing UserSegmentService.get_overall_stats...")
    stats = UserSegmentService.get_overall_stats(db)
    
    print(f"Stats: {stats}")
    
    # Basic Checks
    assert "total_users" in stats
    assert "active_users" in stats
    assert "paying_users" in stats
    assert "whale_count" in stats
    assert "empty_tank_count" in stats
    
    # Advanced KPIs Checks
    assert "churn_rate" in stats
    assert "ltv" in stats
    assert "arpu" in stats
    assert "new_user_growth" in stats
    assert "segments" in stats
    assert isinstance(stats["segments"], dict)
    
    print("UserSegmentService.get_overall_stats verified successfully with Advanced KPIs.")
    db.close()
    
except Exception as e:
    import traceback
    traceback.print_exc()
    sys.exit(1)
