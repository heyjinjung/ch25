"""
V2 Admin Rollback Routes

회수(Rollback) 관리 API:
- 실행 전체 회수
- 회수 가능 여부 확인
- 회수 이력 조회
"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.v2.api.deps import get_current_admin_info, get_db
from app.v2.services.rollback_service import V2RollbackService

router = APIRouter(prefix="/rollback", tags=["admin-rollback"])


# ============ Schemas ============

class RollbackExecutionRequest(BaseModel):
    """실행 회수 요청"""
    reason: str = "admin_rollback"


class RollbackDetailItem(BaseModel):
    """회수 상세 항목"""
    user_id: int
    status: str  # success, failed, partial
    amount: int | None = None
    requested: int | None = None
    recovered: int | None = None
    message: str = ""


class RollbackExecutionResponse(BaseModel):
    """실행 회수 응답"""
    total: int
    success: int
    failed: int
    partial: int
    details: list[RollbackDetailItem]


class RollbackEligibilityResponse(BaseModel):
    """회수 가능 여부 응답"""
    eligible: bool
    total_users: int
    total_amount: int
    already_rolled_back: bool
    message: str


# ============ Endpoints ============

@router.post("/executions/{execution_id}", response_model=RollbackExecutionResponse)
def rollback_execution(
    execution_id: str,
    payload: RollbackExecutionRequest,
    db: Session = Depends(get_db),
    admin_info: tuple[int, str] = Depends(get_current_admin_info),
):
    """
    실행 전체 회수

    Args:
        execution_id: 실행 ID
        payload: 회수 요청
            - reason: 회수 사유

    Returns:
        RollbackExecutionResponse: 회수 결과

    Permission: ADMIN 이상
    """
    admin_id, admin_role = admin_info

    # SUPER_ADMIN만 회수 가능 (보안)
    # 실제 운영에서는 SUPER_ADMIN으로 제한 권장
    # if admin_role != "SUPER_ADMIN":
    #     raise HTTPException(status_code=403, detail="SUPER_ADMIN_REQUIRED")

    result = V2RollbackService.rollback_execution(
        db=db,
        execution_id=execution_id,
        admin_id=admin_id,
        reason=payload.reason,
    )

    return RollbackExecutionResponse(
        total=result["total"],
        success=result["success"],
        failed=result["failed"],
        partial=result["partial"],
        details=[RollbackDetailItem(**d) for d in result["details"]],
    )


@router.get("/executions/{execution_id}/eligibility", response_model=RollbackEligibilityResponse)
def check_rollback_eligibility(
    execution_id: str,
    db: Session = Depends(get_db),
    admin_info: tuple[int, str] = Depends(get_current_admin_info),
):
    """
    회수 가능 여부 확인

    Args:
        execution_id: 실행 ID

    Returns:
        RollbackEligibilityResponse: 회수 가능 여부 및 정보
    """
    result = V2RollbackService.check_rollback_eligibility(
        db=db,
        execution_id=execution_id,
    )

    return RollbackEligibilityResponse(**result)
