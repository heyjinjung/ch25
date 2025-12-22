"""Vault APIs (status + free fill once)."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_current_user_id
from app.schemas.vault2 import VaultProgramResponse, VaultTopItem
from app.schemas.vault import VaultFillResponse, VaultStatusResponse
from app.services.vault2_service import Vault2Service
from app.services.vault_service import VaultService

router = APIRouter(prefix="/api/vault", tags=["vault"])
service = VaultService()
v2_service = Vault2Service()


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
