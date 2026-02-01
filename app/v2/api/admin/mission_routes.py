from typing import List, Optional
from datetime import datetime, date, timedelta
from zoneinfo import ZoneInfo
import logging

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.api.deps import get_current_admin_info, get_db
from app.v2.models import Mission, MissionRewardType, UserMissionProgress, UserStreak
from app.v2.models.user import V2User

from app.v2.services.v2_admin_mission_service import V2AdminMissionService
from app.v2.services import V2AdminAuditService

router = APIRouter()
logger = logging.getLogger(__name__)


class AdminMissionDto(BaseModel):
    id: int
    category: str
    title: str
    condition: str
    targetValue: int
    logicKey: str
    actionType: str | None = None
    rewardType: str
    rewardAmount: int
    isActive: bool


class AdminMissionUpdateRequest(BaseModel):
    category: str | None = None
    title: str | None = None
    condition: str | None = None
    targetValue: int | None = None
    logicKey: str | None = None
    actionType: str | None = None
    rewardType: str | None = None
    rewardAmount: int | None = None
    isActive: bool | None = None


class AdminMissionCreateRequest(BaseModel):
    category: str
    title: str
    condition: str | None = None
    targetValue: int
    logicKey: str
    actionType: str | None = None
    rewardType: str
    rewardAmount: int
    isActive: bool | None = True


def _normalize_mission_category(value: str) -> str:
    raw = str(value or "").strip().upper()
    if raw == "SPECIAL_EVENT":
        return "SPECIAL"
    return raw


def _normalize_mission_reward_type(value: str) -> MissionRewardType:
    reward_type_raw = str(value or "").strip().upper()
    legacy_map = {
        "VAULT": "POINT",
        "ROULETTE_TICKET": "TICKET_ROULETTE",
        "DICE_TICKET": "TICKET_DICE",
        "LOTTERY_TICKET": "TICKET_LOTTERY",
        "GOLD_KEY_TICKET": "GOLD_KEY",
        "DIAMOND_TICKET": "DIAMOND_KEY",
    }
    reward_type_norm = legacy_map.get(reward_type_raw, reward_type_raw)
    try:
        return MissionRewardType(reward_type_norm)
    except Exception:
        raise HTTPException(status_code=400, detail="INVALID_REWARD_TYPE")


@router.get("/game/missions", response_model=List[AdminMissionDto])
def get_admin_missions(
    db: Session = Depends(get_db),
    admin_info: tuple[int, str] = Depends(get_current_admin_info),
):
    missions = V2AdminMissionService.list_missions(db)

    result = []
    for m in missions:
        result.append(
            AdminMissionDto(
                id=m.id,
                category=m.category.value if hasattr(m.category, "value") else str(m.category),
                title=m.title,
                condition=m.description or f"Target: {m.target_value}",
                targetValue=m.target_value,
                logicKey=m.logic_key,
                actionType=m.action_type,
                rewardType=str(m.reward_type.value if hasattr(m.reward_type, "value") else m.reward_type),
                rewardAmount=m.reward_amount,
                isActive=m.is_active,
            )
        )
    return result


@router.post("/game/missions")
def create_admin_mission(
    payload: AdminMissionCreateRequest,
    db: Session = Depends(get_db),
    admin_info: tuple[int, str] = Depends(get_current_admin_info),
):
    admin_id, admin_role = admin_info
    if admin_role not in ["ADMIN", "OPERATOR", "SUPER_ADMIN"]:
        raise HTTPException(status_code=403, detail="NOT_AUTHORIZED")

    category_raw = _normalize_mission_category(payload.category)
    try:
        category_enum = Mission.category.type.enum_class(category_raw)
    except Exception:
        raise HTTPException(status_code=400, detail="INVALID_CATEGORY")

    # Duplicate check in service or route? Move to service ideally but keep it here for now if needed.
    if db.query(Mission).filter(Mission.logic_key == payload.logicKey).first():
        raise HTTPException(status_code=400, detail="DUPLICATE_LOGIC_KEY")

    reward_type = _normalize_mission_reward_type(payload.rewardType)

    data = {
        "title": payload.title,
        "description": payload.condition or f"Target: {payload.targetValue}",
        "category": category_enum,
        "logic_key": payload.logicKey,
        "action_type": payload.actionType,
        "target_value": int(payload.targetValue),
        "reward_type": reward_type,
        "reward_amount": int(payload.rewardAmount),
        "is_active": bool(payload.isActive),
    }
    
    mission = V2AdminMissionService.create_mission(db, data)
    V2AdminAuditService.log(
        db, admin_id, "MISSION_CREATE", "MISSION", str(mission.id),
        after=data
    )
    return {"success": True, "id": mission.id}


