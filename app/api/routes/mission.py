from typing import Any, List

from fastapi import APIRouter, Depends, HTTPException, Header, Request, Response
from sqlalchemy.orm import Session
from time import perf_counter

from app.api import deps
from app.core.config import get_settings
from app.core.metrics import mission_claim_result_total, mission_claim_latency_seconds
from app.v2.models.user import V2User
from app.services.mission_service import MissionService
from app.schemas.mission import MissionListResponse, MissionWithProgress
from app.utils.idempotency import idempotency_cache
from app.utils.rate_limit import rate_limiter

# /workspace/ch25/app/api/routes/mission.py
# =============================================================================
# ⚠️ DEPRECATED: This router is deprecated. Use /api/v2/mission/* instead.
# Deprecation started: 2026-01-26
# Planned removal: 2026-02-26 (after 30 days)
# See: docs/v2_specs/00_sot_meta/00_A_sot_code_ops_chk/learned_/mission/10.mission_actionable_guides.md
# =============================================================================
router = APIRouter(prefix="/api/mission", tags=["mission-legacy"])


def _add_deprecation_headers(response: Response) -> None:
    """Add deprecation headers to legacy endpoint responses."""
    response.headers["Deprecation"] = "true"
    response.headers["Sunset"] = "2026-02-26"
    response.headers["Link"] = '</api/v2/mission>; rel="successor-version"'


@router.post("/streak/claim")
def claim_streak_reward(
    response: Response,
    db: Session = Depends(deps.get_db),
    current_user: V2User = Depends(deps.get_current_user),
) -> Any:
    """
    Claim a pending streak milestone reward.
    
    ⚠️ DEPRECATED: Use POST /api/v2/mission/streak/claim instead.
    """
    _add_deprecation_headers(response)
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
    response: Response,
    db: Session = Depends(deps.get_db),
    current_user: V2User = Depends(deps.get_current_user), # Require auth for consistency
) -> Any:
    """
    Get streak reward rules for the UI.
    
    ⚠️ DEPRECATED: Use GET /api/v2/mission/streak/rules instead.
    """
    _add_deprecation_headers(response)
    from app.services.ui_config_service import UiConfigService
    row = UiConfigService.get(db, "streak_reward_rules")
    if row and row.value_json:
        return row.value_json.get("rules", [])
    
    # Fallback default rules (Phase 2 documented defaults)
    return [
        {
            "day": 3,
            "enabled": True,
            "grants": [
                {"kind": "WALLET", "token_type": "ROULETTE_COIN", "amount": 1},
                {"kind": "WALLET", "token_type": "DICE_TOKEN", "amount": 1},
                {"kind": "WALLET", "token_type": "LOTTERY_TICKET", "amount": 1},
            ],
        },
        {"day": 7, "enabled": True, "grants": [{"kind": "INVENTORY", "item_type": "DIAMOND", "amount": 1}]},
    ]

@router.get("/", response_model=MissionListResponse)
def read_missions(
    response: Response,
    db: Session = Depends(deps.get_db),
    current_user: V2User = Depends(deps.get_current_user),
) -> Any:
    """
    Get all daily missions and current user progress.
    
    ⚠️ DEPRECATED: Use GET /api/v2/mission/ instead.
    """
    _add_deprecation_headers(response)
    # [Lazy Daily Check] For users with persistent sessions who don't hit /auth/token
    try:
        from app.services.mission_service import MissionService
        from datetime import datetime, timezone
        
        service = MissionService(db)
        now_tz = service._now_tz()
        op_date = service._operational_play_date(now_tz)  # Use operational day (9AM KST reset)
        should_update = False

        if current_user.last_login_at:
            last_login_utc = current_user.last_login_at.replace(tzinfo=timezone.utc)
            last_login_kst = last_login_utc.astimezone(now_tz.tzinfo)
            if last_login_kst.date() < op_date:  # Compare against operational day, not calendar day
                should_update = True
        else:
            should_update = True
        
        if should_update:
            service.update_progress(current_user.id, "LOGIN", delta=1)
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
    response: Response,
    db: Session = Depends(deps.get_db),
    current_user: V2User = Depends(deps.get_current_user),
    idempotency_key: str | None = Header(None, alias="X-Idempotency-Key"),
) -> Any:
    """
    Claim reward for a completed mission.
    
    ⚠️ DEPRECATED: Use POST /api/v2/mission/{mission_id}/claim instead.
    """
    _add_deprecation_headers(response)
    start_ts = perf_counter()
    status_label = "error"
    http_status = 500
    settings = get_settings()

    # Rate limit (per user + client host)
    rl_key = f"mission-claim:{current_user.id}:{request.client.host if request.client else 'unknown'}"
    burst_val = settings.golden_hour_claim_rate_burst
    print(f"[DEBUG] RateLimit Key: {rl_key} | Host: {request.client.host if request.client else 'None'} | Type: {type(rate_limiter)} | Burst: {burst_val}", flush=True) # VERIFICATION LOG
    
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
        # [DEBUG] Catch 500 errors to inspect cause
        try:
            success, reward_type, amount = service.claim_reward(current_user.id, mission_id)
        except Exception as e:
            import traceback
            print(f"[ERROR] Mission Claim Failed (ID: {mission_id}) - User: {current_user.id}", flush=True)
            traceback.print_exc()
            raise e

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
    response: Response,
    db: Session = Depends(deps.get_db),
    current_user: V2User = Depends(deps.get_current_user),
) -> Any:
    """
    Claim the immediate daily login gift.
    
    ⚠️ DEPRECATED: Use POST /api/v2/mission/daily-gift instead.
    """
    _add_deprecation_headers(response)
    service = MissionService(db)
    success, reward_type, amount = service.claim_daily_gift(current_user.id)
    
    if not success:
        raise HTTPException(status_code=400, detail=reward_type)
    
    return {
        "success": True, 
        "reward_type": reward_type, 
        "amount": amount
    }
