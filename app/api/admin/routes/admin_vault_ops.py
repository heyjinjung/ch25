"""Admin Vault operations: timer control and user vault inspection."""

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_current_admin_id
from app.schemas.vault2 import VaultAdminStateResponse, VaultTimerActionRequest, VaultBalanceSetRequest
from app.services.vault_service import VaultService
from app.services.admin_user_identity_service import resolve_user_id_by_identifier
from app.models.user import User
from app.models.user_cash_ledger import UserCashLedger


# Canonical admin API base in this codebase is `/admin/api/*`.
# Some environments/clients still call `/api/admin/*` (often rewritten by NGINX).
# Expose both to avoid 404s.
router = APIRouter(prefix="/admin/api/vault", tags=["admin-vault-ops"])
legacy_router = APIRouter(prefix="/api/admin/vault", tags=["admin-vault-ops"])


def _build_admin_state(service: VaultService, db: Session, user_id: int) -> VaultAdminStateResponse:
    """Return full vault state for admin inspection."""
    now = datetime.utcnow()
    try:
        eligible, user, _ = service.get_status(db, user_id=user_id, now=now)
    except HTTPException as exc:  # surface minimal state instead of hard 404
        if exc.detail == "USER_NOT_FOUND":
            eligible = service._eligible(db, user_id=user_id, now=now)  # internal helper is safe here
            return VaultAdminStateResponse(
                user_id=user_id,
                eligible=eligible,
                vault_balance=0,
                locked_balance=0,
                available_balance=0,
                expires_at=None,
                locked_expires_at=None,
                accrual_multiplier=service.vault_accrual_multiplier(db, now) if eligible else None,
                program_key=service.PROGRAM_KEY,
            )
        raise

    if user is None:
        raise HTTPException(status_code=404, detail="USER_NOT_FOUND")

    locked_balance = int(getattr(user, "vault_locked_balance", 0) or 0)
    reserved_amount = service.get_withdrawal_reserved_amount(db=db, user_id=user_id)
    available_balance = max(locked_balance - reserved_amount, 0)
    expires_at = getattr(user, "vault_locked_expires_at", None)

    return VaultAdminStateResponse(
        user_id=user.id,
        eligible=eligible,
        vault_balance=int(getattr(user, "vault_balance", 0) or 0),
        locked_balance=locked_balance,
        available_balance=available_balance,
        expires_at=expires_at,
        locked_expires_at=expires_at,
        accrual_multiplier=service.vault_accrual_multiplier(db, now) if eligible else None,
        program_key=service.PROGRAM_KEY,
        total_charge_amount=int(getattr(user, "total_charge_amount", 0) or 0),
    )


@router.get("/{user_id}", response_model=VaultAdminStateResponse)
@router.get("/{user_id}/", response_model=VaultAdminStateResponse)
@legacy_router.get("/{user_id}", response_model=VaultAdminStateResponse)
@legacy_router.get("/{user_id}/", response_model=VaultAdminStateResponse)
def get_user_vault_state(user_id: int, db: Session = Depends(get_db)) -> VaultAdminStateResponse:
    service = VaultService()
    return _build_admin_state(service, db, user_id)


@router.get("/by-identifier/{identifier}", response_model=VaultAdminStateResponse)
@router.get("/by-identifier/{identifier}/", response_model=VaultAdminStateResponse)
@legacy_router.get("/by-identifier/{identifier}", response_model=VaultAdminStateResponse)
@legacy_router.get("/by-identifier/{identifier}/", response_model=VaultAdminStateResponse)
def get_user_vault_state_by_identifier(identifier: str, db: Session = Depends(get_db)) -> VaultAdminStateResponse:
    user_id = resolve_user_id_by_identifier(db, identifier)
    service = VaultService()
    return _build_admin_state(service, db, user_id)


@router.post("/{user_id}/timer", response_model=VaultAdminStateResponse)
@router.post("/{user_id}/timer/", response_model=VaultAdminStateResponse)
@legacy_router.post("/{user_id}/timer", response_model=VaultAdminStateResponse)
@legacy_router.post("/{user_id}/timer/", response_model=VaultAdminStateResponse)
def set_user_timer(user_id: int, payload: VaultTimerActionRequest, db: Session = Depends(get_db)) -> VaultAdminStateResponse:
    service = VaultService()
    service.admin_timer_action(db, user_id=user_id, action=payload.action)
    return _build_admin_state(service, db, user_id)