@router.put("/game/missions/{mission_id}")
def update_admin_mission(
    mission_id: int,
    payload: AdminMissionUpdateRequest,
    db: Session = Depends(get_db),
    admin_info: tuple[int, str] = Depends(get_current_admin_info),
):
    admin_id, _ = admin_info
    m = V2AdminMissionService.get_mission(db, mission_id)
    
    patch = {}
    if payload.category is not None:
        category_raw = _normalize_mission_category(payload.category)
        try:
            patch["category"] = Mission.category.type.enum_class(category_raw)
        except Exception:
            raise HTTPException(status_code=400, detail="INVALID_CATEGORY")

    if payload.title is not None: patch["title"] = payload.title
    if payload.condition is not None: patch["description"] = payload.condition
    if payload.logicKey is not None: patch["logic_key"] = payload.logicKey
    if payload.actionType is not None: patch["action_type"] = payload.actionType
    if payload.targetValue is not None: patch["target_value"] = payload.targetValue
    if payload.rewardType is not None: patch["reward_type"] = _normalize_mission_reward_type(payload.rewardType)
    if payload.rewardAmount is not None: patch["reward_amount"] = payload.rewardAmount
    if payload.isActive is not None: patch["is_active"] = payload.isActive

    V2AdminMissionService.update_mission(db, mission_id, patch)
    V2AdminAuditService.log(
        db, admin_id, "MISSION_UPDATE", "MISSION", str(mission_id),
        after=patch
    )
    return {"success": True}


@router.delete("/game/missions/{mission_id}")
def delete_admin_mission(
    mission_id: int,
    db: Session = Depends(get_db),
    admin_info: tuple[int, str] = Depends(get_current_admin_info),
):
    admin_id, admin_role = admin_info

    if admin_role not in ["ADMIN", "OPERATOR", "SUPER_ADMIN"]:
        raise HTTPException(status_code=403, detail="NOT_AUTHORIZED")

    V2AdminMissionService.delete_mission(db, mission_id)
    V2AdminAuditService.log(
        db, admin_id, "MISSION_DELETE", "MISSION", str(mission_id)
    )
    return {"success": True}


# ─────────────────────────────────────────────────────────────────
# 8.6 로그인 미션 검증 및 미션 통계
# ─────────────────────────────────────────────────────────────────

class LoginMissionStatusDto(BaseModel):
    """로그인 미션 상태"""
    user_id: int
    nickname: str
    today_login_completed: bool
    last_login_at: Optional[datetime] = None
    login_streak: int
    reset_hour_kst: int
    current_operational_date: str


class LoginMissionVerifyResponse(BaseModel):
    """로그인 미션 검증 응답"""
    total_users: int
    completed_today: int
    not_completed_today: int
    completion_rate: float
    users: List[LoginMissionStatusDto]


class MissionCompletionStatsDto(BaseModel):
    """미션 완료 통계"""
    mission_id: int
    title: str
    category: str
    total_attempts: int
    completed_count: int
    claimed_count: int
    completion_rate: float


class MissionStatsResponse(BaseModel):
    """미션 통계 응답"""
    total_missions: int
    active_missions: int
    stats: List[MissionCompletionStatsDto]


def _get_operational_date_kst(now: datetime | None = None, reset_hour: int = 9) -> date:
    """운영일 계산 (KST 09:00 리셋 기준)"""
    tz = ZoneInfo("Asia/Seoul")
    now_kst = (now or datetime.utcnow()).astimezone(tz) if now else datetime.now(tz)

    if now_kst.hour < reset_hour:
        return now_kst.date() - timedelta(days=1)
    return now_kst.date()


def _get_user_login_streak(db: Session, user_id: int) -> int:
    """user_streak 테이블에서 로그인 스트릭 조회 (없으면 0)"""
    streak = db.query(UserStreak).filter(UserStreak.user_id == user_id).first()
    return streak.current_streak if streak else 0


