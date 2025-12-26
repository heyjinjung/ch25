"""Admin Vault operations: timer control and user vault inspection."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.schemas.vault2 import VaultTimerActionRequest, VaultTimerState
from app.services.vault_service import VaultService


_core = APIRouter(tags=["admin-vault-ops"])

# Canonical admin API base in this codebase is `/admin/api/*`.
# Some environments/clients still call `/api/admin/*` (often rewritten by NGINX).
# Expose both to avoid 404s.
router = APIRouter(prefix="/admin/api/vault", tags=["admin-vault-ops"])
legacy_router = APIRouter(prefix="/api/admin/vault", tags=["admin-vault-ops"])

router.include_router(_core)
legacy_router.include_router(_core)


@_core.get("/{user_id}", response_model=VaultTimerState)
@_core.get("/{user_id}/", response_model=VaultTimerState)
def get_user_vault_state(user_id: int, db: Session = Depends(get_db)) -> VaultTimerState:
    service = VaultService()
    # get_status returns (eligible, user, mutated)
    eligible, user, _ = service.get_status(db, user_id=user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="USER_NOT_FOUND")
    return VaultTimerState(
        user_id=user.id,
        locked_balance=int(user.vault_locked_balance or 0),
        locked_expires_at=user.vault_locked_expires_at,
    )


@_core.post("/{user_id}/timer", response_model=VaultTimerState)
@_core.post("/{user_id}/timer/", response_model=VaultTimerState)
def set_user_timer(user_id: int, payload: VaultTimerActionRequest, db: Session = Depends(get_db)) -> VaultTimerState:
    service = VaultService()
    user = service.admin_timer_action(db, user_id=user_id, action=payload.action)
    return VaultTimerState(
        user_id=user.id,
        locked_balance=int(user.vault_locked_balance or 0),
        locked_expires_at=user.vault_locked_expires_at,
    )
