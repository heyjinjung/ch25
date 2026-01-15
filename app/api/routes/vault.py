"""Vault APIs (status + free fill once)."""

from datetime import datetime

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_current_user_id
from app.models.game_wallet import GameTokenType, UserGameWallet
from app.models.user_segment import UserSegment
from app.schemas.vault2 import VaultProgramResponse, VaultTopItem
from app.schemas.vault import VaultFillResponse, VaultStatusResponse
from app.services.vault2_service import Vault2Service
from app.services.vault_service import VaultService

from pydantic import BaseModel

router = APIRouter(prefix="/api/vault", tags=["vault"])
service = VaultService()
v2_service = Vault2Service()


def _deep_merge_dict(base: dict, override: dict) -> dict:
    out = dict(base)
    for key, value in override.items():
        if isinstance(value, dict) and isinstance(out.get(key), dict):
            out[key] = _deep_merge_dict(out[key], value)
        else:
            out[key] = value
    return out


@router.get("/status", response_model=VaultStatusResponse)
def status(db: Session = Depends(get_db), user_id: int = Depends(get_current_user_id)) -> VaultStatusResponse:
    now = datetime.utcnow()
    eligible, user, seeded = service.get_status(db=db, user_id=user_id, now=now)

    recommended_action = None
    cta_payload = None
    locked_balance = int(getattr(user, "vault_locked_balance", 0) or 0)
    reserved_amount = service.get_withdrawal_reserved_amount(db=db, user_id=user_id)
    available_amount = max(locked_balance - reserved_amount, 0)
    expires_at = getattr(user, "vault_locked_expires_at", None)
    locked_unexpired = locked_balance > 0 and (expires_at is None or expires_at > now)

    ticket_token_types = (GameTokenType.DICE_TOKEN, GameTokenType.ROULETTE_COIN, GameTokenType.LOTTERY_TICKET, GameTokenType.TRIAL_TOKEN)
    wallet_rows = (
        db.query(UserGameWallet)
        .filter(UserGameWallet.user_id == user_id, UserGameWallet.token_type.in_(ticket_token_types))
        .all()
    )
    balances = {row.token_type: int(row.balance or 0) for row in wallet_rows}
    total_tickets = sum(balances.values())

    if eligible and locked_unexpired:
        ticket_zero = all(balances.get(token_type, 0) <= 0 for token_type in ticket_token_types)
        if ticket_zero:
            recommended_action = "OPEN_VAULT_MODAL"
            cta_payload = {
                "reason": "TICKET_ZERO",
            }

    unlock_rules_json = None
    if eligible:
        computed = service.phase1_unlock_rules_json(now=now)
        program = v2_service.get_default_program(db, ensure=True)
        override = getattr(program, "unlock_rules_json", None)
        if isinstance(override, dict) and override:
            unlock_rules_json = _deep_merge_dict(computed, override)
        else:
            unlock_rules_json = computed

    ui_copy_json = None
    if eligible:
        hardcoded_ui_copy = {
            "title": "내 금고",
            "desc": "적립된 보관금은 조건 달성 시 즉시 출금 신청 가능한 금액으로 반영됩니다.",
        }
        program = v2_service.get_default_program(db, ensure=True)
        override = getattr(program, "ui_copy_json", None)
        if isinstance(override, dict) and override:
            ui_copy_json = _deep_merge_dict(hardcoded_ui_copy, override)
        else:
            ui_copy_json = hardcoded_ui_copy

    res = VaultStatusResponse(
        eligible=eligible,
        vault_balance=user.vault_balance or 0,
        locked_balance=locked_balance,
        available_balance=available_amount,
        vault_amount_total=locked_balance,
        vault_amount_reserved=reserved_amount,
        vault_amount_available=available_amount,
        ticket_count=total_tickets,
        vault_fill_used_at=user.vault_fill_used_at,
        seeded=seeded,
        expires_at=expires_at,
        recommended_action=recommended_action,
        cta_payload=cta_payload,
        program_key=service.PROGRAM_KEY,
        unlock_rules_json=unlock_rules_json,
        accrual_multiplier=service.vault_accrual_multiplier(db, now) if eligible else 1.0,
        ui_copy_json=ui_copy_json,
        total_charge_amount=int(getattr(user, "total_charge_amount", 0) or 0),
        segment=db.query(UserSegment.segment).filter(UserSegment.user_id == user.id).scalar(),
    )

    # Golden Hour Status Injection
    gh_cfg = v2_service.get_config_value(db, "golden_hour_config", {})
    if gh_cfg and gh_cfg.get("enabled"):
        override = gh_cfg.get("manual_override", "AUTO")
        active = False
        if override == "FORCE_ON":
            active = True
        elif override == "FORCE_OFF":
            active = False
        else:
            from zoneinfo import ZoneInfo
            from app.core.config import get_settings
            from datetime import timedelta
            settings = get_settings()
            tz = ZoneInfo(getattr(settings, "timezone", "Asia/Seoul"))
            now_kst = now.astimezone(tz)
            current_time_str = now_kst.strftime("%H:%M:%S")
            start_str = gh_cfg.get("start_time_kst", "21:30:00")
            end_str = gh_cfg.get("end_time_kst", "22:30:00")
            
            if start_str <= current_time_str <= end_str:
                active = True
                # Calculate remaining seconds
                try:
                    end_h, end_m, end_s = map(int, end_str.split(":"))
                    end_dt = now_kst.replace(hour=end_h, minute=end_m, second=end_s, microsecond=0)
                    if end_dt < now_kst:
                        end_dt += timedelta(days=1)
                    rem = int((end_dt - now_kst).total_seconds())
                    res.golden_hour_remaining_seconds = max(0, rem)
                except Exception:
                    pass
        
        res.is_golden_hour_active = active
        res.golden_hour_multiplier = float(gh_cfg.get("multiplier", 2.0)) if active else 1.0
        
        # Inject Global Modal Overrides
        res.show_modal_override = v2_service.get_config_value(db, "show_modal_override")
    
    # Withdrawal Conditions Calculation
    op_date_kst = service._operational_date_kst(now)
    # [MODIFIED] Use 7-day window for play count logic to match Phase 2 tiered rules
    seven_days_ago_ts = now - timedelta(days=7)
    
    from app.models.feature import UserEventLog
    from sqlalchemy import cast, Date, func

    # Recent Play Count (Last 7 Days)
    recent_play_count = db.query(func.count(UserEventLog.id)).filter(
        UserEventLog.user_id == user_id,
        UserEventLog.event_name.like("GAME_%_PLAY"),
        UserEventLog.created_at >= seven_days_ago_ts
    ).scalar() or 0
    
    # Daily Deposit Confirmation (Still check Today for explicit "Active Today" check if needed, 
    # but for Withdrawal "Request" we might stick to 7-day deposit check or just the "Deposit Record Today" rule.
    # request_withdrawal says: "User must have a deposit record TODAY". So we keep this.
    has_deposit_today = db.query(UserEventLog.id).filter(
        UserEventLog.user_id == user_id,
        UserEventLog.event_name == "DEPOSIT_CONFIRMED",
        cast(UserEventLog.created_at, Date) == op_date_kst
    ).first() is not None

    # [MODIFIED] Determine Tier & Targets using UserSegmentService & Ranking Data
    from app.services.user_segment_service import UserSegmentService
    from app.models.external_ranking_daily_deposit_delta import ExternalRankingDailyDepositDelta
    
    seven_days_ago_date = (now - timedelta(days=6)).date()
    deposit_7d = db.query(func.coalesce(func.sum(ExternalRankingDailyDepositDelta.deposit_delta), 0)).filter(
        ExternalRankingDailyDepositDelta.user_id == user_id,
        ExternalRankingDailyDepositDelta.kst_date >= seven_days_ago_date
    ).scalar() or 0

    segments = UserSegmentService.get_computed_segments(db, user_id)
    
    # Defaults (COMMON) - Matches VaultService.request_withdrawal logic
    play_target = 30
    spend_target = 10000
    
    if "AT_RISK" in segments:
        play_target = 100
        spend_target = 30000
    elif deposit_7d >= 3000000: # WHALE
        play_target = 0
        spend_target = 0
    elif deposit_7d >= 500000: # VIP
        play_target = 15
        spend_target = 5000

    res.daily_play_count = int(recent_play_count) # Reusing field name but semantic is now 7-day
    res.daily_play_target = int(play_target)
    res.daily_deposit_confirmed = has_deposit_today
    
    # Withdrawal Count (APPROVED or PENDING)
    from app.models.vault_withdrawal_request import VaultWithdrawalRequest
    withdrawal_count = db.query(func.count(VaultWithdrawalRequest.id)).filter(
        VaultWithdrawalRequest.user_id == user_id,
        VaultWithdrawalRequest.status.in_(["PENDING", "APPROVED"])
    ).scalar() or 0

    res.daily_vault_spent = int(getattr(user, "vault_spent_total", 0) or 0)
    res.daily_vault_spent_target = int(spend_target)
    res.withdrawal_count = int(withdrawal_count)

    return res


