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


# ============================================================
# 붙여넣기 Import API (클립보드에서 직접 붙여넣기)
# ============================================================

from pydantic import BaseModel


class PasteImportRequest(BaseModel):
    """붙여넣기 Import 요청"""
    text: str
    import_type: str  # "DAILY_DEPOSIT" or "GAME_LOG"


@router.post("/csv-import/paste-import", response_model=dict[str, Any])
def paste_import(
    request: PasteImportRequest,
    db: Session = Depends(get_db),
    admin_info: tuple[int, str] = Depends(get_current_admin_info),
):
    """
    클립보드 붙여넣기로 데이터 Import.
    
    지원 형식:
    - DAILY_DEPOSIT: 데일리 입금 로그 (번호/소속/이름/닉네임/신청날짜/충전금액/입금자명/충전날짜/상태)
    - GAME_LOG: 게임 로그 (번호/이름/닉네임/타입/베팅일시/게임종류/금액)
    
    기존 기록된 시간 이후의 데이터만 처리됩니다.
    """
    admin_id, admin_role = admin_info
    
    if admin_role != "ADMIN":
        raise HTTPException(status_code=403, detail="Requires ADMIN role")
    
    from app.v2.services.paste_import_service import PasteImportService
    
    if request.import_type == "DAILY_DEPOSIT":
        result = PasteImportService.import_daily_deposits(
            db=db,
            text=request.text,
            admin_id=str(admin_id),
        )
    elif request.import_type == "GAME_LOG":
        result = PasteImportService.import_game_logs(
            db=db,
            text=request.text,
            admin_id=str(admin_id),
        )
    else:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported import type: {request.import_type}. Use DAILY_DEPOSIT or GAME_LOG"
        )
    
    return result


@router.post("/csv-import/paste-import/preview", response_model=dict[str, Any])
def preview_paste_import(
    request: PasteImportRequest,
    db: Session = Depends(get_db),
    admin_info: tuple[int, str] = Depends(get_current_admin_info),
):
    """
    붙여넣기 Import 미리보기 (실제 저장 없이 파싱 결과만 반환).
    """
    admin_id, admin_role = admin_info
    
    if admin_role != "ADMIN":
        raise HTTPException(status_code=403, detail="Requires ADMIN role")
    
    from app.v2.services.paste_import_service import PasteImportService
    from sqlalchemy import func
    from app.v2.models.v2_hq_daily_deposit_log import HQDailyDepositLog
    from app.v2.models import V2GameLog
    
    if request.import_type == "DAILY_DEPOSIT":
        parsed = PasteImportService.parse_daily_deposit(request.text)
        latest_deposit_at = db.query(func.max(HQDailyDepositLog.deposit_at)).scalar()
        
        # 기존 기록 이후 건수 계산
        # 시간 정보가 00:00:00인 경우(시간 없이 날짜만 입력된 경우) 날짜만 비교
        new_count = 0
        if latest_deposit_at:
            latest_date = latest_deposit_at.date()
            for item in parsed:
                if item.deposit_at:
                    # 시간 정보가 없는 경우 (00:00:00) 날짜 비교
                    if item.deposit_at.hour == 0 and item.deposit_at.minute == 0 and item.deposit_at.second == 0:
                        # 같은 날짜이거나 이후 날짜면 신규로 처리
                        if item.deposit_at.date() >= latest_date:
                            new_count += 1
                    elif item.deposit_at > latest_deposit_at:
                        new_count += 1
        else:
            new_count = len(parsed)
        
        return {
            "success": True,
            "import_type": "DAILY_DEPOSIT",
            "total_parsed": len(parsed),
            "new_records_count": new_count,
            "latest_in_db": latest_deposit_at.isoformat() if latest_deposit_at else None,
            "preview": [
                {
                    "nickname": p.nickname,
                    "amount": p.amount,
                    "deposit_at": p.deposit_at.isoformat() if p.deposit_at else None,
                    "depositor": p.depositor_name,
                }
                for p in parsed[:10]
            ],
        }
    
    elif request.import_type == "GAME_LOG":
        parsed = PasteImportService.parse_game_log(request.text)
        latest_bet_at = db.query(func.max(V2GameLog.recorded_at)).scalar()
        
        new_count = 0
        if latest_bet_at:
            for item in parsed:
                if item.bet_at and item.bet_at > latest_bet_at:
                    new_count += 1
        else:
            new_count = len(parsed)
        
        return {
            "success": True,
            "import_type": "GAME_LOG",
            "total_parsed": len(parsed),
            "new_records_count": new_count,
            "latest_in_db": latest_bet_at.isoformat() if latest_bet_at else None,
            "preview": [
                {
                    "cc_id": p.cc_id,
                    "nickname": p.nickname,
                    "log_type": p.log_type,
                    "bet_at": p.bet_at.isoformat() if p.bet_at else None,
                    "game_type": p.game_type,
                    "amount": p.amount,
                }
                for p in parsed[:10]
            ],
        }
    
    else:
        raise HTTPException(status_code=400, detail="Unsupported import type")
