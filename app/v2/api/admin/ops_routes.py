from datetime import datetime, date, timedelta
from typing import List, Optional
import json
import asyncio
import logging

from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect, Query
from pydantic import BaseModel
from sqlalchemy import func, text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.v2.api.deps import get_current_admin_info, get_db
from app.v2.models.user import V2User
from app.v2.models import UserRetentionState
from app.v2.models import ExternalRankingDailyDepositDelta
from app.v2.models import VaultWithdrawalRequest
from app.v2.models import UserGameWalletLedger
from app.v2.services import V2AdminAuditService
from app.v2.models.v2_golden_intervention_log import V2GoldenInterventionLog
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
    InterventionLogDto,
    GoldenGameEventDto,
    OpsHQMarginStatsDto,
    RevenueStatsDto,
    DetailedRiskUserDto,
    OpportunityUserDto,
)
from app.v2.schemas.v2_admin_streak import StreakDailyMetric, StreakMetricsResponse
from app.v2.schemas.v2_notification_feed import FeedConfigResponse, FeedJackpotConfig

logger = logging.getLogger(__name__)

router = APIRouter()



def check_admin_permission(role: str):
    if role not in ["ADMIN", "OPERATOR", "SUPER_ADMIN"]:
        raise HTTPException(status_code=403, detail="NOT_AUTHORIZED")


