"""Admin Vault operations: timer control and user vault inspection."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.schemas.vault2 import VaultTimerActionRequest, VaultTimerState
from app.services.vault_service import VaultService

router = APIRouter(prefix="/api/admin/vault", tags=["admin-vault-ops"])


@router.get("/{user_id}", response_model=VaultTimerState)
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


@router.post("/{user_id}/timer", response_model=VaultTimerState)
def set_user_timer(user_id: int, payload: VaultTimerActionRequest, db: Session = Depends(get_db)) -> VaultTimerState:
    service = VaultService()
    user = service.admin_timer_action(db, user_id=user_id, action=payload.action)
    return VaultTimerState(
        user_id=user.id,
        locked_balance=int(user.vault_locked_balance or 0),
        locked_expires_at=user.vault_locked_expires_at,
    )
