"""V2 Admin Streak Routes."""
import logging
from datetime import date
from typing import Optional, List

from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_current_admin_info
from app.v2.models import UserEventLog
from app.v2.models.user import V2User
from app.v2.models import UserSegment
from app.schemas.admin_streak_rewards import (
    StreakRewardDailyCountsResponse,
    StreakRewardUserEventsResponse,
    StreakRewardUserEvent,
    StreakRewardUserInfo,
)

from app.v2.services.v2_admin_mission_service import V2AdminMissionService
from app.v2.services.streak_service import V2StreakService
from app.v2.services import V2AdminAuditService
from app.v2.schemas.v2_admin_user import (
    SetStreakCountRequest,
    UserStreakAdminDto,
    MilestoneProgressDto,
    UserMilestoneProgressResponse,
    ForceGrantMilestoneRequest,
    ForceGrantMilestoneResponse,
    DistributeMilestoneRequest,
    DistributeMilestoneResponse,
)

router = APIRouter(prefix="/streak-rewards", tags=["v2-admin-streak"])
logger = logging.getLogger(__name__)


@router.get("/daily-counts", response_model=StreakRewardDailyCountsResponse)
def get_streak_daily_counts(
    day: date = Query(default_factory=date.today),
    db: Session = Depends(get_db),
    admin_info: tuple[int, str] = Depends(get_current_admin_info),
):
    day_str = day.isoformat()
    return StreakRewardDailyCountsResponse(
        day=day,
        grant_day3=V2AdminMissionService.count_streak_events(db, event_name=f"streak.reward_grant.3.{day_str}"),
        grant_day7=V2AdminMissionService.count_streak_events(db, event_name=f"streak.reward_grant.7.{day_str}"),
        skip_day3=V2AdminMissionService.count_streak_events(db, event_name=f"streak.reward_skip.3.{day_str}"),
        skip_day7=V2AdminMissionService.count_streak_events(db, event_name=f"streak.reward_skip.7.{day_str}"),
    )


@router.get("/user-events", response_model=StreakRewardUserEventsResponse)
def get_streak_user_events(
    user_id: Optional[int] = Query(None, ge=1),
    external_id: Optional[str] = Query(None),
    day: Optional[date] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    admin_info: tuple[int, str] = Depends(get_current_admin_info),
):
    user = None
    if external_id:
        user = db.query(V2User).filter(V2User.cc_id == external_id).first()
        if not user:
             raise HTTPException(status_code=404, detail="USER_NOT_FOUND")
    elif user_id:
        user = db.query(V2User).filter(V2User.id == user_id).first()
        if not user:
             raise HTTPException(status_code=404, detail="USER_NOT_FOUND")
    else:
        raise HTTPException(status_code=400, detail="REQUIRE_USER_ID_OR_EXTERNAL_ID")

    query = (
        db.query(UserEventLog)
        .filter(
            UserEventLog.user_id == user.id,
            UserEventLog.feature_type == "STREAK",
            UserEventLog.event_name.like("streak.reward_%")
        )
        .order_by(UserEventLog.created_at.desc())
    )

    if day:
        day_str = day.isoformat()
        query = query.filter(UserEventLog.event_name.like(f"streak.reward_%.{day_str}"))

    rows = query.limit(limit).all()

    return StreakRewardUserEventsResponse(
        user=StreakRewardUserInfo(
            id=user.id,
            external_id=user.cc_id,
            nickname=user.nickname
        ),
        items=[
            StreakRewardUserEvent(
                id=r.id,
                user_id=r.user_id,
                feature_type=r.feature_type,
                event_name=r.event_name,
                meta_json=r.meta_json,
                created_at=r.created_at
            ) for r in rows
        ]
    )


# ─────────────────────────────────────────────────────────────────
# Streak Admin API (V2)
# ─────────────────────────────────────────────────────────────────

@router.get("/users/{user_id}", response_model=UserStreakAdminDto)
def get_user_streak_admin(
    user_id: int,
    db: Session = Depends(get_db),
    admin_info: tuple[int, str] = Depends(get_current_admin_info),
):
    """
    유저 스트릭 상세 정보 조회 (어드민용)

    Returns:
        UserStreakAdminDto: 스트릭 상세 정보
    """
    user = db.get(V2User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="USER_NOT_FOUND")

    streak_service = V2StreakService(db)
    info = streak_service.get_user_streak_info(user_id)

    return UserStreakAdminDto(
        user_id=user_id,
        streak_days=info.streak_days,
        last_play_date=user.last_play_date.isoformat() if user.last_play_date else None,
        is_hot=info.is_hot,
        is_legend=info.is_legend,
        next_milestone=info.next_milestone,
        claimable_day=info.claimable_day,
        current_multiplier=info.current_multiplier,
    )


