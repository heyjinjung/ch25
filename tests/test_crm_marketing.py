from sqlalchemy.orm import Session

from app.services.user_segment_service import UserSegmentService


def test_user_segment_service_get_overall_stats(session_factory):
    db: Session = session_factory()

    stats = UserSegmentService.get_overall_stats(db)

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
