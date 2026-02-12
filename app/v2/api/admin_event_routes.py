"""Admin Event Routes — 발렌타인 & 설날 이벤트 관리 API.

Endpoints:
  GET   /api/admin/events/valentine-seol/stats — 참여 통계
  PATCH /api/admin/events/secret-codes/{code_id} — 코드 활성/비활성
  POST  /api/admin/events/valentine-seol/sync — 전역 동기화
"""

import logging
from datetime import datetime
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import func, case
from sqlalchemy.orm import Session

from app.v2.api.deps import get_db
from app.v2.models.core.event_secret_code import EventSecretCode, UserSecretCodeClaim
from app.v2.models.core.mission import Mission
from app.v2.models.core.user_mission import UserMission

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/admin/events", tags=["admin-events"])


# ── Schemas ──────────────────────────────────────────────────────────────

class SecretCodeStats(BaseModel):
    id: int
    code: str
    event_date: str
    reward_type: str
    reward_amount: int
    is_active: bool
    claim_count: int
    expires_at: str


class MissionStats(BaseModel):
    mission_id: int
    title: str
    logic_key: str | None
    total_participants: int
    completed_count: int
    claimed_count: int
    completion_rate: float


class EventStatsResponse(BaseModel):
    secret_codes: list[SecretCodeStats]
    missions: list[MissionStats]
    total_participants: int
    streak_completed_count: int


class SecretCodeToggleRequest(BaseModel):
    is_active: bool


class SecretCodeToggleResponse(BaseModel):
    id: int
    code: str
    is_active: bool
    message: str


class SyncResponse(BaseModel):
    success: bool
    message: str
    synced_at: str


# ── Logic Keys ───────────────────────────────────────────────────────────

EVENT_LOGIC_KEYS = [
    "EVENT_VALENTINE_2026",
    "EVENT_SEOL_DAY1_2026",
    "EVENT_SEOL_DAY2_2026",
    "EVENT_SEOL_DAY3_2026",
    "EVENT_SEOL_STREAK_2026",
]


# ── GET /valentine-seol/stats ────────────────────────────────────────────

@router.get("/valentine-seol/stats", response_model=EventStatsResponse)
def get_event_stats(db: Session = Depends(get_db)):
    """발렌타인 & 설날 이벤트 참여 통계."""

    # 1) Secret Code Stats
    codes = db.query(EventSecretCode).order_by(EventSecretCode.event_date).all()
    code_stats: list[SecretCodeStats] = []
    for c in codes:
        claim_count = db.query(func.count(UserSecretCodeClaim.id)).filter(
            UserSecretCodeClaim.secret_code_id == c.id,
        ).scalar() or 0
        code_stats.append(SecretCodeStats(
            id=c.id,
            code=c.code,
            event_date=str(c.event_date),
            reward_type=c.reward_type,
            reward_amount=c.reward_amount,
            is_active=c.is_active,
            claim_count=claim_count,
            expires_at=str(c.expires_at),
        ))

    # 2) Mission Stats
    missions = db.query(Mission).filter(
        Mission.logic_key.in_(EVENT_LOGIC_KEYS),
        Mission.is_active == True,
    ).all()
    mission_stats: list[MissionStats] = []
    for m in missions:
        stats = db.query(
            func.count(UserMission.id).label("total"),
            func.sum(case((UserMission.is_completed == True, 1), else_=0)).label("completed"),
            func.sum(case((UserMission.is_claimed == True, 1), else_=0)).label("claimed"),
        ).filter(UserMission.mission_id == m.id).first()

        total = stats.total if stats else 0
        completed = int(stats.completed or 0) if stats else 0
        claimed = int(stats.claimed or 0) if stats else 0

        mission_stats.append(MissionStats(
            mission_id=m.id,
            title=m.title,
            logic_key=m.logic_key,
            total_participants=total,
            completed_count=completed,
            claimed_count=claimed,
            completion_rate=round((completed / total * 100) if total > 0 else 0, 1),
        ))

    # 3) Aggregate stats
    total_participants = db.query(func.count(func.distinct(UserMission.user_id))).join(
        Mission, UserMission.mission_id == Mission.id,
    ).filter(Mission.logic_key.in_(EVENT_LOGIC_KEYS)).scalar() or 0

    streak_mission = db.query(Mission).filter(
        Mission.logic_key == "EVENT_SEOL_STREAK_2026",
    ).first()
    streak_completed = 0
    if streak_mission:
        streak_completed = db.query(func.count(UserMission.id)).filter(
            UserMission.mission_id == streak_mission.id,
            UserMission.is_completed == True,
        ).scalar() or 0

    return EventStatsResponse(
        secret_codes=code_stats,
        missions=mission_stats,
        total_participants=total_participants,
        streak_completed_count=streak_completed,
    )


# ── PATCH /secret-codes/{code_id} ────────────────────────────────────────

@router.patch("/secret-codes/{code_id}", response_model=SecretCodeToggleResponse)
def toggle_secret_code(
    code_id: int,
    payload: SecretCodeToggleRequest,
    db: Session = Depends(get_db),
):
    """비밀코드 활성/비활성 토글."""
    code = db.query(EventSecretCode).filter(EventSecretCode.id == code_id).first()
    if not code:
        raise HTTPException(status_code=404, detail="SECRET_CODE_NOT_FOUND")

    code.is_active = payload.is_active
    code.updated_at = datetime.now(ZoneInfo("Asia/Seoul"))
    db.commit()
    db.refresh(code)

    logger.info(f"[Admin] Secret code {code.code} → is_active={code.is_active}")

    return SecretCodeToggleResponse(
        id=code.id,
        code=code.code,
        is_active=code.is_active,
        message=f"코드 '{code.code}' {'활성화' if code.is_active else '비활성화'} 완료",
    )


# ── POST /valentine-seol/sync ────────────────────────────────────────────

@router.post("/valentine-seol/sync", response_model=SyncResponse)
def sync_event(db: Session = Depends(get_db)):
    """전역 동기화 — 이벤트 캐시 무효화 (현재는 DB 타임스탬프 갱신)."""
    now_kst = datetime.now(ZoneInfo("Asia/Seoul"))

    # Touch all active secret codes to invalidate caches
    updated = db.query(EventSecretCode).filter(
        EventSecretCode.is_active == True,
    ).update({"updated_at": now_kst}, synchronize_session="fetch")

    db.commit()

    logger.info(f"[Admin] Event sync triggered, {updated} codes touched at {now_kst}")

    return SyncResponse(
        success=True,
        message=f"전역 동기화 완료 ({updated}개 코드 갱신)",
        synced_at=now_kst.isoformat(),
    )
