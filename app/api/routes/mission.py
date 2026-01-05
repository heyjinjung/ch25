from typing import Any, List

from fastapi import APIRouter, Depends, HTTPException, Header, Request
from sqlalchemy.orm import Session
from time import perf_counter

from app.api import deps
from app.core.config import get_settings
from app.core.metrics import mission_claim_result_total, mission_claim_latency_seconds
from app.models.user import User
from app.services.mission_service import MissionService
from app.schemas.mission import MissionListResponse, MissionWithProgress
from app.utils.idempotency import idempotency_cache
from app.utils.rate_limit import rate_limiter

# /workspace/ch25/app/api/routes/mission.py
router = APIRouter(prefix="/api/mission", tags=["mission"])

@router.post("/streak/claim")
def claim_streak_reward(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Claim a pending streak milestone reward.
    """
    service = MissionService(db)
    result = service.claim_streak_reward(current_user.id)
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("message"))
    
    # Refresh mission/streak info to return latest state
    streak_info = service.get_streak_info(current_user.id)
    return {
        "success": True, 
        "streak_info": streak_info,
        "grants": result.get("grants")
    }

@router.get("/streak/rules")
def get_streak_rules(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user), # Require auth for consistency
) -> Any:
    """
    Get streak reward rules for the UI.
    """
    from app.services.ui_config_service import UiConfigService
    row = UiConfigService.get(db, "streak_reward_rules")
    if row and row.value_json:
        return row.value_json.get("rules", [])
    
    # Fallback default rules
    return []

@router.get("/", response_model=MissionListResponse)
def read_missions(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Get all daily missions and current user progress.
    """
    # [Lazy Daily Check] For users with persistent sessions who don't hit /auth/token
    try:
        from app.services.mission_service import MissionService
        from zoneinfo import ZoneInfo
        from datetime import datetime, timezone
        kst = ZoneInfo("Asia/Seoul")
        now_kst = datetime.now(kst)
        today_kst_date = now_kst.date()
        should_update = False

        if current_user.last_login_at:
            last_login_utc = current_user.last_login_at.replace(tzinfo=timezone.utc)
            last_login_kst = last_login_utc.astimezone(kst)
            if last_login_kst.date() < today_kst_date:
                should_update = True
        else:
            should_update = True
        
        if should_update:
            MissionService(db).update_progress(current_user.id, "LOGIN", delta=1)
            current_user.last_login_at = datetime.now(timezone.utc)
            db.commit()
    except Exception:
        # Don't block mission loading if check fails
        db.rollback()
        pass

    service = MissionService(db)
    missions = service.get_user_missions(current_user.id)
    streak_info = service.get_streak_info(current_user.id)
    return {"missions": missions, "streak_info": streak_info}

@router.post("/{mission_id}/claim")
def claim_mission_reward(
    mission_id: int,
    request: Request,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
    idempotency_key: str | None = Header(None, alias="X-Idempotency-Key"),
) -> Any:
    """
    Claim reward for a completed mission.
    """
    start_ts = perf_counter()
    status_label = "error"
    http_status = 500
    settings = get_settings()

    # Rate limit (per user + client host)
    rl_key = f"mission-claim:{current_user.id}:{request.client.host if request.client else 'unknown'}"
    if not rate_limiter.allow(rl_key, settings.golden_hour_claim_rate_rps, settings.golden_hour_claim_rate_burst):
        status_label = "rate_limit"
        http_status = 429
        mission_claim_result_total.labels(status=status_label, http_status=str(http_status)).inc()
        raise HTTPException(status_code=429, detail="Rate limit exceeded")

    # Idempotency guard (required)
    if not idempotency_key:
        status_label = "missing_idempotency_key"
        http_status = 400
        mission_claim_result_total.labels(status=status_label, http_status=str(http_status)).inc()
        raise HTTPException(status_code=400, detail="X-Idempotency-Key header required")
    idem_key = f"mission-claim:{current_user.id}:{mission_id}:{idempotency_key}"
    if not idempotency_cache.register(idem_key, settings.golden_hour_idempotency_ttl_sec):
        status_label = "duplicate"
        http_status = 409
        mission_claim_result_total.labels(status=status_label, http_status=str(http_status)).inc()
        raise HTTPException(status_code=409, detail="Duplicate request (idempotency)")

    service = MissionService(db)
    try:
        success, reward_type, amount = service.claim_reward(current_user.id, mission_id)
        if not success:
            status_label = (reward_type or "bad_request").lower().replace(" ", "_")[:32]
            http_status = 400
            raise HTTPException(status_code=400, detail=reward_type) # detail contains error msg
        status_label = "ok"
        http_status = 200
        return {
            "success": True, 
            "reward_type": reward_type, 
            "amount": amount
        }
    finally:
        elapsed = perf_counter() - start_ts
        mission_claim_latency_seconds.observe(elapsed)
        mission_claim_result_total.labels(status=status_label, http_status=str(http_status)).inc()

@router.post("/daily-gift")
def claim_daily_gift(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Claim the immediate daily login gift.
    """
    service = MissionService(db)
    success, reward_type, amount = service.claim_daily_gift(current_user.id)
    
    if not success:
        raise HTTPException(status_code=400, detail=reward_type)
    
    return {
        "success": True, 
        "reward_type": reward_type, 
        "amount": amount
    }