def _get_login_verify_mission(db: Session) -> Mission | None:
    """로그인 검증용 '일일 로그인' 미션을 결정적으로 선택한다.

    운영상/관리 UX상 로그인 검증은 '일일 출석/로그인 선물' 1개를 기준으로 해야 하므로,
    login 포함 키를 무작정 first()로 고르는 비결정성을 피한다.
    """
    preferred_logic_keys = [
        "daily_login_gift",
        "daily_login",
        "login",
    ]

    for logic_key in preferred_logic_keys:
        mission = (
            db.query(Mission)
            .filter(
                Mission.is_active == True,
                func.lower(Mission.logic_key) == logic_key,
            )
            .first()
        )
        if mission:
            return mission

    return (
        db.query(Mission)
        .filter(
            Mission.is_active == True,
            Mission.logic_key.ilike("%login%"),
        )
        .order_by(Mission.id.asc())
        .first()
    )


@router.get("/game/missions/login-verify", response_model=LoginMissionVerifyResponse)
def verify_login_missions(
    limit: int = Query(50, ge=1, le=200),
    completed_only: bool = Query(False, description="완료한 유저만 조회"),
    db: Session = Depends(get_db),
    admin_info: tuple[int, str] = Depends(get_current_admin_info),
):
    """
    로그인 미션 검증

    - 금일 로그인 리셋 확인 (09:00 KST 기준)
    - 유저별 로그인 미션 완료 여부
    """
    reset_hour = 9
    operational_date = _get_operational_date_kst(reset_hour=reset_hour)
    operational_date_str = operational_date.isoformat()

    # 로그인 미션 찾기 (결정적 선택: daily_login_gift 우선)
    login_mission = _get_login_verify_mission(db)

    if not login_mission:
        raise HTTPException(status_code=404, detail="LOGIN_MISSION_NOT_FOUND")

    # 오늘 완료한 유저 조회
    completed_query = (
        db.query(
            UserMissionProgress.user_id,
            V2User.nickname,
            V2User.last_login_at,
        )
        .outerjoin(V2User, UserMissionProgress.user_id == V2User.id)
        .filter(
            UserMissionProgress.mission_id == login_mission.id,
            UserMissionProgress.is_completed == True,
            UserMissionProgress.reset_date == operational_date_str,
        )
    )

    completed_rows = completed_query.limit(limit).all()
    completed_user_ids = {user_id for user_id, _, _ in completed_rows}

    # 미완료 유저 조회 (옵션)
    users_list = []

    if not completed_only:
        # 최근 로그인한 유저 중 미완료자
        recent_users = (
            db.query(
                V2User.id,
                V2User.nickname,
                V2User.last_login_at,
            )
            .filter(
                V2User.last_login_at >= datetime.utcnow() - timedelta(days=7),
                ~V2User.id.in_(completed_user_ids) if completed_user_ids else True,
            )
            .order_by(V2User.last_login_at.desc())
            .limit(limit // 2)
            .all()
        )

        for user_id, nickname, last_login_at in recent_users:
            users_list.append(LoginMissionStatusDto(
                user_id=user_id,
                nickname=nickname or "(미설정)",
                today_login_completed=False,
                last_login_at=last_login_at,
                login_streak=_get_user_login_streak(db, user_id),
                reset_hour_kst=reset_hour,
                current_operational_date=operational_date_str,
            ))

    # 완료 유저 추가
    for user_id, nickname, last_login_at in completed_rows:
        users_list.append(LoginMissionStatusDto(
            user_id=user_id,
            nickname=nickname or "(미설정)",
            today_login_completed=True,
            last_login_at=last_login_at,
            login_streak=_get_user_login_streak(db, user_id),
            reset_hour_kst=reset_hour,
            current_operational_date=operational_date_str,
        ))

    # 통계 계산
    total_completed = db.query(func.count(UserMissionProgress.id)).filter(
        UserMissionProgress.mission_id == login_mission.id,
        UserMissionProgress.is_completed == True,
        UserMissionProgress.reset_date == operational_date_str,
    ).scalar() or 0

    # 오늘 로그인한 유저 수 (근사치)
    today_start = datetime.combine(operational_date, datetime.min.time())
    total_today_logins = db.query(func.count(V2User.id)).filter(
        V2User.last_login_at >= today_start,
    ).scalar() or 0

    completion_rate = total_completed / total_today_logins if total_today_logins > 0 else 0.0

    return LoginMissionVerifyResponse(
        total_users=total_today_logins,
        completed_today=total_completed,
        not_completed_today=max(0, total_today_logins - total_completed),
        completion_rate=round(completion_rate, 4),
        users=users_list[:limit],
    )


# ─────────────────────────────────────────────────────────────────
# 미션 강제 리셋 (5.6)
# ─────────────────────────────────────────────────────────────────

class MissionResetRequest(BaseModel):
    """미션 리셋 요청"""
    mission_id: Optional[int] = None  # None이면 전체 미션
    reason: str


class MissionResetResponse(BaseModel):
    """미션 리셋 응답"""
    user_id: int
    reset_count: int
    missions_reset: List[int]


@router.post("/game/missions/reset-user/{user_id}", response_model=MissionResetResponse)
def reset_user_missions(
    user_id: int,
    payload: MissionResetRequest,
    db: Session = Depends(get_db),
    admin_info: tuple[int, str] = Depends(get_current_admin_info),
):
    """
    미션 강제 리셋

    특정 사용자의 미션 상태를 초기화합니다.
    - mission_id가 지정되면 해당 미션만 리셋
    - mission_id가 None이면 모든 미션 리셋
    - 감시 로그에 기록됨
    """
    admin_id, admin_role = admin_info

    if admin_role not in ["ADMIN", "OPERATOR", "SUPER_ADMIN"]:
        raise HTTPException(status_code=403, detail="NOT_AUTHORIZED")

    # 유저 존재 확인
    user = db.query(V2User).filter(V2User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="USER_NOT_FOUND")

    # 미션 진행 상태 조회
    query = db.query(UserMissionProgress).filter(UserMissionProgress.user_id == user_id)

    if payload.mission_id:
        query = query.filter(UserMissionProgress.mission_id == payload.mission_id)

    progresses = query.all()

    if not progresses:
        raise HTTPException(status_code=404, detail="NO_MISSION_PROGRESS_FOUND")

    # 리셋 수행
    reset_mission_ids = []
    for progress in progresses:
        before_state = {
            "progress": progress.progress,
            "is_completed": progress.is_completed,
            "is_claimed": progress.is_claimed,
        }

        progress.progress = 0
        progress.is_completed = False
        progress.is_claimed = False
        progress.reset_date = None

        reset_mission_ids.append(progress.mission_id)

        # 개별 미션 리셋 로그
        V2AdminAuditService.log(
            db,
            admin_id,
            "MISSION_RESET",
            "MISSION",
            f"user:{user_id}:mission:{progress.mission_id}",
            before=before_state,
            after={"progress": 0, "is_completed": False, "is_claimed": False, "reason": payload.reason},
        )

    db.commit()

    # 전체 리셋 로그
    V2AdminAuditService.log(
        db,
        admin_id,
        "MISSION_BULK_RESET",
        "MISSION",
        f"user:{user_id}",
        after={
            "missions_reset": reset_mission_ids,
            "count": len(reset_mission_ids),
            "reason": payload.reason,
        },
    )

    return MissionResetResponse(
        user_id=user_id,
        reset_count=len(reset_mission_ids),
        missions_reset=reset_mission_ids,
    )


@router.get("/game/missions/stats", response_model=MissionStatsResponse)
def get_mission_stats(
    db: Session = Depends(get_db),
    admin_info: tuple[int, str] = Depends(get_current_admin_info),
):
    """
    미션 완료 통계

    - 미션별 완료율, 클레임율
    - 전체 미션 현황
    """
    missions = db.query(Mission).all()

    stats = []
    active_count = 0

    for mission in missions:
        if mission.is_active:
            active_count += 1

        # SQLite/MySQL 호환을 위한 안전한 처리
        total_attempts = db.query(func.count(UserMissionProgress.id)).filter(
            UserMissionProgress.mission_id == mission.id
        ).scalar() or 0

        completed_count = db.query(func.count(UserMissionProgress.id)).filter(
            UserMissionProgress.mission_id == mission.id,
            UserMissionProgress.is_completed == True,
        ).scalar() or 0

        claimed_count = db.query(func.count(UserMissionProgress.id)).filter(
            UserMissionProgress.mission_id == mission.id,
            UserMissionProgress.is_claimed == True,
        ).scalar() or 0

        completion_rate = completed_count / total_attempts if total_attempts > 0 else 0.0

        stats.append(MissionCompletionStatsDto(
            mission_id=mission.id,
            title=mission.title,
            category=mission.category.value if hasattr(mission.category, "value") else str(mission.category),
            total_attempts=total_attempts,
            completed_count=completed_count,
            claimed_count=claimed_count,
            completion_rate=round(completion_rate, 4),
        ))

    return MissionStatsResponse(
        total_missions=len(missions),
        active_missions=active_count,
        stats=stats,
    )
