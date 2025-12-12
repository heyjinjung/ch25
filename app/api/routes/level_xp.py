"""Global level/XP public API endpoints."""
from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_user_id, get_db
from app.schemas.level_xp import LevelXPStatusResponse
from app.services.level_xp_service import LevelXPService

router = APIRouter(prefix="/api/level-xp", tags=["level-xp"])
service = LevelXPService()


@router.get("/status", response_model=LevelXPStatusResponse, summary="Get global level/XP status and reward history")
def get_status(
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
) -> LevelXPStatusResponse:
    result = service.get_status(db=db, user_id=user_id)
    return LevelXPStatusResponse(**result)
