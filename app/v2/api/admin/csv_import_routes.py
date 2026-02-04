"""Admin API routes for CSV import operations."""
from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session

from app.api.deps import get_current_admin_info, get_db
from app.v2.schemas.v2_csv_import import (
    CSVImportRequest,
    CSVImportResult,
)
from app.v2.services.csv_import_service import CSVImportService

router = APIRouter()


@router.post("/csv-import/validate", response_model=dict[str, Any])
def validate_csv_file(
    file: UploadFile = File(...),
    import_type: str = Form("GAME_LOG"),
    db: Session = Depends(get_db),
    admin_info: tuple[int, str] = Depends(get_current_admin_info),
):
    """
    Validate CSV file format and structure.

    Returns validation status and any errors found.
    """
    admin_id, admin_role = admin_info

    if admin_role != "ADMIN":
        raise HTTPException(status_code=403, detail="Requires ADMIN role")

    # Save uploaded file temporarily
    import tempfile
    from pathlib import Path

    with tempfile.NamedTemporaryFile(delete=False, suffix=".csv") as tmp_file:
        tmp_file.write(file.file.read())
        tmp_path = Path(tmp_file.name)

    try:
        # Route based on import type
        estimate = {}
        if import_type == "HQ_MARGIN":
            from app.v2.services.hq_margin_import_service import HQMarginImportService
            is_valid, error_msg = HQMarginImportService.validate_hq_margin_csv(str(tmp_path))
        elif import_type == "HQ_DAILY":
            from app.v2.services.hq_daily_deposit_import_service import HQDailyDepositImportService
            is_valid, error_msg = HQDailyDepositImportService.validate_hq_daily_csv(str(tmp_path))
        else:
            service = CSVImportService(db)
            # Validate file
            is_valid, error_msg = service.validate_csv_file(str(tmp_path))
            # Get estimate
            if is_valid:
                estimate = service.estimate_import_time(str(tmp_path))

        return {
            "is_valid": is_valid,
            "error": error_msg if not is_valid else None,
            "filename": file.filename,
            "file_size_bytes": tmp_path.stat().st_size,
            **estimate,
        }

    finally:
        # Cleanup temp file
        tmp_path.unlink(missing_ok=True)


@router.post("/csv-import/upload", response_model=dict[str, str])
def upload_csv_file(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    admin_info: tuple[int, str] = Depends(get_current_admin_info),
):
    """
    Upload CSV file for import.

    Saves file to configured upload directory and returns file ID.
    """
    admin_id, admin_role = admin_info

    if admin_role != "ADMIN":
        raise HTTPException(status_code=403, detail="Requires ADMIN role")

    # Validate file extension
    if not file.filename or not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are allowed")

    # Save to upload directory
    from pathlib import Path
    from datetime import datetime
    import os

    # Create upload directory if not exists
    upload_dir = Path("uploads/csv_imports")
    upload_dir.mkdir(parents=True, exist_ok=True)

    # Generate unique filename
    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    safe_filename = f"casino_log_{timestamp}_{file.filename}"
    file_path = upload_dir / safe_filename

    # Save file
    with file_path.open("wb") as f:
        f.write(file.file.read())

    return {
        "file_id": safe_filename,
        "file_path": str(file_path),
        "message": "File uploaded successfully",
    }


@router.post("/csv-import/import", response_model=dict[str, Any] | CSVImportResult)
async def import_csv_file(
    request: CSVImportRequest,
    db: Session = Depends(get_db),
    admin_info: tuple[int, str] = Depends(get_current_admin_info),
):
    """
    Import CSV file into Golden V2 system.

    Supports import types:
    - GAME_LOG (default): External casino game logs
    - HQ_MARGIN: HQ margin data for segment targeting (누적 데이터)
    - HQ_DAILY: HQ daily deposit data (일별 개별 입금)

    Processes CSV records and emits events to Redis (for GAME_LOG).
    """
    admin_id, admin_role = admin_info

    if admin_role != "ADMIN":
        raise HTTPException(status_code=403, detail="Requires ADMIN role")

    from pathlib import Path

    # Validate file exists
    file_path = Path(request.file_path)
    if not file_path.exists():
        raise HTTPException(status_code=404, detail=f"File not found: {request.file_path}")

    # Route based on import type
    try:
        if request.import_type == "HQ_MARGIN":
            # HQ Margin import (누적 데이터)
            from app.v2.services.hq_margin_import_service import HQMarginImportService

            result = await HQMarginImportService.import_hq_margin_csv(
                db=db,
                file_path=str(file_path),
                admin_id=str(admin_id),
            )
            return result
        elif request.import_type == "HQ_DAILY":
            # HQ Daily Deposit import (일별 개별 입금)
            from app.v2.services.hq_daily_deposit_import_service import HQDailyDepositImportService

            result = await HQDailyDepositImportService.import_hq_daily_deposit_csv(
                db=db,
                file_path=str(file_path),
                admin_id=str(admin_id),
            )
            return result
        else:
            # Default: Game log import
            service = CSVImportService(db)
            result = service.import_csv(request)
            return result

    except Exception as e:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=f"Import failed: {e!s}") from e


@router.get("/csv-import/estimate", response_model=dict[str, Any])
def estimate_import_time(
    file_path: str,
    db: Session = Depends(get_db),
    admin_info: tuple[int, str] = Depends(get_current_admin_info),
):
    """
    Estimate processing time for CSV import.

    Args:
        file_path: Path to CSV file

    Returns:
        Estimation data (total rows, estimated seconds/minutes)
    """
    admin_id, admin_role = admin_info

    if admin_role != "ADMIN":
        raise HTTPException(status_code=403, detail="Requires ADMIN role")

    from pathlib import Path

    # Validate file exists
    path = Path(file_path)
    if not path.exists():
        raise HTTPException(status_code=404, detail=f"File not found: {file_path}")

    service = CSVImportService(db)
    estimate = service.estimate_import_time(file_path)

    return estimate
