"""Roulette API routes."""
from datetime import date

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_user_id, get_db
from app.schemas.roulette import RoulettePlayRequest, RoulettePlayResponse, RouletteStatusResponse
from app.services.roulette_service import RouletteService
from app.models.game_wallet import GameTokenType

router = APIRouter(prefix="/api/roulette", tags=["roulette"])
service = RouletteService()


@router.get("/status", response_model=RouletteStatusResponse)
def roulette_status(
    ticket_type: str = GameTokenType.ROULETTE_COIN.value,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id)
) -> RouletteStatusResponse:
    today = date.today()
    return service.get_status(db=db, user_id=user_id, today=today, ticket_type=ticket_type)


@router.post("/play", response_model=RoulettePlayResponse)
def roulette_play(
    payload: RoulettePlayRequest = None,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id)
) -> RoulettePlayResponse:
    today = date.today()
    # Default to coin if payload missing (backward compatibility)
    t_type = payload.ticket_type if payload else GameTokenType.ROULETTE_COIN.value
    return service.play(db=db, user_id=user_id, now=today, ticket_type=t_type)
