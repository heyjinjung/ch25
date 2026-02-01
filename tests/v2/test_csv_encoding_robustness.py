import pytest
import csv
import tempfile
from pathlib import Path
from unittest.mock import MagicMock
from app.v2.services.csv_import_service import CSVImportService
from app.v2.services.hq_margin_import_service import HQMarginImportService

def test_csv_import_encoding_detection_cp949():
    """Test that CSVImportService correctly handles CP949 encoding."""
    # Row with Korean headers and data
    headers = ["기록 일시", "유저 ID", "게임 종류", "결과", "배팅 금액", "지급 금액", "최종 잔액"]
    row = {
        "기록 일시": "2025-02-01T12:00:00Z",
        "유저 ID": "123",
        "게임 종류": "SLOT",
        "결과": "WIN",
        "배팅 금액": "1000",
        "지급 금액": "2000",
        "최종 잔액": "5000",
    }
    
    # Create CP949 encoded CSV
    with tempfile.NamedTemporaryFile(mode="w", delete=False, suffix=".csv", encoding="cp949", newline="") as tmp:
        writer = csv.DictWriter(tmp, fieldnames=headers)
        writer.writeheader()
        writer.writerow(row)
        csv_path = Path(tmp.name)

    try:
        service = CSVImportService(db=MagicMock())
        is_valid, error_msg = service.validate_csv_file(str(csv_path))
        
        assert is_valid, f"Failed to validate CP949 CSV: {error_msg}"
        
        # Test parsing
        rows = service.parse_csv_rows(str(csv_path))
        assert len(rows) == 1
        assert rows[0]["user_id"] == 123
        assert rows[0]["bet_amount"] == 1000
    finally:
        csv_path.unlink()

def test_hq_margin_import_encoding_detection_cp949():
    """Test that HQMarginImportService correctly handles CP949 encoding."""
    headers = ["이름 (아이디)", "닉네임", "총 운영 마진", "미접속 경과일"]
    row = {
        "이름 (아이디)": "user_cp949",
        "닉네임": "한글닉네임",
        "총 운영 마진": "1,500,000",
        "미접속 경과일": "5"
    }
    
    # Create CP949 encoded CSV
    with tempfile.NamedTemporaryFile(mode="w", delete=False, suffix=".csv", encoding="cp949", newline="") as tmp:
        writer = csv.DictWriter(tmp, fieldnames=headers)
        writer.writeheader()
        writer.writerow(row)
        csv_path = Path(tmp.name)

    try:
        # Mock DB and other services
        db = MagicMock()
        # Mocking the query to avoid actual DB access
        db.query.return_value.filter.return_value.first.return_value = None
        
        # import_hq_margin_csv is a class method but we can call it directly
        # However, it expects a db session
        result = HQMarginImportService.import_hq_margin_csv(
            db=db,
            file_path=str(csv_path),
            admin_id="test_admin"
        )
        
        assert result["success"] is True
        # Since user doesn't exist, it should be in prospective_count
        assert result["processed_count"] == 1
    finally:
        csv_path.unlink()

def test_csv_import_encoding_detection_utf8_sig():
    """Test that CSVImportService handles UTF-8-sig (Excel default UTF-8)."""
    headers = ["기록 일시", "유저 ID", "게임 종류", "결과", "배팅 금액", "지급 금액", "최종 잔액"]
    row = {
        "기록 일시": "2025-02-01T12:00:00Z",
        "유저 ID": "456",
        "게임 종류": "DICE",
        "결과": "LOSE",
        "배팅 금액": "500",
        "지급 금액": "0",
        "최종 잔액": "4500",
    }
    
    # Create UTF-8-sig encoded CSV
    with tempfile.NamedTemporaryFile(mode="w", delete=False, suffix=".csv", encoding="utf-8-sig", newline="") as tmp:
        writer = csv.DictWriter(tmp, fieldnames=headers)
        writer.writeheader()
        writer.writerow(row)
        csv_path = Path(tmp.name)

    try:
        service = CSVImportService(db=MagicMock())
        is_valid, error_msg = service.validate_csv_file(str(csv_path))
        
        assert is_valid, f"Failed to validate UTF-8-sig CSV: {error_msg}"
        
        # Test parsing
        rows = service.parse_csv_rows(str(csv_path))
        assert len(rows) == 1
        assert rows[0]["user_id"] == 456
    finally:
        csv_path.unlink()
