"""V2 Level XP routes."""
from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.v2.api.deps import get_current_user_id, get_db
from app.v2.schemas.v2_level_xp import LevelXPStatusResponse
from app.v2.services.level_xp_service import V2LevelXPService

router = APIRouter(tags=["v2-level-xp"])


@router.get("/level-xp/status", response_model=LevelXPStatusResponse)
def get_level_xp_status(
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
) -> LevelXPStatusResponse:
    service = V2LevelXPService()
    payload = service.get_status(db, user_id=user_id)
    return LevelXPStatusResponse(**payload)