@router.post("/users/{user_id}/reset")
def reset_user_streak_admin(
    user_id: int,
    db: Session = Depends(get_db),
    admin_info: tuple[int, str] = Depends(get_current_admin_info),
):
    """
    유저 스트릭 초기화 (어드민용)

    - play_streak = 0
    - last_play_date = None

    Permission: ADMIN 이상
    """
    admin_id, admin_role = admin_info

    if admin_role not in ["ADMIN", "OPERATOR", "SUPER_ADMIN"]:
        raise HTTPException(status_code=403, detail="NOT_AUTHORIZED")

    user = db.get(V2User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="USER_NOT_FOUND")

    old_streak = int(user.play_streak or 0)

    streak_service = V2StreakService(db)
    success = streak_service.reset_user_streak(user_id)

    if not success:
        raise HTTPException(status_code=500, detail="STREAK_RESET_FAILED")

    # 감사 로그 기록
    V2AdminAuditService.log(
        db, admin_id, "STREAK_RESET", "USER", str(user_id),
        before={"streak_days": old_streak},
        after={"streak_days": 0}
    )

    logger.info(f"[ADMIN] Streak reset: user_id={user_id}, old={old_streak}, admin_id={admin_id}")

    return {"success": True, "user_id": user_id, "old_streak": old_streak, "new_streak": 0}


@router.post("/users/{user_id}/set-count")
def set_user_streak_count(
    user_id: int,
    payload: SetStreakCountRequest,
    db: Session = Depends(get_db),
    admin_info: tuple[int, str] = Depends(get_current_admin_info),
):
    """
    스트릭 일수 직접 설정 (어드민용)

    Args:
        streak_days: 설정할 스트릭 일수 (0~365)
        adjust_last_play_date: last_play_date도 자동 조정할지 여부

    Permission: ADMIN 이상
    """
    admin_id, admin_role = admin_info

    if admin_role not in ["ADMIN", "OPERATOR", "SUPER_ADMIN"]:
        raise HTTPException(status_code=403, detail="NOT_AUTHORIZED")

    user = db.get(V2User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="USER_NOT_FOUND")

    old_streak = int(user.play_streak or 0)

    streak_service = V2StreakService(db)
    result = streak_service.set_streak_count(
        user_id,
        payload.streak_days,
        adjust_last_play_date=payload.adjust_last_play_date,
    )

    if not result.get("success"):
        raise HTTPException(status_code=500, detail=result.get("message", "SET_STREAK_FAILED"))

    # 감사 로그 기록
    V2AdminAuditService.log(
        db, admin_id, "STREAK_SET_COUNT", "USER", str(user_id),
        before={"streak_days": old_streak},
        after={"streak_days": payload.streak_days}
    )

    logger.info(
        f"[ADMIN] Streak set: user_id={user_id}, "
        f"old={old_streak}, new={payload.streak_days}, admin_id={admin_id}"
    )

    return result


@router.get("/users/{user_id}/milestone-progress", response_model=UserMilestoneProgressResponse)
def get_user_milestone_progress(
    user_id: int,
    db: Session = Depends(get_db),
    admin_info: tuple[int, str] = Depends(get_current_admin_info),
):
    """
    유저 마일스톤 진행 현황 조회

    Returns:
        UserMilestoneProgressResponse: 각 마일스톤별 달성/클레임 여부
    """
    user = db.get(V2User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="USER_NOT_FOUND")

    streak_service = V2StreakService(db)
    milestones = streak_service.get_milestone_progress(user_id)

    return UserMilestoneProgressResponse(
        user_id=user_id,
        streak_days=int(user.play_streak or 0),
        milestones=[
            MilestoneProgressDto(
                day=m["day"],
                achieved=m["achieved"],
                claimed=m["claimed"],
                claim_date=m.get("claim_date"),
                rewards=m.get("rewards"),
            )
            for m in milestones
        ],
    )


