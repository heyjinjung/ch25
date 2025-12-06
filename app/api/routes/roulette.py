"""Roulette API routes."""
from datetime import date

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.schemas.roulette import RoulettePlayResponse, RouletteStatusResponse
from app.services.roulette_service import RouletteService

router = APIRouter(prefix="/api/roulette", tags=["roulette"])
service = RouletteService()


@router.get("/status", response_model=RouletteStatusResponse)
def roulette_status(db: Session = Depends(get_db)) -> RouletteStatusResponse:
    # TODO: replace with authenticated user
    user_id = 1
    today = date.today()
    return service.get_status(db=db, user_id=user_id, today=today)


@router.post("/play", response_model=RoulettePlayResponse)
def roulette_play(db: Session = Depends(get_db)) -> RoulettePlayResponse:
    # TODO: replace with authenticated user
    user_id = 1
    today = date.today()
    return service.play(db=db, user_id=user_id, now=today)
