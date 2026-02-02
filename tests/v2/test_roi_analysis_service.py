
import pytest
from unittest.mock import MagicMock
from datetime import datetime
from app.v2.services.roi_analysis_service import V2RoiAnalysisService
from app.v2.models.v2_retention_roi_log import V2RetentionRoiLog

@pytest.fixture
def mock_db():
    return MagicMock()

def test_analyze_campaign_roi_logic(mock_db):
    # 1. Setup Mock Data (Rows returned by query)
    # Using a namedtuple or simple object to mimic SQLAlchemy result row
    from collections import namedtuple
    Row = namedtuple('Row', ['event_type', 'user_count', 'avg_roi', 'total_cost', 'total_return'])
    
    # Mock Query Results
    # Campaign A: User Count 2, Cost 300, Return 500, ROI 75%
    row_a = Row(event_type="CAMPAIGN_A", user_count=2, avg_roi=75.0, total_cost=300.0, total_return=500.0)
    # Campaign B: User Count 1, Cost 100, Return 50, ROI -50%
    row_b = Row(event_type="CAMPAIGN_B", user_count=1, avg_roi=-50.0, total_cost=100.0, total_return=50.0)
    
    mock_query = mock_db.query.return_value
    mock_query.group_by.return_value.filter.return_value.order_by.return_value.limit.return_value.all.return_value = [row_a, row_b]
    
    # Also handle the chain without filter if no dates provided
    mock_query.group_by.return_value.order_by.return_value.limit.return_value.all.return_value = [row_a, row_b]

    # 2. Execute Service
    results = V2RoiAnalysisService.get_top_roi_campaigns(mock_db, limit=10)
    
    # 3. Verify
    assert len(results) == 2
    
    res_a = results[0]
    assert res_a["event_type"] == "CAMPAIGN_A"
    assert res_a["user_count"] == 2
    assert res_a["avg_roi"] == 75.0
    assert res_a["total_cost"] == 300.0
    assert res_a["total_return"] == 500.0
    
    res_b = results[1]
    assert res_b["event_type"] == "CAMPAIGN_B"
    assert res_b["avg_roi"] == -50.0

def test_analyze_campaign_roi_empty(mock_db):
    # Mock empty result
    mock_query = mock_db.query.return_value
    mock_query.group_by.return_value.order_by.return_value.limit.return_value.all.return_value = []
    
    results = V2RoiAnalysisService.get_top_roi_campaigns(mock_db, limit=10)
    
    assert len(results) == 0
