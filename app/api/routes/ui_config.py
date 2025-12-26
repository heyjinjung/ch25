"""Public UI config endpoints."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.schemas.ui_config import UiConfigResponse
from app.services.ui_config_service import UiConfigService

router = APIRouter(prefix="/api", tags=["ui-config"])


@router.get("/ui-config/{key}", response_model=UiConfigResponse)
def get_ui_config(key: str, db: Session = Depends(get_db)) -> UiConfigResponse:
    row = UiConfigService.get(db, key)
    if row is None:
        return UiConfigResponse(key=key, value=None, updated_at=None)
    return UiConfigResponse(key=row.key, value=row.value_json, updated_at=row.updated_at)
