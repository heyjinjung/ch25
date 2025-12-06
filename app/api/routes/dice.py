"""Dice API routes."""
from datetime import date

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.schemas.dice import DicePlayResponse, DiceStatusResponse
from app.services.dice_service import DiceService

router = APIRouter(prefix="/api/dice", tags=["dice"])
service = DiceService()


@router.get("/status", response_model=DiceStatusResponse)
def dice_status(db: Session = Depends(get_db)) -> DiceStatusResponse:
    # TODO: replace with authenticated user
    user_id = 1
    today = date.today()
    return service.get_status(db=db, user_id=user_id, today=today)


@router.post("/play", response_model=DicePlayResponse)
def dice_play(db: Session = Depends(get_db)) -> DicePlayResponse:
    # TODO: replace with authenticated user
    user_id = 1
    today = date.today()
    return service.play(db=db, user_id=user_id, now=today)