@router.get("/ops/status", response_model=OpsDashboardResponse)
def get_ops_dashboard_status(
    db: Session = Depends(get_db),
    admin_info: tuple[int, str] = Depends(get_current_admin_info),
):
    admin_id, admin_role = admin_info
    check_admin_permission(admin_role)

    # System status checks
    db_status = "OK"
    try:
        db.execute(text("SELECT 1"))
    except Exception:
        db_status = "ERROR"

    redis_status = "DEGRADED"
    try:
        from app.core.config import get_settings
        import redis

        settings = get_settings()
        if settings.redis_url:
            redis_client = redis.from_url(settings.redis_url, decode_responses=True)
            redis_client.ping()
            redis_status = "OK"
        else:
            redis_status = "DEGRADED"
    except Exception:
        redis_status = "ERROR"

    worker_status = "OK" if redis_status == "OK" else "DEGRADED"
    system_status = OpsSystemStatusDto(db=db_status, redis=redis_status, worker=worker_status)

    # High rollers: total charge >= 1,000,000
    high_rollers_count = db.query(V2User).filter(V2User.total_charge_amount >= 1000000).count()

    # Risk users by churn score
    risk_users_query = (
        db.query(V2User, UserRetentionState)
        .join(UserRetentionState, V2User.id == UserRetentionState.user_id)
        .filter(UserRetentionState.churn_probability_score >= 0.7)
        .order_by(UserRetentionState.churn_probability_score.desc())
        .limit(10)
        .all()
    )

    risk_users = []
    churn_scores: list[float] = []
    for u, ret in risk_users_query:
        churn_scores.append(float(ret.churn_probability_score))
        risk_users.append(
            OpsRiskUserDto(
                user_id=u.id,
                nickname=u.nickname or "",
                risk_level="HIGH" if ret.churn_probability_score > 0.85 else "MEDIUM",
                risk_reason="High Churn Score",
                churn_score=float(ret.churn_probability_score),
            )
        )

    avg_churn_score = (
        sum(churn_scores) / len(churn_scores)
        if churn_scores
        else None
    )

    # Online now: last login within 5 minutes (UTC naive)
    utc_now = datetime.utcnow()
    online_since = utc_now - timedelta(minutes=5)
    online_now = db.query(V2User).filter(V2User.last_login_at >= online_since).count()

    # Business day 기준 개입 건수
    from app.v2.utils.timezone import business_day_start, KST

    business_start_utc = business_day_start().replace(tzinfo=None)
    interventions_today = db.query(func.count(V2GoldenInterventionLog.id)).filter(
        V2GoldenInterventionLog.created_at >= business_start_utc
    ).scalar() or 0

    success_count = db.query(func.count(V2GoldenInterventionLog.id)).filter(
        V2GoldenInterventionLog.created_at >= business_start_utc,
        V2GoldenInterventionLog.status.in_(["APPROVED", "SENT"]),
    ).scalar() or 0

    intervention_success_rate = (
        (success_count / interventions_today) if interventions_today > 0 else None
    )

    golden_radar = OpsGoldenRadarDto(
        high_rollers=high_rollers_count,
        churn_risks=len(risk_users_query),
        online_now=online_now,
        avg_churn_score=avg_churn_score,
        radar_accuracy=None,
        interventions_today=interventions_today,
        intervention_success_rate=intervention_success_rate,
        risk_users=risk_users,
    )

    # Today revenue (business day KST date)
    business_date_kst = business_day_start().astimezone(KST).date()
    today_revenue = db.query(func.coalesce(func.sum(ExternalRankingDailyDepositDelta.deposit_delta), 0)).filter(
        ExternalRankingDailyDepositDelta.kst_date == business_date_kst,
        ExternalRankingDailyDepositDelta.deposit_delta > 0,
    ).scalar() or 0

    active_users_24h = db.query(V2User).filter(V2User.last_login_at >= (utc_now - timedelta(hours=24))).count()

    metrics = OpsMetricsDto(today_revenue=int(today_revenue), active_users_24h=active_users_24h)

    # [Phase 2] HQ Margin Stats
    from app.v2.services.hq_margin_stats_service import HQMarginStatsService
    try:
        hq_stats = HQMarginStatsService.get_hq_margin_stats(db)
    except SQLAlchemyError as exc:
        db.rollback()
        logger.exception("ops/status hq_stats query failed", exc_info=exc)
        hq_stats = OpsHQMarginStatsDto()

    # [Phase 3] CSV 데이터 기반 확장 - GameLogAnalyticsService
    from app.v2.services.game_log_analytics_service import GameLogAnalyticsService

    try:
        game_analytics = GameLogAnalyticsService(db)
        revenue_stats_data = game_analytics.get_revenue_summary()
        risk_users_data = game_analytics.get_risk_users(limit=10)
        opportunity_users_data = game_analytics.get_opportunity_users(limit=10)

        # DTO 변환
        revenue_stats = RevenueStatsDto(
            today_revenue=revenue_stats_data.get("today_revenue", 0),
            today_expenses=revenue_stats_data.get("today_expenses", 0),
            net_income=revenue_stats_data.get("net_income", 0),
            deposit_count=revenue_stats_data.get("deposit_count", 0),
            weekly_growth_rate=revenue_stats_data.get("weekly_growth_rate", 0.0),
            total_charge=revenue_stats_data.get("total_charge", 0),
            data_source=revenue_stats_data.get("data_source", "GAME_LOG"),
        ) if revenue_stats_data else None

        detailed_risk_users = [
            DetailedRiskUserDto(
                user_id=r["user_id"],
                nickname=r.get("nickname", ""),
                risk_type=r.get("risk_type", "UNKNOWN"),
                risk_level=r.get("risk_level", "MEDIUM"),
                risk_score=r.get("risk_score", 0.0),
                details=r.get("details", {}),
                last_activity_at=r.get("last_activity_at"),
            )
            for r in risk_users_data
        ]

        opportunity_user_list = [
            OpportunityUserDto(
                user_id=o["user_id"],
                nickname=o.get("nickname", ""),
                segment=o.get("segment", "VIP"),
                total_margin=o.get("total_margin", 0),
                total_charge=o.get("total_charge", 0),
                last_activity_at=o.get("last_activity_at"),
            )
            for o in opportunity_users_data
        ]
    except SQLAlchemyError as exc:
        db.rollback()
        logger.exception("ops/status game analytics query failed", exc_info=exc)
        revenue_stats = RevenueStatsDto()
        detailed_risk_users = []
        opportunity_user_list = []

    return OpsDashboardResponse(
        system=system_status, 
        golden_radar=golden_radar, 
        metrics=metrics,
        hq_stats=hq_stats,
        revenue_stats=revenue_stats,
        risk_users=detailed_risk_users,
        opportunity_users=opportunity_user_list,
    )


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
    start = now - timedelta(hours=range_hours)
    prev_start = start - timedelta(hours=range_hours)
    prev_end = start

    def calc_diff(current: int | float | None, previous: int | float | None) -> float | None:
        if current is None or previous is None or previous == 0:
            return None
        return (current - previous) / previous

    active_users = db.query(func.count(V2User.id)).filter(V2User.last_login_at >= start).scalar() or 0
    prev_active_users = db.query(func.count(V2User.id)).filter(
        V2User.last_login_at >= prev_start,
        V2User.last_login_at < prev_end,
    ).scalar() or 0

    game_participation = db.query(func.count(UserGameWalletLedger.id)).filter(
        UserGameWalletLedger.created_at >= start
    ).scalar() or 0
    prev_game_participation = db.query(func.count(UserGameWalletLedger.id)).filter(
        UserGameWalletLedger.created_at >= prev_start,
        UserGameWalletLedger.created_at < prev_end,
    ).scalar() or 0

    unique_players = db.query(func.count(func.distinct(UserGameWalletLedger.user_id))).filter(
        UserGameWalletLedger.created_at >= start
    ).scalar() or 0
    prev_unique_players = db.query(func.count(func.distinct(UserGameWalletLedger.user_id))).filter(
        UserGameWalletLedger.created_at >= prev_start,
        UserGameWalletLedger.created_at < prev_end,
    ).scalar() or 0

    ticket_usage = db.query(func.coalesce(func.sum(func.abs(UserGameWalletLedger.delta)), 0)).filter(
        UserGameWalletLedger.created_at >= start
    ).scalar() or 0
    prev_ticket_usage = db.query(func.coalesce(func.sum(func.abs(UserGameWalletLedger.delta)), 0)).filter(
        UserGameWalletLedger.created_at >= prev_start,
        UserGameWalletLedger.created_at < prev_end,
    ).scalar() or 0

    return DashboardMetricsResponse(
        range_hours=range_hours,
        generated_at=now,
        active_users=MetricValue(value=active_users, diff_percent=calc_diff(active_users, prev_active_users)),
        game_participation=MetricValue(value=game_participation, diff_percent=calc_diff(game_participation, prev_game_participation)),
        unique_players=MetricValue(value=unique_players, diff_percent=calc_diff(unique_players, prev_unique_players)),
        ticket_usage=MetricValue(value=ticket_usage, diff_percent=calc_diff(ticket_usage, prev_ticket_usage)),
        avg_session_time_seconds=MetricValue(value=None, diff_percent=None),
    )


