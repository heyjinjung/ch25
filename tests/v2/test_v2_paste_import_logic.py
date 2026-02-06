"""
V2 Paste Import Logic Tests
SOT Document: 05_v2_admin_paste_import_deposit_ops_sot_ko.md
"""
import pytest
from datetime import datetime
from app.v2.services.paste_import_service import PasteImportService, ParsedDeposit

class TestPasteImportParsing:
    """
    SOT 05 Section 4: Input Format Parsing
    """

    def test_parse_amount_cleaning(self):
        """Test amount parsing with various artifacts (comma, space, currency symbol)."""
        assert PasteImportService._parse_amount("100,000") == 100000
        assert PasteImportService._parse_amount(" 50000 ") == 50000
        assert PasteImportService._parse_amount("10,000원") == 10000
        assert PasteImportService._parse_amount("₩200,000") == 200000
        assert PasteImportService._parse_amount("-") == 0
        assert PasteImportService._parse_amount("") == 0
        assert PasteImportService._parse_amount(None) == 0

    def test_parse_datetime_formats(self):
        """
        SOT 05 Section 5.1: Supported Datetime Formats
        """
        # "2026/02/04 11:10:09"
        dt1 = PasteImportService._parse_datetime("2026/02/04 11:10:09")
        assert dt1 is not None and dt1.year == 2026 and dt1.second == 9
        
        # "26/02/04 16:00"
        dt2 = PasteImportService._parse_datetime("26/02/04 16:00")
        assert dt2 is not None and dt2.year == 2026 and dt2.hour == 16
        
        # "2026-02-04"
        dt3 = PasteImportService._parse_datetime("2026-02-04")
        assert dt3 is not None and dt3.hour == 0 and dt3.minute == 0

    def test_parse_hq_format_8_cols(self):
        """
        SOT 05 4.1.1: HQ 8~9 columns
        Format: 번호 | 소속 | 이름(ID) | 닉네임 | 신청날짜 | 충전금액 | 입금자 | 충전날짜 | 상태
        """
        raw_text = """
1\tHead\t홍길동(test_id)\tFastTester\t2026-02-07 10:00:00\t50,000\t홍길동\t2026-02-07 10:05:00\t완료
2\tNote\t임꺽정(im)\tPowerUser\t2026-02-07 11:00\t100000\t임꺽정\t2026-02-07 11:00\t완료
        """.strip()
        
        parsed = PasteImportService.parse_daily_deposit(raw_text)
        assert len(parsed) == 2
        
        # Row 1
        assert parsed[0].nickname == "FastTester"
        assert parsed[0].amount == 50000
        assert parsed[0].deposit_at.hour == 10
        assert parsed[0].depositor_name == "홍길동"
        
        # Row 2
        assert parsed[1].nickname == "PowerUser"
        assert parsed[1].amount == 100000

    def test_parse_simple_format_4_cols(self):
        """
        SOT 05 4.1.2: Simple 4 columns
        Format: 네임 | 금액 | 입금일시 | 입금자
        """
        raw_text = """
SimpleUser\t30,000\t2026/02/07 12:00\tSimpleMan
AnotherUser\t10000\t2026/02/07 12:05\tAnotherMan
        """.strip()
        
        parsed = PasteImportService.parse_daily_deposit(raw_text)
        assert len(parsed) == 2
        
        assert parsed[0].nickname == "SimpleUser"
        assert parsed[0].amount == 30000
        assert parsed[0].depositor_name == "SimpleMan"

    def test_skip_header_rows(self):
        raw_text = """
번호\t소속\t이름\t닉네임\t신청날짜\t충전금액\t입금자\t충전날짜
1\tA\tB\tRealUser\t2026-02-07 10:00\t50000\tSelf\t2026-02-07 10:05
        """.strip()
        parsed = PasteImportService.parse_daily_deposit(raw_text)
        assert len(parsed) == 1
        assert parsed[0].nickname == "RealUser"


class TestPasteImportLogicComponents:
    """
    SOT 05 Section 6: Logic (Status, Dedup, Skip)
    Note: Full implementation requires DB mocking, here we test logical units if possible.
    Since `import_daily_deposits` is monolithic, we rely on `test_v2_integrated_level_flow.py` for full DB testing,
    or use `test_csv_deposit_level.py` style integration tests.
    Here we focus on parsing correctness which was the primary gap.
    """
    
    def test_extract_cc_id(self):
        """Test ID extraction logic."""
        cc_id, name = PasteImportService._extract_cc_id("홍길동(test_user)")
        assert cc_id == "test_user"
        assert name == "홍길동"
        
        cc_id2, name2 = PasteImportService._extract_cc_id("김철수")
        assert cc_id2 == "김철수"