@router.post("/by-identifier/{identifier}/timer", response_model=VaultAdminStateResponse)
@router.post("/by-identifier/{identifier}/timer/", response_model=VaultAdminStateResponse)
@legacy_router.post("/by-identifier/{identifier}/timer", response_model=VaultAdminStateResponse)
@legacy_router.post("/by-identifier/{identifier}/timer/", response_model=VaultAdminStateResponse)
def set_user_timer_by_identifier(
    identifier: str,
    payload: VaultTimerActionRequest,
    db: Session = Depends(get_db),
) -> VaultAdminStateResponse:
    user_id = resolve_user_id_by_identifier(db, identifier)
    service = VaultService()
    service.admin_timer_action(db, user_id=user_id, action=payload.action)
    return _build_admin_state(service, db, user_id)


@router.post("/{user_id}/balance", response_model=VaultAdminStateResponse)
@legacy_router.post("/{user_id}/balance", response_model=VaultAdminStateResponse)
def set_user_balance(
    user_id: int, 
    payload: VaultBalanceSetRequest, 
    db: Session = Depends(get_db),
    admin_id: int = Depends(get_current_admin_id),
) -> VaultAdminStateResponse:
    """Set User Vault/Cash Balance Arbitrarily."""
    service = VaultService()
    
    # Lock User
    user = db.query(User).filter(User.id == user_id).with_for_update().first()
    if not user:
        raise HTTPException(status_code=404, detail="USER_NOT_FOUND")

    reason = payload.reason or "ADMIN_MANUAL_ADJUST"
    
    # 1. Update Locked (Vault)
    if payload.locked_amount is not None:
        old_locked = int(user.vault_locked_balance or 0)
        user.vault_locked_balance = payload.locked_amount
        # Sync mirror immediately
        service.sync_legacy_mirror(user)
        
        # Log Ledger if changed
        if old_locked != payload.locked_amount:
            # We use UserCashLedger for tracking important money flows, usually for Cash.
            # But for Vault Admin edits, it's good to record it too.
            # Use specific type? Or just generic message.
            ledger = UserCashLedger(
                user_id=user.id,
                delta=(payload.locked_amount - old_locked),
                balance_after=payload.locked_amount,
                reason="VAULT_ADMIN_ADJUST",
                label=f"Admin {admin_id}: Vault Locked {old_locked} -> {payload.locked_amount}"
            )
            db.add(ledger)

    # 2. Update Cash (Available) - Optional but requested "balances" usually implies this
    if payload.available_amount is not None:
        old_cash = int(user.cash_balance or 0)
        user.cash_balance = payload.available_amount
        
        if old_cash != payload.available_amount:
             ledger = UserCashLedger(
                user_id=user.id,
                delta=(payload.available_amount - old_cash),
                balance_after=payload.available_amount,
                reason="CASH_ADMIN_ADJUST",
                label=f"Admin {admin_id}: Cash Balance {old_cash} -> {payload.available_amount}"
            )
             db.add(ledger)

    db.commit()
    return _build_admin_state(service, db, user_id)


from app.services.vault2_service import Vault2Service
from pydantic import BaseModel

class GoldenHourConfig(BaseModel):
    enabled: bool
    manual_override: str  # "AUTO", "FORCE_ON", "FORCE_OFF"
    multiplier: float = 2.0
    base_amount_gate: int | None = None

@router.post("/golden-hour", response_model=GoldenHourConfig)
def set_golden_hour_config(
    idx: GoldenHourConfig,
    db: Session = Depends(get_db),
    admin_id: int = Depends(get_current_admin_id),
):
    """Set Golden Hour configuration."""
    v2 = Vault2Service()
    # Read existing to preserve other fields if any
    current = v2.get_config_value(db, "golden_hour_config", {})
    
    # Merge
    current["enabled"] = idx.enabled
    current["manual_override"] = idx.manual_override
    current["multiplier"] = idx.multiplier
    if idx.base_amount_gate is not None:
         current["base_amount_gate"] = idx.base_amount_gate
         
    v2.set_config_value(db, "golden_hour_config", current)
    # No verify_config needed for simple dict
    
    return current


@router.get("/golden-hour", response_model=GoldenHourConfig)
def get_golden_hour_config(
    db: Session = Depends(get_db),
):
    """Get Golden Hour configuration."""
    v2 = Vault2Service()
    val = v2.get_config_value(db, "golden_hour_config", {})
    # Return defaults if empty
    return GoldenHourConfig(
        enabled=val.get("enabled", False),
        manual_override=val.get("manual_override", "AUTO"),
        multiplier=val.get("multiplier", 2.0),
        base_amount_gate=val.get("base_amount_gate"),
    )