@router.get("/dashboard/streak", response_model=StreakMetricsResponse)
def get_streak_metrics(
    days: int = 7,
    db: Session = Depends(get_db),
    admin_info: tuple[int, str] = Depends(get_current_admin_info),
):
    admin_id, admin_role = admin_info
    
    from sqlalchemy import func
    from datetime import date, timedelta
    from app.v2.models import UserEventLog
    
    end_date = datetime.utcnow().date()
    start_date = end_date - timedelta(days=days - 1)
    
    # Query promote counts per day
    promotes = (
        db.query(func.date(UserEventLog.created_at).label("day"), func.count().label("count"))
        .filter(
            UserEventLog.feature_type == "STREAK",
            UserEventLog.event_name == "streak.promote",
            UserEventLog.created_at >= datetime.combine(start_date, datetime.min.time())
        )
        .group_by(func.date(UserEventLog.created_at))
        .all()
    )
    
    # Query reset counts per day
    resets = (
        db.query(func.date(UserEventLog.created_at).label("day"), func.count().label("count"))
        .filter(
            UserEventLog.feature_type == "STREAK",
            UserEventLog.event_name == "streak.reset",
            UserEventLog.created_at >= datetime.combine(start_date, datetime.min.time())
        )
        .group_by(func.date(UserEventLog.created_at))
        .all()
    )
    
    promote_map = {str(r.day): r.count for r in promotes}
    reset_map = {str(r.day): r.count for r in resets}
    
    items = []
    for i in range(days):
        curr_day = start_date + timedelta(days=i)
        day_str = curr_day.isoformat()
        
        items.append(
            StreakDailyMetric(
                day=curr_day,
                promote=promote_map.get(day_str, 0),
                reset=reset_map.get(day_str, 0),
                vault_base_plays=0, # Placeholder or query from logs
                vault_bonus_applied=0
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
def get_dice_config_ops_stub(
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


@router.get("/ops/interventions", response_model=List[InterventionLogDto])
def get_intervention_logs(
    user_id: int = Query(..., description="Target user ID"),
    limit: int = Query(50, ge=1, le=500, description="Maximum number of logs to return"),
    db: Session = Depends(get_db),
    admin_info: tuple[int, str] = Depends(get_current_admin_info),
):
    """
    Get Golden intervention logs for a specific user.

    Returns chronological list of intervention events including:
    - Trigger conditions (e.g., TRG_LOSE_5, TRG_BAL_DROP_50)
    - Actions taken
    - User context (balance, recent results)
    - Cooldown information
    """
    admin_id, admin_role = admin_info

    logs = (
        db.query(V2GoldenInterventionLog)
        .filter(V2GoldenInterventionLog.user_id == user_id)
        .order_by(V2GoldenInterventionLog.created_at.desc())
        .limit(limit)
        .all()
    )

    return logs


# ==================== Golden CRM APIs ====================

class InterventionApprovalRequest(BaseModel):
    """개입 승인/거절 요청."""
    action: str  # APPROVE | REJECT


@router.get("/ops/interventions/pending")
def get_pending_interventions(
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    admin_info: tuple[int, str] = Depends(get_current_admin_info),
):
    """
    대기 중인 개입 목록 조회.
    
    Returns:
    ```json
    {
        "total": 10,
        "pending": [
            {
                "id": 1,
                "user_id": 42,
                "nickname": "테스트유저",
                "trigger_id": "TRG_LOSE_5",
                "action_taken": "Trigger_Pity_Win",
                "user_balance_before": 10000,
                "created_at": "2026-02-03T10:00:00"
            }
        ]
    }
    ```
    """
    admin_id, admin_role = admin_info
    check_admin_permission(admin_role)
    
    query = db.query(V2GoldenInterventionLog, V2User.nickname).join(
        V2User, V2User.id == V2GoldenInterventionLog.user_id
    ).filter(
        V2GoldenInterventionLog.status == "PENDING_APPROVAL"
    ).order_by(V2GoldenInterventionLog.created_at.desc())
    
    total = query.count()
    results = query.offset(offset).limit(limit).all()
    
    return {
        "total": total,
        "pending": [
            {
                "id": log.id,
                "user_id": log.user_id,
                "nickname": nickname or f"User#{log.user_id}",
                "trigger_id": log.trigger_id,
                "trigger_condition": log.trigger_condition,
                "action_taken": log.action_taken,
                "user_balance_before": log.user_balance_before,
                "recent_results": log.recent_results,
                "created_at": log.created_at.isoformat() if log.created_at else None,
            }
            for log, nickname in results
        ]
    }


@router.post("/ops/interventions/{intervention_id}/approve")
def approve_intervention(
    intervention_id: int,
    request: InterventionApprovalRequest,
    db: Session = Depends(get_db),
    admin_info: tuple[int, str] = Depends(get_current_admin_info),
):
    """
    개입 승인/거절 처리.
    
    - APPROVE: 개입 실행 (보상 지급)
    - REJECT: 개입 거절 (보상 미지급)
    """
    admin_id, admin_role = admin_info
    if admin_role not in ["ADMIN", "SUPER_ADMIN"]:
        raise HTTPException(status_code=403, detail="NOT_AUTHORIZED")
    
    intervention = db.query(V2GoldenInterventionLog).filter(
        V2GoldenInterventionLog.id == intervention_id
    ).first()
    
    if not intervention:
        raise HTTPException(status_code=404, detail="INTERVENTION_NOT_FOUND")
    
    if intervention.status != "PENDING_APPROVAL":
        raise HTTPException(status_code=400, detail="INTERVENTION_ALREADY_PROCESSED")
    
    action = request.action.upper()
    if action not in ["APPROVE", "REJECT"]:
        raise HTTPException(status_code=400, detail="INVALID_ACTION")
    
    if action == "APPROVE":
        intervention.status = "APPROVED"
        # TODO: 실제 보상 지급 로직 연결
        # golden_intervention_service.execute_intervention(intervention)
    else:
        intervention.status = "REJECTED"
    
    db.commit()
    
    # 감사 로그 기록
    V2AdminAuditService.log(
        db,
        admin_id,
        f"INTERVENTION_{action}",
        "GOLDEN_CRM",
        str(intervention_id),
        after={"user_id": intervention.user_id, "trigger_id": intervention.trigger_id},
    )
    
    return {
        "success": True,
        "intervention_id": intervention_id,
        "status": intervention.status,
    }


@router.post("/ops/interventions/batch")
def batch_approve_interventions(
    intervention_ids: List[int],
    action: str = Query(..., description="APPROVE 또는 REJECT"),
    db: Session = Depends(get_db),
    admin_info: tuple[int, str] = Depends(get_current_admin_info),
):
    """
    복수 개입 일괄 처리.
    """
    admin_id, admin_role = admin_info
    if admin_role not in ["ADMIN", "SUPER_ADMIN"]:
        raise HTTPException(status_code=403, detail="NOT_AUTHORIZED")
    
    action = action.upper()
    if action not in ["APPROVE", "REJECT"]:
        raise HTTPException(status_code=400, detail="INVALID_ACTION")
    
    new_status = "APPROVED" if action == "APPROVE" else "REJECTED"
    
    updated = db.query(V2GoldenInterventionLog).filter(
        V2GoldenInterventionLog.id.in_(intervention_ids),
        V2GoldenInterventionLog.status == "PENDING_APPROVAL"
    ).update({"status": new_status}, synchronize_session=False)
    
    db.commit()
    
    # 감사 로그
    V2AdminAuditService.log(
        db,
        admin_id,
        f"INTERVENTION_BATCH_{action}",
        "GOLDEN_CRM",
        ",".join(map(str, intervention_ids)),
        after={"count": updated},
    )
    
    return {
        "success": True,
        "processed_count": updated,
        "action": action,
    }


@router.websocket("/ws/golden/events")
async def ws_golden_events(websocket: WebSocket):
    """
    WebSocket endpoint for real-time Golden game event streaming.

    Subscribes to Redis channel: golden:v2:events:game
    Streams events to connected clients in real-time.

    Event format: GoldenGameEventDto
    """
    await websocket.accept()

    # Get Redis client
    from app.core.config import get_settings
    import redis.asyncio as aioredis

    settings = get_settings()

    if not settings.redis_url:
        await websocket.send_json({"error": "Redis not configured"})
        await websocket.close(code=1011)
        return

    redis_client = None
    pubsub = None

    try:
        # Connect to Redis
        redis_client = await aioredis.from_url(
            settings.redis_url,
            encoding="utf-8",
            decode_responses=True,
        )

        # Subscribe to Golden events channel
        pubsub = redis_client.pubsub()
        await pubsub.subscribe("golden:v2:events:game")

        # Send connection confirmation
        await websocket.send_json({
            "type": "connection",
            "status": "connected",
            "channel": "golden:v2:events:game",
        })

        # Listen for messages
        while True:
            try:
                # Get message with timeout
                message = await pubsub.get_message(ignore_subscribe_messages=True, timeout=1.0)

                if message and message["type"] == "message":
                    try:
                        # Parse and forward event
                        event_data = json.loads(message["data"])
                        await websocket.send_json({
                            "type": "event",
                            "data": event_data,
                        })
                    except json.JSONDecodeError:
                        # Skip malformed messages
                        continue

                # Allow other tasks to run
                await asyncio.sleep(0.01)

            except WebSocketDisconnect:
                break

    except Exception as e:
        # Send error to client if still connected
        try:
            await websocket.send_json({
                "type": "error",
                "message": str(e),
            })
        except:  # noqa: E722
            pass

    finally:
        # Cleanup
        if pubsub:
            try:
                await pubsub.unsubscribe("golden:v2:events:game")
                await pubsub.close()
            except:  # noqa: E722
                pass

        if redis_client:
            try:
                await redis_client.close()
            except:  # noqa: E722
                pass

        try:
            await websocket.close()
        except:  # noqa: E722
            pass


# ─────────────────────────────────────────────────────────────────
# Active User Statistics (활성 유저 통계)
# ─────────────────────────────────────────────────────────────────

class ActiveUserStatsDto(BaseModel):
    """활성 유저 통계"""
    dau: int  # Daily Active Users
    wau: int  # Weekly Active Users
    mau: int  # Monthly Active Users
    dau_change: float  # 전일 대비 변화율
    wau_change: float  # 전주 대비 변화율
    new_users_today: int
    new_users_this_week: int
    avg_session_count: float


class ActiveUserTrendDto(BaseModel):
    """활성 유저 추이"""
    date: str
    dau: int
    new_users: int


class ActiveUserStatsResponse(BaseModel):
    """활성 유저 통계 응답"""
    stats: ActiveUserStatsDto
    trend: List[ActiveUserTrendDto]


@router.get("/ops/active-users", response_model=ActiveUserStatsResponse)
def get_active_user_stats(
    days: int = Query(7, ge=1, le=30, description="추이 기간 (일)"),
    db: Session = Depends(get_db),
    admin_info: tuple[int, str] = Depends(get_current_admin_info),
):
    """
    활성 유저 통계

    - DAU (Daily Active Users)
    - WAU (Weekly Active Users)
    - MAU (Monthly Active Users)
    - 신규 가입자 수
    - 일별 추이
    """
    from zoneinfo import ZoneInfo

    tz = ZoneInfo("Asia/Seoul")
    now = datetime.now(tz)
    today = now.date()

    today_start = datetime.combine(today, datetime.min.time())
    week_start = datetime.combine(today - timedelta(days=7), datetime.min.time())
    month_start = datetime.combine(today - timedelta(days=30), datetime.min.time())
    yesterday_start = datetime.combine(today - timedelta(days=1), datetime.min.time())
    prev_week_start = datetime.combine(today - timedelta(days=14), datetime.min.time())

    # DAU
    dau = db.query(func.count(V2User.id)).filter(
        V2User.last_login_at >= today_start,
    ).scalar() or 0

    # WAU
    wau = db.query(func.count(V2User.id)).filter(
        V2User.last_login_at >= week_start,
    ).scalar() or 0

    # MAU
    mau = db.query(func.count(V2User.id)).filter(
        V2User.last_login_at >= month_start,
    ).scalar() or 0

    # 전일 DAU
    yesterday_dau = db.query(func.count(V2User.id)).filter(
        V2User.last_login_at >= yesterday_start,
        V2User.last_login_at < today_start,
    ).scalar() or 0

    # 전주 WAU
    prev_wau = db.query(func.count(V2User.id)).filter(
        V2User.last_login_at >= prev_week_start,
        V2User.last_login_at < week_start,
    ).scalar() or 0

    # 변화율 계산
    dau_change = ((dau - yesterday_dau) / yesterday_dau) if yesterday_dau > 0 else 0.0
    wau_change = ((wau - prev_wau) / prev_wau) if prev_wau > 0 else 0.0

    # 신규 유저
    new_users_today = db.query(func.count(V2User.id)).filter(
        V2User.created_at >= today_start,
    ).scalar() or 0

    new_users_this_week = db.query(func.count(V2User.id)).filter(
        V2User.created_at >= week_start,
    ).scalar() or 0

    # 추이 데이터
    trend = []
    for i in range(days):
        target_date = today - timedelta(days=i)
        target_start = datetime.combine(target_date, datetime.min.time())
        target_end = datetime.combine(target_date + timedelta(days=1), datetime.min.time())

        day_dau = db.query(func.count(V2User.id)).filter(
            V2User.last_login_at >= target_start,
            V2User.last_login_at < target_end,
        ).scalar() or 0

        day_new = db.query(func.count(V2User.id)).filter(
            V2User.created_at >= target_start,
            V2User.created_at < target_end,
        ).scalar() or 0

        trend.append(ActiveUserTrendDto(
            date=target_date.isoformat(),
            dau=day_dau,
            new_users=day_new,
        ))

    trend.reverse()

    return ActiveUserStatsResponse(
        stats=ActiveUserStatsDto(
            dau=dau,
            wau=wau,
            mau=mau,
            dau_change=round(dau_change, 4),
            wau_change=round(wau_change, 4),
            new_users_today=new_users_today,
            new_users_this_week=new_users_this_week,
            avg_session_count=0.0,
        ),
        trend=trend,
    )


# ─────────────────────────────────────────────────────────────────
# Daily Revenue & Spending (일간 수익/지출 계산)
# ─────────────────────────────────────────────────────────────────

class DailyRevenueStatsDto(BaseModel):
    """일간 수익 통계"""
    date: str
    total_deposits: int  # 총 입금액
    deposit_count: int  # 입금 건수
    unique_depositors: int  # 입금한 유저 수


class DailySpendingStatsDto(BaseModel):
    """일간 지출 통계"""
    date: str
    total_withdrawals: int  # 총 출금액 (승인된 것만)
    withdrawal_count: int  # 출금 건수
    pending_withdrawals: int  # 대기 중인 출금액


class DailyFinanceResponse(BaseModel):
    """일간 재무 통계 응답"""
    date: str
    revenue: DailyRevenueStatsDto
    spending: DailySpendingStatsDto
    net_income: int  # 순수익 (입금 - 출금)


@router.get("/ops/daily-revenue", response_model=DailyRevenueStatsDto)
def get_daily_revenue(
    target_date: str = Query(None, description="날짜 (YYYY-MM-DD), 기본값: 오늘"),
    db: Session = Depends(get_db),
    admin_info: tuple[int, str] = Depends(get_current_admin_info),
):
    """
    일간 CC입금액 확인 (daily_revenue)

    - 해당 날짜의 총 입금액
    - 입금 건수
    - 입금한 유저 수
    """
    if target_date:
        query_date = date.fromisoformat(target_date)
    else:
        from zoneinfo import ZoneInfo
        query_date = datetime.now(ZoneInfo("Asia/Seoul")).date()

    stats = db.query(
        func.coalesce(func.sum(ExternalRankingDailyDepositDelta.deposit_delta), 0).label("total"),
        func.count(ExternalRankingDailyDepositDelta.id).label("count"),
        func.count(func.distinct(ExternalRankingDailyDepositDelta.user_id)).label("users"),
    ).filter(
        ExternalRankingDailyDepositDelta.kst_date == query_date,
        ExternalRankingDailyDepositDelta.deposit_delta > 0,
    ).first()

    return DailyRevenueStatsDto(
        date=query_date.isoformat(),
        total_deposits=int(stats.total or 0),
        deposit_count=int(stats.count or 0),
        unique_depositors=int(stats.users or 0),
    )


@router.get("/ops/daily-spending", response_model=DailySpendingStatsDto)
def get_daily_spending(
    target_date: str = Query(None, description="날짜 (YYYY-MM-DD), 기본값: 오늘"),
    db: Session = Depends(get_db),
    admin_info: tuple[int, str] = Depends(get_current_admin_info),
):
    """
    일간 지출(출금) 확인 (daily_spending)

    - 해당 날짜의 승인된 출금액
    - 출금 건수
    - 대기 중인 출금액
    """
    if target_date:
        query_date = date.fromisoformat(target_date)
    else:
        from zoneinfo import ZoneInfo
        query_date = datetime.now(ZoneInfo("Asia/Seoul")).date()

    target_start = datetime.combine(query_date, datetime.min.time())
    target_end = datetime.combine(query_date + timedelta(days=1), datetime.min.time())

    # 승인된 출금
    approved_stats = db.query(
        func.coalesce(func.sum(VaultWithdrawalRequest.amount), 0).label("total"),
        func.count(VaultWithdrawalRequest.id).label("count"),
    ).filter(
        VaultWithdrawalRequest.created_at >= target_start,
        VaultWithdrawalRequest.created_at < target_end,
        VaultWithdrawalRequest.status == "APPROVED",
    ).first()

    # 대기 중인 출금
    pending_total = db.query(
        func.coalesce(func.sum(VaultWithdrawalRequest.amount), 0)
    ).filter(
        VaultWithdrawalRequest.created_at >= target_start,
        VaultWithdrawalRequest.created_at < target_end,
        VaultWithdrawalRequest.status == "PENDING",
    ).scalar() or 0

    return DailySpendingStatsDto(
        date=query_date.isoformat(),
        total_withdrawals=int(approved_stats.total or 0),
        withdrawal_count=int(approved_stats.count or 0),
        pending_withdrawals=int(pending_total),
    )


@router.get("/ops/daily-finance", response_model=DailyFinanceResponse)
def get_daily_finance(
    target_date: str = Query(None, description="날짜 (YYYY-MM-DD), 기본값: 오늘"),
    db: Session = Depends(get_db),
    admin_info: tuple[int, str] = Depends(get_current_admin_info),
):
    """
    일간 재무 종합 (수익 + 지출)

    - 일간 입금액 (수익)
    - 일간 출금액 (지출)
    - 순수익 (입금 - 출금)
    """
    revenue = get_daily_revenue(target_date, db, admin_info)
    spending = get_daily_spending(target_date, db, admin_info)

    return DailyFinanceResponse(
        date=revenue.date,
        revenue=revenue,
        spending=spending,
        net_income=revenue.total_deposits - spending.total_withdrawals,
    )


# ─────────────────────────────────────────────────────────────────
# Audit Log Types (감시 로그)
# ─────────────────────────────────────────────────────────────────

class AuditLogDto(BaseModel):
    """감사 로그"""
    id: int
    admin_id: int
    action: str
    category: str
    target_id: Optional[str]
    before_data: Optional[dict]
    after_data: Optional[dict]
    created_at: datetime


class AuditLogResponse(BaseModel):
    """감사 로그 응답"""
    total: int
    logs: List[AuditLogDto]


@router.get("/ops/audit-logs", response_model=AuditLogResponse)
def get_audit_logs(
    action_filter: str = Query(None, description="액션 필터 (NUDGE_SEND, ROI_CALCULATE, ROLLBACK_EXECUTE 등)"),
    category_filter: str = Query(None, description="카테고리 필터"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    admin_info: tuple[int, str] = Depends(get_current_admin_info),
):
    """
    감시 로그 조회

    - NUDGE_SEND: 넛지 발송 기록
    - ROI_CALCULATE: ROI 계산 기록
    - ROLLBACK_EXECUTE: 롤백 실행 기록
    - 기타 골든 개입 기록
    """
    from app.v2.models import AdminAuditLog

    query = db.query(AdminAuditLog)

    if action_filter:
        query = query.filter(AdminAuditLog.action == action_filter)
    if category_filter:
        query = query.filter(AdminAuditLog.target_type == category_filter)

    total = query.count()

    logs = query.order_by(AdminAuditLog.created_at.desc()).offset(offset).limit(limit).all()

    return AuditLogResponse(
        total=total,
        logs=[
            AuditLogDto(
                id=log.id,
                admin_id=log.admin_id,
                action=log.action,
                category=log.target_type or "UNKNOWN",
                target_id=log.target_id,
                before_data=log.before_json,
                after_data=log.after_json,
                created_at=log.created_at,
            )
            for log in logs
        ],
    )


@router.post("/ops/log-action")
def log_admin_action(
    action: str = Query(..., description="액션 타입 (NUDGE_SEND, ROI_CALCULATE, ROLLBACK_EXECUTE)"),
    category: str = Query("GOLDEN", description="카테고리"),
    target_id: str = Query(None, description="대상 ID"),
    metadata: dict = None,
    db: Session = Depends(get_db),
    admin_info: tuple[int, str] = Depends(get_current_admin_info),
):
    """
    어드민 액션 로그 기록

    - NUDGE_SEND: 넛지 발송 시
    - ROI_CALCULATE: ROI 계산 시
    - ROLLBACK_EXECUTE: 롤백 실행 시
    """
    admin_id, admin_role = admin_info
    check_admin_permission(admin_role)

    V2AdminAuditService.log(
        db,
        admin_id,
        action,
        category,
        target_id,
        after=metadata,
    )

    return {"success": True, "action": action}
