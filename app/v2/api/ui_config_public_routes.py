"""Public UI Config routes.

Expose read-only UI config values for client-side feature flags.
"""

from datetime import datetime
from typing import Any

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.v2.api.deps import get_db
from app.v2.services.ui_config_service import UiConfigService


class PublicUiConfigResponse(BaseModel):
    key: str
    value: Any | None
    updated_at: datetime | None


router = APIRouter(prefix="/api/ui-config", tags=["ui-config"])


@router.get("/{key}", response_model=PublicUiConfigResponse)
def get_public_ui_config(
    key: str,
    db: Session = Depends(get_db),
) -> PublicUiConfigResponse:
    row = UiConfigService.get(db, key)
    if row is None:
        return PublicUiConfigResponse(key=key, value=None, updated_at=None)
    return PublicUiConfigResponse(
        key=row.key,
        value=row.value_json,
        updated_at=row.updated_at,
    )