"""Season pass API endpoints."""
from __future__ import annotations

from datetime import date

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_user_id, get_db
from app.schemas.season_pass import (
    ClaimRequest,
    ClaimResponse,
    SeasonPassStatusResponse,
    StampRequest,
    StampResponse,
)
from app.services.season_pass_service import SeasonPassService

router = APIRouter(prefix="/api/season-pass", tags=["season-pass"])
service = SeasonPassService()


@router.get("/status", response_model=SeasonPassStatusResponse, summary="Get season pass status")
def get_status(
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
) -> SeasonPassStatusResponse:
    """Return active season info, progress, level list, and today's stamp flag."""

    result = service.get_status(db=db, user_id=user_id, now=date.today())
    return SeasonPassStatusResponse(**result)


@router.post("/stamp", response_model=StampResponse, summary="Add a daily stamp")
def stamp(
    payload: StampRequest,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
) -> StampResponse:
    """Add today's stamp, update XP/level, and return rewards."""
    result = service.add_stamp(
        db=db,
        user_id=user_id,
        source_feature_type=payload.source_feature_type,
        xp_bonus=payload.xp_bonus,
        now=date.today(),
    )
    return StampResponse(**result)


@router.post("/claim", response_model=ClaimResponse, summary="Claim a manual reward")
def claim(
    payload: ClaimRequest,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
) -> ClaimResponse:
    """Claim a non-auto-claim reward for the given level."""
    result = service.claim_reward(db=db, user_id=user_id, level=payload.level, now=date.today())
    return ClaimResponse(**result)
