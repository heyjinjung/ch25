"""Vault APIs (status + free fill once)."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_current_user_id
from app.schemas.vault import VaultFillResponse, VaultStatusResponse
from app.services.vault_service import VaultService

router = APIRouter(prefix="/api/vault", tags=["vault"])
service = VaultService()


@router.get("/status", response_model=VaultStatusResponse)
def status(db: Session = Depends(get_db), user_id: int = Depends(get_current_user_id)) -> VaultStatusResponse:
    eligible, user, seeded = service.get_status(db=db, user_id=user_id)
    return VaultStatusResponse(
        eligible=eligible,
        vault_balance=user.vault_balance or 0,
        cash_balance=user.cash_balance or 0,
        vault_fill_used_at=user.vault_fill_used_at,
        seeded=seeded,
        expires_at=None,
    )


@router.post("/fill", response_model=VaultFillResponse)
def fill(db: Session = Depends(get_db), user_id: int = Depends(get_current_user_id)) -> VaultFillResponse:
    eligible, user, delta, used_at = service.fill_free_once(db=db, user_id=user_id)
    return VaultFillResponse(
        eligible=eligible,
        delta=delta,
        vault_balance_after=user.vault_balance or 0,
        vault_fill_used_at=used_at,
    )
