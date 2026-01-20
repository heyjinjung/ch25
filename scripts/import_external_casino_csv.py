#!/usr/bin/env python3
"""
Import external casino logs from CSV file into Golden V2 system.

Usage:
    python scripts/import_external_casino_csv.py <csv_file_path> [options]

Examples:
    # Dry-run mode (validate only, no Redis events)
    python scripts/import_external_casino_csv.py data.csv --dry-run

    # Normal import with real-time intervention triggers
    python scripts/import_external_casino_csv.py data.csv

    # Historical data import (skip real-time triggers)
    python scripts/import_external_casino_csv.py data.csv --historical

    # Custom batch size
    python scripts/import_external_casino_csv.py data.csv --batch-size 500
"""
from __future__ import annotations

import argparse
import logging
import sys
from pathlib import Path

# Add project root to path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from app.core.config import get_settings
from app.db.session import SessionLocal
from app.v2.schemas.v2_csv_import import CSVImportRequest
from app.v2.services.csv_import_service import CSVImportService

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)


def setup_argparse() -> argparse.ArgumentParser:
    """Setup command line argument parser."""
    parser = argparse.ArgumentParser(
        description="Import external casino logs from CSV into Golden V2",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )

    parser.add_argument(
        "csv_file",
        type=str,
        help="Path to CSV file to import",
    )

    parser.add_argument(
        "--batch-size",
        type=int,
        default=100,
        help="Number of rows to process per batch (default: 100)",
    )

    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Validate CSV only, do not emit Redis events",
    )

    parser.add_argument(
        "--historical",
        action="store_true",
        help="Process as historical data (skip real-time intervention triggers)",
    )

    parser.add_argument(
        "--skip-duplicate-check",
        action="store_true",
        help="Skip duplicate session_id checks (faster but may cause duplicates)",
    )

    parser.add_argument(
        "--estimate-only",
        action="store_true",
        help="Show estimated processing time and exit",
    )

    return parser


def main() -> int:
    """Main entry point."""
    parser = setup_argparse()
    args = parser.parse_args()

    # Validate file path
    csv_path = Path(args.csv_file)
    if not csv_path.exists():
        logger.error(f"File not found: {csv_path}")
        return 1

    # Check Redis configuration
    settings = get_settings()
    if not settings.redis_url and not args.dry_run:
        logger.error("Redis URL not configured (required for non-dry-run mode)")
        return 1

    # Setup database session
    db = SessionLocal()

    try:
        # Initialize service
        service = CSVImportService(db)

        # Estimate processing time
        if args.estimate_only:
            logger.info("Estimating processing time...")
            estimate = service.estimate_import_time(str(csv_path))
            logger.info(f"Total rows: {estimate['total_rows']}")
            logger.info(f"Estimated time: {estimate['estimated_minutes']} minutes")
            return 0

        # Validate CSV file
        logger.info(f"Validating CSV file: {csv_path}")
        is_valid, error_msg = service.validate_csv_file(str(csv_path))

        if not is_valid:
            logger.error(f"CSV validation failed: {error_msg}")
            return 1

        logger.info("CSV validation passed")

        # Show estimated time
        estimate = service.estimate_import_time(str(csv_path))
        logger.info(f"Total rows to process: {estimate['total_rows']}")
        logger.info(f"Estimated time: {estimate['estimated_minutes']} minutes")

        # Dry-run mode confirmation
        if args.dry_run:
            logger.warning("DRY-RUN MODE: No events will be emitted to Redis")
        elif args.historical:
            logger.info("HISTORICAL MODE: Real-time intervention triggers will be skipped")

        # Confirm before proceeding
        if not args.dry_run:
            confirm = input("Proceed with import? (yes/no): ")
            if confirm.lower() != "yes":
                logger.info("Import cancelled by user")
                return 0

        # Create import request
        request = CSVImportRequest(
            file_path=str(csv_path),
            batch_size=args.batch_size,
            emit_to_redis=not args.dry_run,
            historical_mode=args.historical,
            skip_duplicate_check=args.skip_duplicate_check,
        )

        # Execute import
        logger.info("Starting CSV import...")
        result = service.import_csv(request)

        # Display results
        logger.info("=" * 60)
        logger.info("Import completed!")
        logger.info(f"Job ID: {result.job_id}")
        logger.info(f"Total rows: {result.total_rows}")
        logger.info(f"Successful: {result.successful_rows}")
        logger.info(f"Failed: {result.failed_rows}")
        logger.info(f"Skipped: {result.skipped_rows}")
        logger.info(f"Duration: {result.duration_seconds:.1f} seconds")
        logger.info("=" * 60)

        # Show errors
        if result.errors:
            logger.warning(f"Encountered {len(result.errors)} errors:")
            for error in result.errors[:10]:  # Show first 10
                logger.warning(f"  - {error}")
            if len(result.errors) > 10:
                logger.warning(f"  ... and {len(result.errors) - 10} more errors")

        # Show warnings
        if result.warnings:
            logger.warning(f"Encountered {len(result.warnings)} warnings:")
            for warning in result.warnings[:10]:  # Show first 10
                logger.warning(f"  - {warning}")
            if len(result.warnings) > 10:
                logger.warning(f"  ... and {len(result.warnings) - 10} more warnings")

        # Return success if no failed rows
        return 0 if result.failed_rows == 0 else 1

    except KeyboardInterrupt:
        logger.warning("Import interrupted by user")
        return 130
    except Exception as e:  # noqa: BLE001
        logger.exception("Unexpected error during import")
        return 1
    finally:
        db.close()


if __name__ == "__main__":
    sys.exit(main())
