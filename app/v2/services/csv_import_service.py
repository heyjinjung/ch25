"""CSV import service for external casino logs."""
from __future__ import annotations

import csv
import json
import logging
import chardet
from datetime import datetime
from pathlib import Path
from typing import Generator, Optional

from pydantic import ValidationError
from sqlalchemy.orm import Session

from app.v2.schemas.v2_csv_import import (
    CSVImportRequest,
    CSVImportResult,
    ExternalCasinoGameLogCSV,
)
from app.v2.services.csv_to_redis_service import CSVToRedisService
from app.v2.models.user import V2User
from app.v2.models.v2_game_log import V2GameLog

logger = logging.getLogger(__name__)


class CSVParseError(Exception):
    """Raised when CSV parsing fails."""


class CSVImportService:
    """Service for importing external casino logs from CSV."""

    def __init__(self, db: Session, redis_service: Optional[CSVToRedisService] = None):
        self.db = db
        self.redis_service = redis_service or CSVToRedisService()
        self._user_cache: dict[int, bool] = {}  # user_id -> exists

        # Header mapping for localized CSVs (Korean -> English)
        self._header_map = {
            "기록 일시": "timestamp",
            "시간": "timestamp",
            "유저 ID": "user_id",
            "사용자 ID": "user_id",
            "게임 종류": "game_type",
            "게임 타입": "game_type",
            "결과": "result",
            "배팅 금액": "bet_amount",
            "배팅액": "bet_amount",
            "지급 금액": "payout_amount",
            "지급액": "payout_amount",
            "게임 후 잔액": "balance_after",
            "최종 잔액": "balance_after",
            "외부 아이디": "external_user_id",
            "세션 ID": "session_id",
            "기타 정보": "game_metadata",
        }

    def validate_csv_file(self, file_path: str) -> tuple[bool, str]:
        """
        Validate CSV file structure and format.

        Returns:
            Tuple of (is_valid, error_message)
        """
        path = Path(file_path)

        # Check file exists
        if not path.exists():
            return False, f"File not found: {file_path}"

        # Check file extension
        if path.suffix.lower() != ".csv":
            return False, f"Invalid file extension: {path.suffix} (expected .csv)"

        # Check file size (max 100MB)
        max_size = 100 * 1024 * 1024
        file_size = path.stat().st_size
        if file_size > max_size:
            return False, f"File too large: {file_size / 1024 / 1024:.1f}MB (max 100MB)"

        # Check CSV structure
        try:
            # 1. 인코딩 감지
            raw_data = path.read_bytes()
            result = chardet.detect(raw_data)
            encoding = result['encoding'] or 'utf-8'
            
            # CP949 대응
            if encoding.lower() == 'ascii' or result['confidence'] < 0.8:
                encoding = 'cp949'

            with path.open(encoding=encoding) as f:
                reader = csv.DictReader(f)

                # Validate headers with alias support
                expected_headers = {
                    "timestamp",
                    "user_id",
                    "game_type",
                    "result",
                    "bet_amount",
                    "payout_amount",
                    "balance_after",
                }
                
                # Map actual headers to English keys
                actual_headers_raw = reader.fieldnames or []
                mapped_headers = []
                for h in actual_headers_raw:
                    clean_h = h.strip()
                    mapped_headers.append(self._header_map.get(clean_h, clean_h))
                
                actual_headers_set = set(mapped_headers)

                missing = expected_headers - actual_headers_set
                if missing:
                    return False, f"Missing required columns (or aliases): {', '.join(missing)}"

                # Try parsing first row
                first_row = next(reader, None)
                if first_row is None:
                    return False, "CSV file is empty (no data rows)"

                # Map first row keys
                mapped_row = {self._header_map.get(k.strip(), k.strip()): v for k, v in first_row.items()}

                # Validate first row
                try:
                    ExternalCasinoGameLogCSV(**mapped_row)
                except ValidationError as e:
                    errors = "; ".join([f"{err['loc'][0]}: {err['msg']}" for err in e.errors()])
                    return False, f"First row validation failed: {errors}"

        except csv.Error as e:
            return False, f"CSV parsing error: {e!s}"
        except UnicodeDecodeError:
            return False, "File encoding error (expected UTF-8)"
        except Exception as e:  # noqa: BLE001
            return False, f"Unexpected error: {e!s}"

        return True, "CSV file is valid"

    def parse_csv_rows(
        self,
        file_path: str,
        batch_size: int = 100,
    ) -> Generator[list[ExternalCasinoGameLogCSV], None, None]:
        """
        Parse CSV file and yield batches of validated records.

        Yields:
            Batches of ExternalCasinoGameLogCSV records
        """
        path = Path(file_path)
        batch: list[ExternalCasinoGameLogCSV] = []

        # 1. 인코딩 감지
        raw_data = path.read_bytes()
        result = chardet.detect(raw_data)
        encoding = result['encoding'] or 'utf-8'
        if encoding.lower() == 'ascii' or result['confidence'] < 0.8:
            encoding = 'cp949'

        with path.open(encoding=encoding) as f:
            reader = csv.DictReader(f)

            for row_num, row in enumerate(reader, start=2):  # Start at 2 (header is row 1)
                try:
                    # Map row keys using aliases
                    mapped_row = {self._header_map.get(k.strip(), k.strip()): v for k, v in row.items()}
                    record = ExternalCasinoGameLogCSV(**mapped_row)
                    batch.append(record)

                    if len(batch) >= batch_size:
                        yield batch
                        batch = []

                except ValidationError as e:
                    errors = "; ".join([f"{err['loc'][0]}: {err['msg']}" for err in e.errors()])
                    logger.warning(f"Row {row_num} validation failed: {errors}")
                    continue

                except Exception as e:  # noqa: BLE001
                    logger.error(f"Row {row_num} parsing error: {e!s}")
                    continue

            # Yield remaining records
            if batch:
                yield batch

    def validate_user_exists(self, user_id: int) -> bool:
        """Check if user exists in database (with caching)."""
        if user_id in self._user_cache:
            return self._user_cache[user_id]

        exists = self.db.query(V2User).filter_by(id=user_id).first() is not None
        self._user_cache[user_id] = exists
        return exists

    def import_csv(
        self,
        request: CSVImportRequest,
    ) -> CSVImportResult:
        """
        Import CSV file and return result summary.

        Args:
            request: Import configuration

        Returns:
            Import result with statistics
        """
        start_time = datetime.utcnow()
        job_id = f"csv_import_{start_time.strftime('%Y%m%d_%H%M%S')}"

        # Validate file
        is_valid, error_msg = self.validate_csv_file(request.file_path)
        if not is_valid:
            return CSVImportResult(
                job_id=job_id,
                total_rows=0,
                successful_rows=0,
                failed_rows=0,
                skipped_rows=0,
                duration_seconds=0.0,
                errors=[error_msg],
            )

        # Import data
        total_rows = 0
        successful_rows = 0
        failed_rows = 0
        skipped_rows = 0
        
        # Analytics
        total_bet = 0.0
        total_payout = 0.0
        win_count = 0
        loss_count = 0
        jackpot_count = 0
        unique_users: set[int] = set()

        errors: list[str] = []
        warnings: list[str] = []

        try:
            for batch in self.parse_csv_rows(request.file_path, request.batch_size):
                for record in batch:
                    total_rows += 1

                    # Validate user exists
                    if not self.validate_user_exists(record.user_id):
                        skipped_rows += 1
                        warnings.append(f"User {record.user_id} not found (row {total_rows})")
                        continue

                    # Process record
                    try:
                        if request.emit_to_redis:
                            # Publish to Redis
                            success = self.redis_service.publish_game_event(
                                record,
                                historical_mode=request.historical_mode,
                            )

                            if not success:
                                failed_rows += 1
                                errors.append(f"Row {total_rows}: Failed to publish to Redis")
                                continue

                            # Update loss streak tracking (only if not historical)
                            if not request.historical_mode:
                                self.redis_service.update_loss_streak_redis(
                                    record.user_id,
                                    record.result.value,
                                )
                                self.redis_service.track_session_balance(
                                    record.user_id,
                                    record.balance_after,
                                )
                        
                        # [Phase 3] DB 저장 - V2GameLog 테이블에 저장
                        if request.save_to_db:
                            game_log = V2GameLog(
                                user_id=record.user_id,
                                game_type=record.game_type,
                                result=record.result.value if hasattr(record.result, 'value') else record.result,
                                bet_amount=int(record.bet_amount),
                                payout_amount=int(record.payout_amount),
                                balance_after=int(record.balance_after),
                                recorded_at=record.timestamp if isinstance(record.timestamp, datetime) else datetime.fromisoformat(str(record.timestamp)),
                                import_job_id=job_id,
                            )
                            self.db.add(game_log)
                            
                            # Batch commit every 100 records
                            if total_rows % 100 == 0:
                                self.db.commit()

                        # Update analytics
                        successful_rows += 1
                        total_bet += record.bet_amount
                        total_payout += record.payout_amount
                        unique_users.add(record.user_id)
                        
                        if record.result == "WIN":
                            win_count += 1
                        elif record.result == "LOSE":
                            loss_count += 1
                        elif record.result == "JACKPOT":
                            win_count += 1
                            jackpot_count += 1

                        # Report progress every 100 rows
                        if total_rows % 100 == 0:
                            self.redis_service.publish_import_status(
                                job_id,
                                "PROCESSING",
                                {
                                    "total_rows": total_rows,
                                    "successful_rows": successful_rows,
                                    "failed_rows": failed_rows,
                                },
                            )

                    except Exception as e:  # noqa: BLE001
                        failed_rows += 1
                        errors.append(f"Row {total_rows}: {e!s}")
                        logger.error(f"Failed to process row {total_rows}", exc_info=e)

        except Exception as e:  # noqa: BLE001
            errors.append(f"Import failed: {e!s}")
            logger.error("CSV import failed", exc_info=e)
        
        # [Phase 3] Final DB commit for remaining records
        try:
            self.db.commit()
        except Exception as e:  # noqa: BLE001
            logger.error("Failed to commit final batch", exc_info=e)
            self.db.rollback()
            errors.append(f"DB commit failed: {e!s}")

        duration = (datetime.utcnow() - start_time).total_seconds()

        # Publish final status
        final_status = "COMPLETED" if failed_rows == 0 else "COMPLETED_WITH_ERRORS"
        self.redis_service.publish_import_status(
            job_id,
            final_status,
            {
                "total_rows": total_rows,
                "successful_rows": successful_rows,
                "failed_rows": failed_rows,
                "skipped_rows": skipped_rows,
                "duration_seconds": duration,
            },
        )

        return CSVImportResult(
            job_id=job_id,
            total_rows=total_rows,
            successful_rows=successful_rows,
            failed_rows=failed_rows,
            skipped_rows=skipped_rows,
            duration_seconds=duration,
            total_bet=total_bet,
            total_payout=total_payout,
            win_count=win_count,
            loss_count=loss_count,
            jackpot_count=jackpot_count,
            unique_user_count=len(unique_users),
            errors=errors[:100],  # Limit error list
            warnings=warnings[:100],  # Limit warning list
        )

    def estimate_import_time(self, file_path: str, rows_per_second: int = 100) -> dict[str, int | float]:
        """
        Estimate import duration based on file size.

        Args:
            file_path: Path to CSV file
            rows_per_second: Processing rate (default 100 rows/sec)

        Returns:
            Dictionary with row count and estimated seconds
        """
        path = Path(file_path)

        if not path.exists():
            return {"total_rows": 0, "estimated_seconds": 0}

        # Count rows
        # 1. 인코딩 감지
        raw_data = path.read_bytes()
        result = chardet.detect(raw_data)
        encoding = result['encoding'] or 'utf-8'
        if encoding.lower() == 'ascii' or result['confidence'] < 0.8:
            encoding = 'cp949'

        with path.open(encoding=encoding) as f:
            row_count = sum(1 for _ in f) - 1  # Subtract header

        estimated_seconds = row_count / rows_per_second

        return {
            "total_rows": row_count,
            "estimated_seconds": round(estimated_seconds, 1),
            "estimated_minutes": round(estimated_seconds / 60, 1),
        }
