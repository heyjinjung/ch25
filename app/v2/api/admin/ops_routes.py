from datetime import datetime
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_current_admin_info, get_db
from app.models.user import User
from app.models.user_retention_state import UserRetentionState
from app.v2.schemas.v2_admin_dashboard import DashboardMetricsResponse, MetricValue
from app.v2.schemas.v2_admin_feature_schedule import (
    AdminFeatureScheduleCreate,
    AdminFeatureScheduleResponse,
)
from app.v2.schemas.v2_admin_game_config import AdminDiceConfigV2
from app.v2.schemas.v2_admin_ops import (
    OpsDashboardResponse,
    OpsGoldenRadarDto,
    OpsMetricsDto,
    OpsRiskUserDto,
    OpsSystemStatusDto,
)
from app.v2.schemas.v2_admin_streak import StreakDailyMetric, StreakMetricsResponse
from app.v2.schemas.v2_notification_feed import FeedConfigResponse, FeedJackpotConfig

router = APIRouter()


@router.get("/ops/status", response_model=OpsDashboardResponse)
def get_ops_dashboard_status(
    db: Session = Depends(get_db),
    admin_info: tuple[int, str] = Depends(get_current_admin_info),
):
    admin_id, admin_role = admin_info

    system_status = OpsSystemStatusDto(db="OK", redis="OK", worker="OK")

    high_rollers_count = db.query(User).filter(User.total_charge_amount >= 1000000).count()

    risk_users_query = (
        db.query(User, UserRetentionState)
        .join(UserRetentionState, User.id == UserRetentionState.user_id)
        .filter(UserRetentionState.churn_probability_score >= 0.7)
        .limit(10)
        .all()
    )

    risk_users = []
    for u, ret in risk_users_query:
        risk_users.append(
            OpsRiskUserDto(
                user_id=u.id,
                nickname=u.nickname,
                risk_level="HIGH" if ret.churn_probability_score > 0.85 else "MEDIUM",
                risk_reason="High Churn Score",
                churn_score=float(ret.churn_probability_score),
            )
        )

    online_now = 42

    golden_radar = OpsGoldenRadarDto(
        high_rollers=high_rollers_count,
        churn_risks=len(risk_users_query),
        online_now=online_now,
        risk_users=risk_users,
    )

    today_revenue = 0

    try:
        from zoneinfo import ZoneInfo

        kst_now = datetime.now(ZoneInfo("Asia/Seoul"))
        kst_today = kst_now.replace(hour=0, minute=0, second=0, microsecond=0)
        utc_start_of_day = kst_today.astimezone(ZoneInfo("UTC")).replace(tzinfo=None)
    except Exception:
        utc_start_of_day = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)

    dau_count = db.query(User).filter(User.last_login_at >= utc_start_of_day).count()

    metrics = OpsMetricsDto(today_revenue=today_revenue, active_users_24h=dau_count)

    return OpsDashboardResponse(system=system_status, golden_radar=golden_radar, metrics=metrics)


@router.get("/ops/dashboard", response_model=OpsDashboardResponse)
def get_ops_dashboard_alias(
    db: Session = Depends(get_db),
    admin_info: tuple[int, str] = Depends(get_current_admin_info),
):
    return get_ops_dashboard_status(db, admin_info)


@router.get("/ops/plans")
def list_ops_plans_stub(
    db: Session = Depends(get_db),
    admin_info: tuple[int, str] = Depends(get_current_admin_info),
):
    return []


@router.post("/ops/plans")
def create_ops_plan_stub(
    db: Session = Depends(get_db),
    admin_info: tuple[int, str] = Depends(get_current_admin_info),
):
    return {"status": "created"}


@router.get("/dashboard/metrics", response_model=DashboardMetricsResponse)
def get_dashboard_metrics(
    range_hours: int = 24,
    db: Session = Depends(get_db),
    admin_info: tuple[int, str] = Depends(get_current_admin_info),
):
    admin_id, admin_role = admin_info
    now = datetime.utcnow()

    return DashboardMetricsResponse(
        range_hours=range_hours,
        generated_at=now,
        active_users=MetricValue(value=150, diff_percent=5.2),
        game_participation=MetricValue(value=1200, diff_percent=12.5),
        unique_players=MetricValue(value=85, diff_percent=-2.1),
        ticket_usage=MetricValue(value=5000, diff_percent=0.0),
        avg_session_time_seconds=MetricValue(value=420, diff_percent=1.5),
    )


@router.get("/dashboard/streak", response_model=StreakMetricsResponse)
def get_streak_metrics(
    days: int = 7,
    db: Session = Depends(get_db),
    admin_info: tuple[int, str] = Depends(get_current_admin_info),
):
    admin_id, admin_role = admin_info

    items = []
    for i in range(days):
        items.append(
            StreakDailyMetric(
                day=datetime.utcnow().date(),
                promote=10,
                reset=2,
                vault_base_plays=100,
            )
        )

    return StreakMetricsResponse(days=days, generated_at=datetime.utcnow(), items=items)


@router.get("/feature-schedule", response_model=List[AdminFeatureScheduleResponse])
def list_feature_schedules(
    start_date: datetime,
    end_date: datetime,
    db: Session = Depends(get_db),
    admin_info: tuple[int, str] = Depends(get_current_admin_info),
):
    admin_id, admin_role = admin_info
    return []


@router.put("/feature-schedule", response_model=AdminFeatureScheduleResponse)
def upsert_feature_schedule(
    payload: AdminFeatureScheduleCreate,
    db: Session = Depends(get_db),
    admin_info: tuple[int, str] = Depends(get_current_admin_info),
):
    admin_id, admin_role = admin_info
    if admin_role not in ["ADMIN", "OPERATOR", "SUPER_ADMIN"]:
        raise HTTPException(status_code=403, detail="NOT_AUTHORIZED")
    return AdminFeatureScheduleResponse(
        id=1,
        date=payload.date,
        feature_type=payload.feature_type,
        is_active=payload.is_active,
        created_at=str(datetime.utcnow()),
    )


@router.get("/game-config/dice", response_model=AdminDiceConfigV2)
def get_dice_config(
    db: Session = Depends(get_db),
    admin_info: tuple[int, str] = Depends(get_current_admin_info),
):
    admin_id, admin_role = admin_info
    return AdminDiceConfigV2(
        name="Standard Dice",
        max_daily_plays=10,
        win_reward_type="POINT",
        win_reward_amount=100,
        draw_reward_type="NONE",
        draw_reward_amount=0,
        lose_reward_type="NONE",
        lose_reward_amount=0,
    )


@router.get("/feed/config", response_model=FeedConfigResponse)
def get_feed_config(
    db: Session = Depends(get_db),
    admin_info: tuple[int, str] = Depends(get_current_admin_info),
):
    admin_id, admin_role = admin_info
    return FeedConfigResponse(threshold=10000, mega_threshold=30000)


@router.put("/feed/config", response_model=FeedConfigResponse)
def update_feed_config(
    payload: FeedJackpotConfig,
    db: Session = Depends(get_db),
    admin_info: tuple[int, str] = Depends(get_current_admin_info),
):
    admin_id, admin_role = admin_info
    if admin_role not in ["ADMIN", "OPERATOR", "SUPER_ADMIN"]:
        raise HTTPException(status_code=403, detail="NOT_AUTHORIZED")
    return FeedConfigResponse(**payload.dict())
