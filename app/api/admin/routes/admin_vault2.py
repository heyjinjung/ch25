"""Admin Vault2 maintenance endpoints.

Minimal, admin-only trigger endpoints for safe operational use.
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.services.vault2_service import Vault2Service


router = APIRouter(prefix="/admin/api/vault2", tags=["admin-vault2"])
service = Vault2Service()


@router.post("/tick")
def tick_vault2_transitions(limit: int = 500, db: Session = Depends(get_db)) -> dict:
    """Run Vault2 transition tick (locked→available→expired).

    Intended for manual runs or scheduling (cron) in operations.
    """

    updated = service.apply_transitions(db, limit=limit, commit=True)
    return {"updated": int(updated)}