@router.post("/fill", response_model=VaultFillResponse)
def fill(db: Session = Depends(get_db), user_id: int = Depends(get_current_user_id)) -> VaultFillResponse:
    eligible, user, delta, used_at = service.fill_free_once(db=db, user_id=user_id)
    return VaultFillResponse(
        eligible=eligible,
        delta=delta,
        vault_balance_after=user.vault_balance or 0,
        vault_fill_used_at=used_at,
    )


@router.get("/programs", response_model=list[VaultProgramResponse])
def list_programs(db: Session = Depends(get_db)) -> list[VaultProgramResponse]:
    programs = v2_service.list_programs(db)
    return [
        VaultProgramResponse(
            key=p.key,
            name=p.name,
            duration_hours=int(p.duration_hours),
            expire_policy=getattr(p, "expire_policy", None),
            is_active=bool(getattr(p, "is_active", True)),
            unlock_rules_json=getattr(p, "unlock_rules_json", None),
            ui_copy_json=getattr(p, "ui_copy_json", None),
        )
        for p in programs
    ]


@router.get("/top", response_model=list[VaultTopItem])
def top(db: Session = Depends(get_db)) -> list[VaultTopItem]:
    rows = v2_service.top_statuses(db)
    return [
        VaultTopItem(
            user_id=status.user_id,
            program_key=program.key,
            state=status.state,
            locked_amount=int(status.locked_amount or 0),
            available_amount=int(getattr(status, "available_amount", 0) or 0),
            expires_at=status.expires_at,
            progress_json=getattr(status, "progress_json", None),
        )
        for status, program in rows
    ]


