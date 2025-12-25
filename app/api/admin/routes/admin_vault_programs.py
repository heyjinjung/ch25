"""Admin VaultProgram config endpoints.

Operational endpoints to edit Vault2 program JSON fields (unlock_rules_json/ui_copy_json)
without redeploying.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.schemas.vault2 import (
    VaultProgramResponse,
    VaultProgramUiCopyUpsertRequest,
    VaultProgramUnlockRulesUpsertRequest,
    VaultProgramConfigUpsertRequest,
)
from app.services.vault2_service import Vault2Service


router = APIRouter(prefix="/api/admin/vault-programs", tags=["admin-vault-programs"])
service = Vault2Service()


def _to_response(p) -> VaultProgramResponse:
    return VaultProgramResponse(
        key=p.key,
        name=p.name,
        duration_hours=int(p.duration_hours),
        expire_policy=getattr(p, "expire_policy", None),
        is_active=bool(getattr(p, "is_active", True)),
        unlock_rules_json=getattr(p, "unlock_rules_json", None),
        ui_copy_json=getattr(p, "ui_copy_json", None),
        config_json=getattr(p, "config_json", None),
    )


@router.get("/default", response_model=VaultProgramResponse)
def get_default_program(db: Session = Depends(get_db)) -> VaultProgramResponse:
    program = service.get_default_program(db, ensure=True)
    return _to_response(program)


@router.get("/{program_key}", response_model=VaultProgramResponse)
def get_program(program_key: str, db: Session = Depends(get_db)) -> VaultProgramResponse:
    program = service.get_program_by_key(db, program_key=program_key)
    if program is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="PROGRAM_NOT_FOUND")
    return _to_response(program)


@router.put("/{program_key}/unlock-rules", response_model=VaultProgramResponse)
def upsert_unlock_rules(
    program_key: str,
    payload: VaultProgramUnlockRulesUpsertRequest,
    db: Session = Depends(get_db),
) -> VaultProgramResponse:
    try:
        program = service.update_program_unlock_rules(db, program_key=program_key, unlock_rules_json=payload.unlock_rules_json)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    return _to_response(program)


@router.put("/{program_key}/ui-copy", response_model=VaultProgramResponse)
def upsert_ui_copy(
    program_key: str,
    payload: VaultProgramUiCopyUpsertRequest,
    db: Session = Depends(get_db),
) -> VaultProgramResponse:
    try:
        program = service.update_program_ui_copy(db, program_key=program_key, ui_copy_json=payload.ui_copy_json)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    return _to_response(program)


@router.put("/{program_key}/config", response_model=VaultProgramResponse)
def upsert_config(
    program_key: str,
    payload: VaultProgramConfigUpsertRequest,
    db: Session = Depends(get_db),
) -> VaultProgramResponse:
    try:
        program = service.update_program_config(db, program_key=program_key, config_json=payload.config_json)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    return _to_response(program)
