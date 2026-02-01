"""
Tests for HQ Margin Integration (Phase 1-4).
"""
import pytest
import csv
import tempfile
from pathlib import Path
from unittest.mock import MagicMock, patch
from datetime import datetime, timedelta

from app.v2.services.hq_margin_import_service import HQMarginImportService
from app.v2.services.hq_margin_stats_service import HQMarginStatsService
from app.v2.services.golden_scheduler_service import GoldenSchedulerService
from app.v2.services.segment_service import V2SegmentService
from app.v2.models.user import V2User
from app.v2.models.v2_user_segment import V2UserSegment
from app.v2.models.hq_prospective_user import HQProspectiveUser
from app.models.admin_audit_log import AdminAuditLog
from app.v2.models.v2_golden_intervention_log import V2GoldenInterventionLog

@pytest.fixture
def mock_db():
    return MagicMock()

class TestHQMarginIntegration:
    
    def create_test_csv(self, rows: list[dict]) -> Path:
        """Create a temporary CSV file for testing."""
        tmp = tempfile.NamedTemporaryFile(mode="w", delete=False, suffix=".csv", encoding="utf-8-sig", newline="")
        writer = csv.DictWriter(tmp, fieldnames=rows[0].keys())
        writer.writeheader()
        writer.writerows(rows)
        tmp.close()
        return Path(tmp.name)

    @pytest.mark.asyncio
    async def test_import_hq_margin_csv_success(self, mock_db):
        """Test successful import of HQ Margin CSV."""
        # 1. Prepare Data
        rows = [
            {
                "이름 (아이디)": "user1",
                "닉네임": "Nick1",
                "누적 충전 금액": "5,000,000",
                "총 운영 마진": "1,000,000",
                "미접속 경과일": "2",
                "세그먼트": "VIP"
            },
            {
                "이름 (아이디)": "user2",
                "닉네임": "Nick2", 
                "누적 충전 금액": "100,000",
                "총 운영 마진": "50,000",
                "미접속 경과일": "10",
                "세그먼트": ""  # Should auto-classify as AT_RISK (if margin > 0 & inactive > 7)
            }
        ]
        csv_path = self.create_test_csv(rows)

        # 2. Mock DB Queries
        # user1 exists, user2 does not (prospective)
        mock_user1 = MagicMock(spec=V2User)
        mock_user1.id = 1
        mock_user1.cc_id = "user1"
        mock_user1.nickname = "Nick1"

        # Prepare stable mocks for queries
        user_query_mock = MagicMock()
        user_filter_mock = MagicMock()
        user_query_mock.filter.return_value = user_filter_mock
        # Row 1: V2User found (mock_user1), Row 2: V2User not found (None)
        user_filter_mock.first.side_effect = [mock_user1, None]

        prospect_query_mock = MagicMock()
        prospect_filter_mock = MagicMock()
        prospect_query_mock.filter.return_value = prospect_filter_mock
        # Row 2 Check: No existing prospect (None) -> Create new
        prospect_filter_mock.filter.return_value = prospect_filter_mock # For chained filter if any
        prospect_filter_mock.first.side_effect = [None]

        def query_side_effect(model):
            if model == V2User:
                return user_query_mock
            elif model == HQProspectiveUser:
                return prospect_query_mock
            elif model == V2UserSegment:
                 # Helper for upsert check if needed, though upsert is patched
                 m = MagicMock()
                 m.filter.return_value.first.return_value = None
                 return m
            return MagicMock()

        mock_db.query.side_effect = query_side_effect
        
        # Patch V2SegmentService.upsert_user_segment
        try:
            with patch("app.v2.services.segment_service.V2SegmentService.upsert_user_segment") as mock_upsert:
                mock_upsert.return_value = True

                # 3. Execute
                result = await HQMarginImportService.import_hq_margin_csv(
                    mock_db,
                    str(csv_path),
                    admin_id="admin1"
                )

                # 4. Assertions
                assert result["success"] is True
                # Mock returns None for existing segment, so it should create a new one
                assert result["updated_count"] == 0 
                assert result["created_count"] == 1 
                assert result["prospective_count"] == 1
        finally:
            if csv_path.exists():
                csv_path.unlink()

    def test_hq_margin_stats_computation(self, mock_db):
        """Test aggregation of HQ Margin stats."""
        # Mock counts
        query_mock = MagicMock()
        mock_db.query.return_value = query_mock
        
        # Sequence of scalar() calls: 
        # 1. VIP count
        # 2. WHALE count
        # 3. DORMANT count
        # 4. Prospective VIP count
        query_mock.filter.return_value.scalar.side_effect = [10, 5, 3, 2]
        
        # Last audit log
        mock_audit = MagicMock(spec=AdminAuditLog)
        mock_audit.created_at = datetime(2026, 1, 31, 12, 0, 0)
        query_mock.filter.return_value.order_by.return_value.first.return_value = mock_audit

        stats = HQMarginStatsService.get_hq_margin_stats(mock_db)

        assert stats.vip_count == 10
        assert stats.whale_count == 5
        assert stats.at_risk_count == 3
        assert stats.prospective_vip_count == 2
        assert stats.last_sync_at == datetime(2026, 1, 31, 12, 0, 0)

    def test_golden_scheduler_intervention_trigger(self, mock_db):
        """Test GoldenScheduler triggers intervention logs."""
        # 1. Mock Targets (VIP/WHALE users)
        # db.execute(...).all() returns list of (user_id, segment)
        mock_db.execute.return_value.all.return_value = [
            (1, "VIP"),
            (2, "AT_RISK")
        ]
        
        # 2. Mock existing logs (None found)
        mock_db.execute.return_value.first.return_value = None 

        # 3. Execute
        result = GoldenSchedulerService.run_golden_hour_check(mock_db)

        # 4. Assertions
        assert result["triggered"] == 2
        assert result["skipped"] == 0
        
        # Verify db.add called twice
        assert mock_db.add.call_count == 2
        
        # Extract arguments to verify logic
        calls = mock_db.add.call_args_list
        log1 = calls[0][0][0]
        assert isinstance(log1, V2GoldenInterventionLog)
        assert log1.user_id == 1
        assert log1.trigger_id == "TRG_HQ_ALIGN_VIP"
        assert log1.status == "PENDING_APPROVAL"
        
        log2 = calls[1][0][0]
        assert log2.user_id == 2
        assert log2.trigger_id == "TRG_HQ_ALIGN_AT_RISK"

    def test_match_prospect_on_joined(self, mock_db):
        """Test auto-matching prospective user on join."""
        # 1. Setup
        user = V2User(id=1, cc_id="prospect1", nickname="NewUser")
        
        # Mock Prospect found
        mock_prospect = MagicMock(spec=HQProspectiveUser)
        mock_prospect.segment = "VIP"
        mock_prospect.is_joined = False
        
        query_mock = MagicMock()
        mock_db.query.return_value = query_mock
        query_mock.filter.return_value.filter.return_value.first.return_value = mock_prospect
        
        # Mock UserSegment (none existing)
        mock_db.get.return_value = None

        # 2. Execute
        V2SegmentService.match_prospect_on_joined(mock_db, user)

        # 3. Assertions
        # Should upsert segment
        mock_db.add.assert_called() 
        # Should update prospect.is_joined
        assert mock_prospect.is_joined is True

