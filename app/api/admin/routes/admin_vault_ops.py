"""Admin Vault operations: timer control and user vault inspection."""

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.schemas.vault2 import VaultAdminStateResponse, VaultTimerActionRequest
from app.services.vault_service import VaultService


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


@router.post("/{user_id}/timer", response_model=VaultAdminStateResponse)
@router.post("/{user_id}/timer/", response_model=VaultAdminStateResponse)
@legacy_router.post("/{user_id}/timer", response_model=VaultAdminStateResponse)
@legacy_router.post("/{user_id}/timer/", response_model=VaultAdminStateResponse)
def set_user_timer(user_id: int, payload: VaultTimerActionRequest, db: Session = Depends(get_db)) -> VaultAdminStateResponse:
    service = VaultService()
    service.admin_timer_action(db, user_id=user_id, action=payload.action)
    return _build_admin_state(service, db, user_id)
