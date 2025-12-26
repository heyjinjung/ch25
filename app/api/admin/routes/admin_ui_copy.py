"""Admin UI copy endpoints.

Thin wrappers around app_ui_config for stable, purpose-named APIs.
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.schemas.ui_copy import Ticket0ResolutionCopy, Ticket0ResolutionCopyUpsertRequest
from app.services.ui_config_service import UiConfigService

router = APIRouter(prefix="/api/admin/ui-copy", tags=["admin-ui-copy"])

_TICKET0_KEY = "ticket0_resolution_copy"


@router.put("/ticket0", response_model=Ticket0ResolutionCopy)
def upsert_ticket0_copy(payload: Ticket0ResolutionCopyUpsertRequest, db: Session = Depends(get_db)) -> Ticket0ResolutionCopy:
    row = UiConfigService.upsert(db, _TICKET0_KEY, payload.model_dump())
    value = row.value_json or {}
    return Ticket0ResolutionCopy(
        title=str(value.get("title", "")),
        body=str(value.get("body", "")),
        primary_cta_label=str(value.get("primary_cta_label", "")),
        secondary_cta_label=str(value.get("secondary_cta_label", "")),
    )