class VaultRequestSchema(BaseModel):
    id: int
    user_id: int
    amount: int
    status: str
    created_at: datetime
    processed_at: datetime | None = None
    admin_memo: str | None = None

    class Config:
        from_attributes = True

@router.get("/admin/requests", response_model=list[VaultRequestSchema])
def list_withdrawal_requests(
    status: str = "PENDING",
    db: Session = Depends(get_db),
    # admin auth omitted for MVP
):
    from app.models.vault_withdrawal_request import VaultWithdrawalRequest
    rows = (
        db.query(VaultWithdrawalRequest)
        .filter(VaultWithdrawalRequest.status == status)
        .order_by(VaultWithdrawalRequest.created_at.desc())
        .all()
    )
    return rows


class WithdrawRequestPayload(BaseModel):
    amount: int

class WithdrawResponse(BaseModel):
    request_id: int
    status: str
    amount: int
    balance_after: int


@router.post("/withdraw", response_model=WithdrawResponse)
def request_withdraw(
    payload: WithdrawRequestPayload,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id)
) -> WithdrawResponse:
    result = service.request_withdrawal(db, user_id=user_id, amount=payload.amount)
    return WithdrawResponse(
        request_id=result["request_id"],
        status=result["status"],
        amount=result["amount"],
        balance_after=result["balance_after"]
    )


class AdminProcessWithdrawalPayload(BaseModel):
    request_id: int
    action: str  # APPROVE, REJECT
    admin_memo: str | None = None

@router.post("/admin/process")
def admin_process_withdrawal(
    payload: AdminProcessWithdrawalPayload,
    db: Session = Depends(get_db),
    # In a real app, use Depends(get_current_admin)
    # For now, we assume the caller has admin rights or we use a header
    admin_id: int = 1 # Temporary hardcoded admin ID for MVP
):
    result = service.process_withdrawal(
        db, 
        request_id=payload.request_id, 
        action=payload.action, 
        admin_id=admin_id, 
        memo=payload.admin_memo
    )
    return result


class AdminAdjustWithdrawalAmountPayload(BaseModel):
    request_id: int
    new_amount: int
    admin_memo: str | None = None


@router.post("/admin/adjust-amount")
def admin_adjust_withdrawal_amount(
    payload: AdminAdjustWithdrawalAmountPayload,
    db: Session = Depends(get_db),
    # In a real app, use Depends(get_current_admin)
    admin_id: int = 1,
):
    result = service.admin_adjust_withdrawal_amount(
        db,
        request_id=payload.request_id,
        new_amount=payload.new_amount,
        admin_id=admin_id,
        memo=payload.admin_memo,
    )
    return result


class AdminCancelWithdrawalPayload(BaseModel):
    request_id: int
    admin_memo: str | None = None


@router.post("/admin/cancel")
def admin_cancel_withdrawal_request(
    payload: AdminCancelWithdrawalPayload,
    db: Session = Depends(get_db),
    # In a real app, use Depends(get_current_admin)
    admin_id: int = 1,
):
    result = service.admin_cancel_withdrawal_request(
        db,
        request_id=payload.request_id,
        admin_id=admin_id,
        memo=payload.admin_memo,
    )
    return result
