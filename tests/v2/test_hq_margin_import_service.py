"""
Unit tests for app/v2/services/hq_margin_import_service.py
"""
import pytest
from unittest.mock import MagicMock, patch, mock_open
from app.v2.services.hq_margin_import_service import HQMarginImportService

@pytest.fixture
def mock_db():
    return MagicMock()

class TestHQMarginImportService:
    
    def test_classify_segment(self):
        # 1. Explicit
        assert HQMarginImportService._classify_segment({"세그먼트": "VIP"}) == "VIP"
        assert HQMarginImportService._classify_segment({"세그먼트": " WHALE "}) == "WHALE"
        
        # 2. Winner (Negative Margin)
        assert HQMarginImportService._classify_segment({"총 운영 마진": "-1000", "누적 충전 금액": "0"}) == "WINNER"
        
        # 3. VIP (Margin > 1M)
        assert HQMarginImportService._classify_segment({"총 운영 마진": "1,000,001"}) == "VIP"
        
        # 4. At Risk (Inactive > 7 & Margin > 0)
        assert HQMarginImportService._classify_segment({"총 운영 마진": "100", "미접속 경과일": "8"}) == "AT_RISK"
        
        # 5. Whale (Charge > 5M)
        assert HQMarginImportService._classify_segment({"누적 충전 금액": "5,000,001", "총 운영 마진": "0"}) == "WHALE"
        
        # 6. Common
        assert HQMarginImportService._classify_segment({"총 운영 마진": "0", "누적 충전 금액": "0"}) == "COMMON"

    def test_parse_int(self):
        assert HQMarginImportService._parse_int("1,000") == 1000
        assert HQMarginImportService._parse_int(" - ") == 0
        assert HQMarginImportService._parse_int(None) == 0
        assert HQMarginImportService._parse_int(100) == 100

    @pytest.mark.asyncio
    @patch("pathlib.Path.read_bytes")
    @patch("chardet.detect")
    async def test_import_hq_margin_csv_valid(self, mock_detect, mock_read, mock_db):
        """Test valid CSV import flow."""
        # Mock file content
        csv_content = """이름 (아이디),닉네임,누적 충전 금액,누적 환전 금액,총 운영 마진,미접속 경과일
        test_user,TestNick,100000,0,50000,3
        """.encode("utf-8")
        
        mock_read.return_value = csv_content
        mock_detect.return_value = {"encoding": "utf-8", "confidence": 1.0}
        
        # Mock V2User match: Return (user, "MATCHED")
        mock_user = MagicMock(id=1, cc_id="test_user")
        
        # We need to mock _match_v2_user static method or ensure DB query in it returns mock
        # Let's mock the static method for simplicity in unit test
        with patch.object(HQMarginImportService, "_match_v2_user", return_value=(mock_user, "MATCHED")):
            # Mock V2UserSegment query
            mock_db.query.return_value.filter.return_value.first.return_value = None # No existing segment
            
            result = await HQMarginImportService.import_hq_margin_csv(mock_db, "dummy.csv", "admin_1")
            
            assert result["success"] is True
            assert result["total_rows"] == 1
            assert result["created_count"] == 1 # New segment created

    @patch("pathlib.Path.exists", return_value=True)
    @patch("pathlib.Path.read_bytes")
    @patch("chardet.detect")
    def test_validate_hq_margin_csv_missing_col(self, mock_detect, mock_read, mock_exists):
        """Test validation fails on missing column."""
        csv_content = "이름 (아이디),닉네임".encode("utf-8") # Missing '총 운영 마진' etc.
        mock_read.return_value = csv_content
        mock_detect.return_value = {"encoding": "utf-8", "confidence": 1.0}
        
        valid, msg = HQMarginImportService.validate_hq_margin_csv("dummy.csv")
        assert valid is False
        assert "필수 컬럼 누락" in msg