@router.post("/users/{user_id}/force-grant-milestone", response_model=ForceGrantMilestoneResponse)
def force_grant_milestone(
    user_id: int,
    payload: ForceGrantMilestoneRequest,
    db: Session = Depends(get_db),
    admin_info: tuple[int, str] = Depends(get_current_admin_info),
):
    """
    마일스톤 보상 강제 지급

    - 특정 마일스톤 일수의 보상을 강제로 지급
    - UserEventLog에 streak.reward_grant.{day}.{date} 기록

    Permission: ADMIN 이상
    """
    admin_id, admin_role = admin_info

    if admin_role not in ["ADMIN", "OPERATOR", "SUPER_ADMIN"]:
        raise HTTPException(status_code=403, detail="NOT_AUTHORIZED")

    user = db.get(V2User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="USER_NOT_FOUND")

    streak_service = V2StreakService(db)
    result = streak_service.force_grant_milestone(
        user_id,
        payload.milestone_day,
        reason=payload.reason,
    )

    if not result.get("success"):
        return ForceGrantMilestoneResponse(
            success=False,
            user_id=user_id,
            milestone_day=payload.milestone_day,
            grants=[],
            message=result.get("message", "FORCE_GRANT_FAILED"),
        )

    # 감사 로그 기록
    V2AdminAuditService.log(
        db, admin_id, "MILESTONE_FORCE_GRANT", "USER", str(user_id),
        after={
            "milestone_day": payload.milestone_day,
            "grants": result.get("grants", []),
            "reason": payload.reason,
        }
    )

    logger.info(
        f"[ADMIN] Milestone force grant: user_id={user_id}, "
        f"day={payload.milestone_day}, admin_id={admin_id}"
    )

    return ForceGrantMilestoneResponse(
        success=True,
        user_id=user_id,
        milestone_day=payload.milestone_day,
        grants=result.get("grants", []),
        message="마일스톤 보상이 지급되었습니다.",
    )


@router.post("/distribute-milestone-reward", response_model=DistributeMilestoneResponse)
def distribute_milestone_reward(
    payload: DistributeMilestoneRequest,
    db: Session = Depends(get_db),
    admin_info: tuple[int, str] = Depends(get_current_admin_info),
):
    """
    다수 유저에게 마일스톤 보상 일괄 배포

    Args:
        milestone_day: 배포할 마일스톤 일수
        user_ids: 대상 유저 ID 목록 (None이면 조건에 맞는 전체)
        segment: 특정 세그먼트만 대상

    Permission: ADMIN 이상
    """
    admin_id, admin_role = admin_info

    if admin_role not in ["ADMIN", "OPERATOR", "SUPER_ADMIN"]:
        raise HTTPException(status_code=403, detail="NOT_AUTHORIZED")

    # 대상 유저 결정
    if payload.user_ids:
        target_user_ids = payload.user_ids
    elif payload.segment:
        # 세그먼트 기반 조회
        segments = db.query(UserSegment).filter(
            UserSegment.segment == payload.segment
        ).all()
        target_user_ids = [s.user_id for s in segments]
    else:
        # 조건에 맞는 전체 유저 (streak_days >= milestone_day인 유저)
        users = db.query(V2User).filter(
            V2User.play_streak >= payload.milestone_day
        ).all()
        target_user_ids = [u.id for u in users]

    if not target_user_ids:
        return DistributeMilestoneResponse(
            success=True,
            milestone_day=payload.milestone_day,
            total_users=0,
            success_count=0,
            failed_count=0,
            details=[],
        )

    # 일괄 지급
    streak_service = V2StreakService(db)
    details = []
    success_count = 0
    failed_count = 0

    for uid in target_user_ids:
        result = streak_service.force_grant_milestone(
            uid,
            payload.milestone_day,
            reason=payload.reason,
            commit=False,
        )

        if result.get("success"):
            success_count += 1
            details.append({
                "user_id": uid,
                "status": "success",
                "grants": result.get("grants", []),
            })
        else:
            failed_count += 1
            details.append({
                "user_id": uid,
                "status": "failed",
                "message": result.get("message", "UNKNOWN_ERROR"),
            })

    db.commit()

    # 감사 로그 기록
    V2AdminAuditService.log(
        db, admin_id, "MILESTONE_DISTRIBUTE", "BATCH", f"milestone_{payload.milestone_day}",
        after={
            "milestone_day": payload.milestone_day,
            "total_users": len(target_user_ids),
            "success_count": success_count,
            "failed_count": failed_count,
            "reason": payload.reason,
        }
    )

    logger.info(
        f"[ADMIN] Milestone distribute: day={payload.milestone_day}, "
        f"total={len(target_user_ids)}, success={success_count}, failed={failed_count}, "
        f"admin_id={admin_id}"
    )

    return DistributeMilestoneResponse(
        success=True,
        milestone_day=payload.milestone_day,
        total_users=len(target_user_ids),
        success_count=success_count,
        failed_count=failed_count,
        details=details,
    )
