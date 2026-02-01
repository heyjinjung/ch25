"""Tests for CSV import functionality."""
from __future__ import annotations

import csv
import tempfile
from pathlib import Path

import pytest
from pydantic import ValidationError

from app.v2.schemas.v2_csv_import import (
    CSVGameResult,
    CSVGameType,
    CSVImportRequest,
    ExternalCasinoGameLogCSV,
)


class TestExternalCasinoGameLogCSV:
    """Test CSV schema validation."""

    def test_valid_record(self):
        """Test valid CSV record parsing."""
        record = ExternalCasinoGameLogCSV(
            timestamp="2026-01-20T10:00:00Z",
            user_id=1,
            game_type=CSVGameType.DICE,
            result=CSVGameResult.WIN,
            bet_amount=100,
            payout_amount=200,
            balance_after=5100,
        )

        assert record.user_id == 1
        assert record.game_type == CSVGameType.DICE
        assert record.result == CSVGameResult.WIN
        assert record.bet_amount == 100
        assert record.payout_amount == 200
        assert record.balance_after == 5100

    def test_lose_result_requires_zero_payout(self):
        """Test that LOSE results must have zero payout."""
        with pytest.raises(ValueError) as exc_info:
            ExternalCasinoGameLogCSV(
                timestamp="2025-01-20T10:00:00Z",  # Past date
                user_id=1,
                game_type=CSVGameType.DICE,
                result=CSVGameResult.LOSE,
                bet_amount=100,
                payout_amount=50,  # Invalid: LOSE should have 0 payout
                balance_after=4950,
            )

        assert "Payout must be 0 for LOSE result" in str(exc_info.value)

    def test_win_result_requires_payout_exceeds_bet(self):
        """Test that WIN results must have payout > bet."""
        with pytest.raises(ValueError) as exc_info:
            ExternalCasinoGameLogCSV(
                timestamp="2025-01-20T10:00:00Z",  # Past date
                user_id=1,
                game_type=CSVGameType.DICE,
                result=CSVGameResult.WIN,
                bet_amount=100,
                payout_amount=50,  # Invalid: WIN payout should exceed bet
                balance_after=4950,
            )

        assert "Payout must exceed bet amount for WIN result" in str(exc_info.value)

    def test_negative_amounts_not_allowed(self):
        """Test that negative amounts are rejected."""
        with pytest.raises(ValidationError):
            ExternalCasinoGameLogCSV(
                timestamp="2025-01-20T10:00:00Z",  # Past date
                user_id=1,
                game_type=CSVGameType.DICE,
                result=CSVGameResult.LOSE,
                bet_amount=-100,  # Invalid: negative bet
                payout_amount=0,
                balance_after=5000,
            )


class TestCSVImportService:
    """Test CSV import service."""

    def create_test_csv(self, rows: list[dict]) -> Path:
        """Create a temporary CSV file for testing."""
        tmp = tempfile.NamedTemporaryFile(mode="w", delete=False, suffix=".csv", encoding="utf-8", newline="")
        writer = csv.DictWriter(
            tmp,
            fieldnames=[
                "timestamp",
                "user_id",
                "external_user_id",
                "game_type",
                "result",
                "bet_amount",
                "payout_amount",
                "balance_after",
                "session_id",
                "game_metadata",
            ],
        )
        writer.writeheader()
        writer.writerows(rows)
        tmp.flush()
        tmp.close()

        return Path(tmp.name)

    def test_valid_csv_file(self, db_session):
        """Test validation of valid CSV file."""
        from app.v2.services.csv_import_service import CSVImportService

        rows = [
            {
                "timestamp": "2025-01-20T10:00:00Z",  # Past date
                "user_id": "1",
                "external_user_id": "ext_001",
                "game_type": "DICE",
                "result": "WIN",
                "bet_amount": "100",
                "payout_amount": "200",
                "balance_after": "5100",
                "session_id": "sess_001",
                "game_metadata": '{"dice_value": 6}',
            }
        ]

        csv_path = self.create_test_csv(rows)

        try:
            service = CSVImportService(db_session)
            is_valid, error_msg = service.validate_csv_file(str(csv_path))

            assert is_valid, f"Validation failed: {error_msg}"
            assert error_msg == "CSV file is valid"

        finally:
            csv_path.unlink()

    def test_missing_required_columns(self, db_session):
        """Test validation fails with missing columns."""
        from app.v2.services.csv_import_service import CSVImportService

        # Create CSV with missing columns
        tmp = tempfile.NamedTemporaryFile(mode="w", delete=False, suffix=".csv", encoding="utf-8")
        writer = csv.DictWriter(tmp, fieldnames=["timestamp", "user_id"])  # Missing required fields
        writer.writeheader()
        writer.writerow({"timestamp": "2026-01-20T10:00:00Z", "user_id": "1"})
        tmp.close()
        csv_path = Path(tmp.name)

        try:
            service = CSVImportService(db_session)
            is_valid, error_msg = service.validate_csv_file(str(csv_path))

            assert not is_valid
            assert "Missing required columns" in error_msg

        finally:
            csv_path.unlink()

    def test_korean_header_localization(self, db_session):
        """Test validation of CSV file with Korean (localized) headers."""
        from app.v2.services.csv_import_service import CSVImportService

        # Row with Korean headers
        rows = [
            {
                "기록 일시": "2025-01-20T10:00:00Z",
                "유저 ID": "1",
                "게임 종류": "ROULETTE",
                "결과": "WIN",
                "배팅 금액": "500",
                "지급 금액": "1000",
                "최종 잔액": "10500",
            }
        ]

        # Use DictWriter but with Korean fieldnames
        tmp = tempfile.NamedTemporaryFile(mode="w", delete=False, suffix=".csv", encoding="utf-8", newline="")
        writer = csv.DictWriter(
            tmp,
            fieldnames=["기록 일시", "유저 ID", "게임 종류", "결과", "배팅 금액", "지급 금액", "최종 잔액"],
        )
        writer.writeheader()
        writer.writerows(rows)
        tmp.flush()
        tmp.close()
        csv_path = Path(tmp.name)

        try:
            service = CSVImportService(db_session)
            is_valid, error_msg = service.validate_csv_file(str(csv_path))

            assert is_valid, f"Validation failed for Korean headers: {error_msg}"
            assert error_msg == "CSV file is valid"

        finally:
            csv_path.unlink()

    def test_estimate_import_time(self, db_session):
        """Test import time estimation."""
        from app.v2.services.csv_import_service import CSVImportService

        # Create exactly 250 data rows
        num_rows = 250
        rows = [
            {
                "timestamp": "2025-01-20T10:00:00Z",  # Past date
                "user_id": "1",
                "external_user_id": "ext_001",
                "game_type": "DICE",
                "result": "LOSE",
                "bet_amount": "100",
                "payout_amount": "0",
                "balance_after": "5000",
                "session_id": "sess_001",
                "game_metadata": "",
            }
            for _ in range(num_rows)
        ]

        csv_path = self.create_test_csv(rows)

        try:
            service = CSVImportService(db_session)
            estimate = service.estimate_import_time(str(csv_path))

            # Check that the row count is correct (should be 250, excluding header)
            assert estimate["total_rows"] == num_rows, f"Expected {num_rows} rows, got {estimate['total_rows']}"
            assert estimate["estimated_seconds"] > 0
            assert estimate["estimated_minutes"] >= 0  # For small files, minutes can be 0

        finally:
            csv_path.unlink()


@pytest.fixture
def db_session():
    """Mock database session for testing."""
    from unittest.mock import MagicMock

    return MagicMock()
