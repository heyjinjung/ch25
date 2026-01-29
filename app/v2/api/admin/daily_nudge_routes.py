"""
V2 Admin Daily Nudge Routes

일일 넛지 관리 API:
- 넛지 대상자 조회
- 수동 넛지 발송
- 넛지 통계 조회
"""
from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.deps import get_current_admin_info, get_db
from app.v2.services.daily_nudge_service import DailyNudgeService
from app.v2.tasks.daily_nudge_tasks import execute_daily_nudge_task

router = APIRouter(prefix="/daily-nudge", tags=["admin-daily-nudge"])


# ============ Schemas ============

class DailyNudgeTargetUser(BaseModel):
    """넛지 대상 유저 정보"""
    user_id: int
    cc_id: str


class DailyNudgeTargetsResponse(BaseModel):
    """넛지 대상자 조회 응답"""
    total_targets: int
    lookback_days: int
    targets: list[DailyNudgeTargetUser]


class DailyNudgeSendRequest(BaseModel):
    """넛지 발송 요청"""
    user_id: int | None = None
    ticket_amount: int = 1
    skip_suspension_check: bool = False


class DailyNudgeSendResponse(BaseModel):
    """넛지 발송 응답"""
    success: bool
    user_id: int
    ticket_granted: int
    message: str


class DailyNudgeBatchRequest(BaseModel):
    """넛지 배치 실행 요청"""
    lookback_days: int = 3
    ticket_amount: int = 1
    dry_run: bool = False


class DailyNudgeBatchResponse(BaseModel):
    """넛지 배치 실행 응답"""
    total_targets: int
    success_count: int
    failed_count: int
    suspended_count: int
    dry_run: bool
    results: list[DailyNudgeSendResponse] | None = None
    targets: list[DailyNudgeTargetUser] | None = None


class DailyNudgeStatisticsResponse(BaseModel):
    """넛지 통계 응답"""
    total_inactive_users: int
    eligible_users: int
    suspended_users: int
    lookback_days: int


# ============ Endpoints ============

@router.get("/targets", response_model=DailyNudgeTargetsResponse)
def get_nudge_targets(
    lookback_days: int = Query(3, ge=1, le=30),
    db: Session = Depends(get_db),
    admin_info: tuple[int, str] = Depends(get_current_admin_info),
):
    """
    넛지 대상자 조회

    Args:
        lookback_days: 최근 접속 확인 기간 (1~30일)

    Returns:
        DailyNudgeTargetsResponse: 넛지 대상자 목록
    """
    target_users = DailyNudgeService.get_nudge_target_users(
        db, lookback_days=lookback_days
    )

    return DailyNudgeTargetsResponse(
        total_targets=len(target_users),
        lookback_days=lookback_days,
        targets=[
            DailyNudgeTargetUser(user_id=uid, cc_id=cc_id)
            for uid, cc_id in target_users
        ],
    )


@router.post("/send", response_model=DailyNudgeSendResponse)
def send_nudge(
    payload: DailyNudgeSendRequest,
    db: Session = Depends(get_db),
    admin_info: tuple[int, str] = Depends(get_current_admin_info),
):
    """
    수동 넛지 발송 (단일 유저)

    Args:
        payload: 넛지 발송 요청
            - user_id: 대상 유저 ID
            - ticket_amount: 지급할 티켓 수 (기본 1장)
            - skip_suspension_check: 제재 체크 스킵 여부 (관리자용)

    Returns:
        DailyNudgeSendResponse: 발송 결과
    """
    if not payload.user_id:
        return DailyNudgeSendResponse(
            success=False,
            user_id=0,
            ticket_granted=0,
            message="USER_ID_REQUIRED",
        )

    result = DailyNudgeService.send_daily_nudge(
        db=db,
        user_id=payload.user_id,
        ticket_amount=payload.ticket_amount,
        skip_suspension_check=payload.skip_suspension_check,
    )

    return DailyNudgeSendResponse(**result)


@router.post("/batch", response_model=DailyNudgeBatchResponse)
def execute_nudge_batch(
    payload: DailyNudgeBatchRequest,
    db: Session = Depends(get_db),
    admin_info: tuple[int, str] = Depends(get_current_admin_info),
):
    """
    넛지 배치 실행 (수동 트리거)

    Args:
        payload: 배치 실행 요청
            - lookback_days: 최근 접속 확인 기간 (기본 3일)
            - ticket_amount: 지급할 티켓 수 (기본 1장)
            - dry_run: True면 실제 지급 없이 대상자만 조회

    Returns:
        DailyNudgeBatchResponse: 배치 실행 결과
    """
    result = DailyNudgeService.execute_daily_nudge_batch(
        db=db,
        lookback_days=payload.lookback_days,
        ticket_amount=payload.ticket_amount,
        dry_run=payload.dry_run,
    )

    response_data = {
        "total_targets": result["total_targets"],
        "success_count": result["success_count"],
        "failed_count": result["failed_count"],
        "suspended_count": result["suspended_count"],
        "dry_run": result["dry_run"],
    }

    if payload.dry_run:
        response_data["targets"] = [
            DailyNudgeTargetUser(**t) for t in result.get("targets", [])
        ]
    else:
        response_data["results"] = [
            DailyNudgeSendResponse(**r) for r in result.get("results", [])
        ]

    return DailyNudgeBatchResponse(**response_data)


@router.get("/statistics", response_model=DailyNudgeStatisticsResponse)
def get_nudge_statistics(
    lookback_days: int = Query(7, ge=1, le=30),
    db: Session = Depends(get_db),
    admin_info: tuple[int, str] = Depends(get_current_admin_info),
):
    """
    넛지 통계 조회

    Args:
        lookback_days: 통계 기간 (1~30일, 기본 7일)

    Returns:
        DailyNudgeStatisticsResponse: 넛지 통계
    """
    stats = DailyNudgeService.get_nudge_statistics(
        db, lookback_days=lookback_days
    )

    return DailyNudgeStatisticsResponse(**stats)


@router.post("/trigger-async")
def trigger_async_nudge_batch(
    payload: DailyNudgeBatchRequest,
    admin_info: tuple[int, str] = Depends(get_current_admin_info),
):
    """
    넛지 배치 비동기 실행 (Celery Task 트리거)

    Args:
        payload: 배치 실행 요청

    Returns:
        dict: 태스크 트리거 결과
    """
    # Celery Task 실행 (비동기)
    # 실제 Celery가 설정되어 있다면:
    # task = execute_daily_nudge_task.delay(
    #     lookback_days=payload.lookback_days,
    #     ticket_amount=payload.ticket_amount,
    #     dry_run=payload.dry_run,
    # )
    # return {"task_id": task.id, "status": "PENDING"}

    # Celery가 없으면 동기 실행
    result = execute_daily_nudge_task(
        lookback_days=payload.lookback_days,
        ticket_amount=payload.ticket_amount,
        dry_run=payload.dry_run,
    )

    return {
        "task_id": None,
        "status": "COMPLETED",
        "result": result,
    }
