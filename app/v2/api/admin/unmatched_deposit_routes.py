"""Admin API routes for unmatched deposit log management.

설계 문서: v2_golden_hq_margin_cc_deposit_auto_reflection_design_ko.md
섹션 8. API 계약 (미매칭 입금 로그)
"""
from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.api.deps import get_current_admin_info, get_db
from app.v2.services.unmatched_deposit_log_service import UnmatchedDepositLogService
from app.v2.schemas.v2_unmatched_deposit import (
    UnmatchedDepositListParams,
    UnmatchedDepositListResponse,
    UnmatchedDepositItem,
    UnmatchedDepositStats,
    UnmatchedDepositLinkRequest,
    UnmatchedDepositLinkResponse,
    UnmatchedDepositLinkResult,
    UnmatchedDepositIgnoreRequest,
    UnmatchedDepositIgnoreResponse,
    UnmatchedDepositStatsResponse,
    SimilarUserSuggestion,
)

router = APIRouter(tags=["Admin (Unmatched Deposit)"])


@router.get("/deposits/unmatched", response_model=UnmatchedDepositListResponse)
def list_unmatched_deposits(
    hours: int = Query(default=24, ge=1, le=720, description="조회 기간 (시간)"),
    status: str = Query(default="UNMATCHED", description="상태 필터 (UNMATCHED, AMBIGUOUS, ALL)"),
    limit: int = Query(default=50, ge=1, le=200, description="페이지 크기"),
    offset: int = Query(default=0, ge=0, description="오프셋"),
    db: Session = Depends(get_db),
    admin_info: tuple[int, str] = Depends(get_current_admin_info),
) -> UnmatchedDepositListResponse:
    """
    미매칭 입금 로그 조회 (유사 유저 제안 포함).
    
    - hours: 조회 기간 (시간), 기본값 24
    - status: 상태 필터 (UNMATCHED, AMBIGUOUS, ALL)
    - limit: 페이지 크기, 기본값 50
    - offset: 오프셋
    """
    admin_id, admin_role = admin_info
    
    service = UnmatchedDepositLogService(db)
    items, total, stats = service.list_unmatched(
        hours=hours,
        status_filter=status,
        limit=limit,
        offset=offset,
        include_suggestions=True,
    )
    
    # Convert to response model
    response_items = [
        UnmatchedDepositItem(
            id=item["id"],
            source=item["source"],
            raw_cc_id=item["raw_cc_id"],
            raw_nickname=item["raw_nickname"],
            total_charge=item["total_charge"],
            prev_total=item["prev_total"],
            delta=item["delta"],
            kst_date=item["kst_date"],
            status=item["status"],
            reason=item["reason"],
            matched_user_id=item["matched_user_id"],
            matched_at=item["matched_at"],
            processed_at=item["processed_at"],
            admin_id=item["admin_id"],
            created_at=item["created_at"],
            suggestions=[
                SimilarUserSuggestion(**s) for s in item.get("suggestions", [])
            ],
        )
        for item in items
    ]
    
    return UnmatchedDepositListResponse(
        items=response_items,
        total=total,
        stats=UnmatchedDepositStats(
            unmatched=stats.get("unmatched", 0),
            ambiguous=stats.get("ambiguous", 0),
            matched_today=stats.get("matched_today", 0),
        ),
    )


@router.post("/deposits/unmatched/{unmatched_id}/link", response_model=UnmatchedDepositLinkResponse)
def link_unmatched_deposit(
    unmatched_id: int,
    request: UnmatchedDepositLinkRequest,
    db: Session = Depends(get_db),
    admin_info: tuple[int, str] = Depends(get_current_admin_info),
) -> UnmatchedDepositLinkResponse:
    """
    미매칭 로그를 V2User에 수동 매칭하고 즉시 CC Deposit 재처리.
    
    - unmatched_id: 미매칭 로그 ID
    - user_id: 매칭할 V2User ID
    """
    admin_id, admin_role = admin_info
    
    if admin_role not in ("ADMIN", "SUPERADMIN"):
        raise HTTPException(status_code=403, detail="Requires ADMIN role")
    
    service = UnmatchedDepositLogService(db)
    
    try:
        result = service.link_to_user(
            unmatched_id=unmatched_id,
            user_id=request.user_id,
            admin_id=admin_id,
        )
        
        return UnmatchedDepositLinkResponse(
            success=result["success"],
            message=result["message"],
            result=UnmatchedDepositLinkResult(
                user_id=result["result"]["user_id"],
                deposit_amount=result["result"]["deposit_amount"],
                delta_applied=result["result"]["delta_applied"],
                xp_granted=result["result"]["xp_granted"],
                segment=result["result"].get("segment"),
            ) if result.get("result") else None,
        )
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/deposits/unmatched/{unmatched_id}/ignore", response_model=UnmatchedDepositIgnoreResponse)
def ignore_unmatched_deposit(
    unmatched_id: int,
    request: UnmatchedDepositIgnoreRequest,
    db: Session = Depends(get_db),
    admin_info: tuple[int, str] = Depends(get_current_admin_info),
) -> UnmatchedDepositIgnoreResponse:
    """
    미매칭 로그 무시 처리.
    
    - unmatched_id: 미매칭 로그 ID
    - reason: 무시 사유
    """
    admin_id, admin_role = admin_info
    
    if admin_role not in ("ADMIN", "SUPERADMIN"):
        raise HTTPException(status_code=403, detail="Requires ADMIN role")
    
    service = UnmatchedDepositLogService(db)
    
    try:
        result = service.ignore(
            unmatched_id=unmatched_id,
            reason=request.reason,
            admin_id=admin_id,
        )
        
        return UnmatchedDepositIgnoreResponse(
            success=result["success"],
            message=result["message"],
        )
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/deposits/unmatched/stats", response_model=UnmatchedDepositStatsResponse)
def get_unmatched_deposit_stats(
    db: Session = Depends(get_db),
    admin_info: tuple[int, str] = Depends(get_current_admin_info),
) -> UnmatchedDepositStatsResponse:
    """
    미매칭 로그 전체 통계 조회.
    """
    admin_id, admin_role = admin_info
    
    service = UnmatchedDepositLogService(db)
    stats = service.get_stats()
    
    return UnmatchedDepositStatsResponse(
        total_unmatched=stats["total_unmatched"],
        total_ambiguous=stats["total_ambiguous"],
        matched_last_24h=stats["matched_last_24h"],
        ignored_last_24h=stats["ignored_last_24h"],
        pending_by_source=stats["pending_by_source"],
        top_reasons=stats["top_reasons"],
    )


@router.post("/deposits/unmatched/cleanup", response_model=dict[str, Any])
def cleanup_old_unmatched_logs(
    db: Session = Depends(get_db),
    admin_info: tuple[int, str] = Depends(get_current_admin_info),
) -> dict[str, Any]:
    """
    30일 이전의 처리 완료된 미매칭 로그 정리.
    
    Note: 이 엔드포인트는 보통 Celery Beat 등 스케줄러에서 호출됩니다.
    """
    admin_id, admin_role = admin_info
    
    if admin_role != "SUPERADMIN":
        raise HTTPException(status_code=403, detail="Requires SUPERADMIN role")
    
    service = UnmatchedDepositLogService(db)
    deleted_count = service.cleanup_old_logs()
    
    return {
        "success": True,
        "deleted_count": deleted_count,
        "retention_days": service.RETENTION_DAYS,
    }
