"""Admin API routes for CSV import operations."""
from __future__ import annotations

from typing import Any, List, Optional

import logging

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.v2.api.deps import get_current_admin_info, get_db
from app.v2.schemas.v2_csv_import import (
    CSVImportRequest,
    CSVImportResult,
)
from app.v2.services.csv_import_service import CSVImportService

router = APIRouter()
logger = logging.getLogger(__name__)


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
    selected_indices: Optional[List[int]] = None  # 선택된 행 인덱스 (None이면 전체)


class WithdrawalImportRequest(BaseModel):
    """환전 Import 요청"""
    text: str
    selected_indices: Optional[List[int]] = None


class WithdrawalImportResponse(BaseModel):
    """환전 Import 응답"""
    success: bool
    batch_id: Optional[str] = None
    total_parsed: int = 0
    processed_count: int = 0
    skipped_status_count: int = 0
    duplicate_count: int = 0
    not_found_count: int = 0
    total_amount: int = 0
    spending_recorded_count: int = 0
    error: Optional[str] = None


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
    selected_indices를 지정하면 해당 인덱스의 행만 처리합니다.
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
            selected_indices=request.selected_indices,
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
    붙여넣기 Import 미리보기 (실제 저장 없이 파싱 결과 + 상태 반환).
    
    각 행의 상태:
    - MATCHED: 유저 매칭됨 (Import 가능)
    - NOT_FOUND: 유저 없음 (외부 닉네임으로 미등록)
    - DUPLICATE: 이미 Import된 기록
    - SKIPPED_OLD: 기존 기록 이전 데이터
    """
    import hashlib
    admin_id, admin_role = admin_info
    
    if admin_role != "ADMIN":
        raise HTTPException(status_code=403, detail="Requires ADMIN role")
    
    from app.v2.services.paste_import_service import PasteImportService
    from sqlalchemy import func
    from app.v2.models.v2_hq_daily_deposit_log import HQDailyDepositLog
    from app.v2.models import V2GameLog, V2User
    
    if request.import_type == "DAILY_DEPOSIT":
        parsed = PasteImportService.parse_daily_deposit(request.text)
        
        # 시간 정보가 있는 기록만 대상 (00:00:00 제외)
        latest_deposit_at = db.query(func.max(HQDailyDepositLog.deposit_at)).filter(
            func.hour(HQDailyDepositLog.deposit_at) != 0
        ).scalar()
        if not latest_deposit_at:
            latest_deposit_at = db.query(func.max(HQDailyDepositLog.deposit_at)).scalar()
        
        # 기존 dedup_key 조회
        existing_keys = set(row[0] for row in db.query(HQDailyDepositLog.dedup_key).all())
        
        # 각 행 상세 상태 계산
        preview_items = []
        new_count = 0
        
        for idx, item in enumerate(parsed):
            # 상태 판정
            status = "MATCHED"
            user_id = None
            
            # 1) 기존 기록 이전 체크
            is_old = False
            if latest_deposit_at and item.deposit_at:
                is_no_time = (item.deposit_at.hour == 0 and item.deposit_at.minute == 0 and item.deposit_at.second == 0)
                if is_no_time:
                    if item.deposit_at.date() < latest_deposit_at.date():
                        is_old = True
                else:
                    if item.deposit_at <= latest_deposit_at:
                        is_old = True
            
            if is_old:
                status = "SKIPPED_OLD"
            else:
                # 2) 중복 체크
                dt_str = item.deposit_at.strftime("%Y%m%d%H%M") if item.deposit_at else "no_time"
                raw_key = f"{item.nickname.lower().strip()}|{item.amount}|{dt_str}"
                dedup_key = hashlib.md5(raw_key.encode()).hexdigest()[:16]
                
                if dedup_key in existing_keys:
                    status = "DUPLICATE"
                else:
                    # 3) 유저 매칭
                    user = db.query(V2User).filter(
                        func.lower(V2User.nickname) == item.nickname.lower()
                    ).first()
                    if not user:
                        user = db.query(V2User).filter(
                            func.lower(V2User.external_nickname) == item.nickname.lower()
                        ).first()
                    
                    if user:
                        status = "MATCHED"
                        user_id = user.id
                        new_count += 1
                    else:
                        status = "NOT_FOUND"
            
            preview_items.append({
                "index": idx,
                "nickname": item.nickname,
                "amount": item.amount,
                "deposit_at": item.deposit_at.isoformat() if item.deposit_at else None,
                "depositor": item.depositor_name,
                "status": status,
                "user_id": user_id,
            })
        
        return {
            "success": True,
            "import_type": "DAILY_DEPOSIT",
            "total_parsed": len(parsed),
            "new_records_count": new_count,
            "matched_count": sum(1 for p in preview_items if p["status"] == "MATCHED"),
            "not_found_count": sum(1 for p in preview_items if p["status"] == "NOT_FOUND"),
            "duplicate_count": sum(1 for p in preview_items if p["status"] == "DUPLICATE"),
            "skipped_old_count": sum(1 for p in preview_items if p["status"] == "SKIPPED_OLD"),
            "latest_in_db": latest_deposit_at.isoformat() if latest_deposit_at else None,
            "preview": preview_items,  # 전체 반환 (체크박스 선택용)
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


@router.post("/paste-import/withdrawal", response_model=WithdrawalImportResponse)
def import_withdrawals(
    request: WithdrawalImportRequest,
    db: Session = Depends(get_db),
    admin_info: tuple[int, str] = Depends(get_current_admin_info),
):
    """HQ 환전 내역 붙여넣기 Import"""
    admin_id, admin_role = admin_info

    if admin_role != "ADMIN":
        raise HTTPException(status_code=403, detail="Requires ADMIN role")

    from app.v2.services.paste_import_service import PasteImportService

    try:
        result = PasteImportService.import_daily_withdrawals(
            db=db,
            text=request.text,
            admin_id=str(admin_id),
            selected_indices=request.selected_indices,
        )
        return WithdrawalImportResponse(**result)
    except Exception as e:  # noqa: BLE001
        logger.exception("[API] Withdrawal import failed")
        return WithdrawalImportResponse(success=False, error=str(e))


@router.post("/paste-import/withdrawal/preview", response_model=dict[str, Any])
def preview_withdrawals(
    request: WithdrawalImportRequest,
    db: Session = Depends(get_db),
    admin_info: tuple[int, str] = Depends(get_current_admin_info),
):
    """환전 내역 미리보기 (저장 없이 파싱 결과만 반환)"""
    admin_id, admin_role = admin_info

    if admin_role != "ADMIN":
        raise HTTPException(status_code=403, detail="Requires ADMIN role")

    from app.v2.services.paste_import_service import PasteImportService
    from app.v2.models.v2_hq_daily_withdrawal_log import V2HQDailyWithdrawalLog
    from app.v2.models import V2User

    parsed = PasteImportService.parse_daily_withdrawal(request.text)

    existing_keys = set(
        row[0] for row in db.query(V2HQDailyWithdrawalLog.dedup_key).all()
    )

    preview_items = []
    matched_count = 0
    not_found_count = 0
    duplicate_count = 0
    skipped_status_count = 0

    for idx, item in enumerate(parsed):
        status = "MATCHED"
        user_id = None

        if item.hq_status != "정상" or item.amount <= 0:
            status = "SKIPPED_OLD"
            skipped_status_count += 1
        else:
            dedup_key = PasteImportService._generate_withdrawal_dedup_key(
                item.nickname,
                item.amount,
                item.withdrawal_at,
            )
            if dedup_key in existing_keys:
                status = "DUPLICATE"
                duplicate_count += 1
            else:
                user = db.query(V2User).filter(
                    func.lower(V2User.nickname) == item.nickname.lower()
                ).first()
                if not user and item.cc_id:
                    user = db.query(V2User).filter(
                        func.lower(V2User.cc_id) == item.cc_id.lower()
                    ).first()

                if user:
                    status = "MATCHED"
                    user_id = user.id
                    matched_count += 1
                else:
                    status = "NOT_FOUND"
                    not_found_count += 1

        preview_items.append(
            {
                "index": idx,
                "nickname": item.nickname,
                "cc_id": item.cc_id,
                "amount": item.amount,
                "bet_amount": item.bet_amount,
                "withdrawal_at": item.withdrawal_at.isoformat() if item.withdrawal_at else None,
                "hq_status": item.hq_status,
                "status": status,
                "user_id": user_id,
            }
        )

    return {
        "success": True,
        "import_type": "WITHDRAWAL",
        "total_parsed": len(parsed),
        "new_records_count": matched_count + not_found_count,
        "matched_count": matched_count,
        "not_found_count": not_found_count,
        "duplicate_count": duplicate_count,
        "skipped_status_count": skipped_status_count,
        "latest_in_db": None,
        "preview": preview_items,
    }
