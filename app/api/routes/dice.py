"""Dice API routes."""
from datetime import date

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.api.deps import get_current_user_id
from app.schemas.dice import DicePlayResponse, DiceStatusResponse
from app.services.dice_service import DiceService

router = APIRouter(prefix="/api/dice", tags=["dice"])
service = DiceService()


@router.get("/status", response_model=DiceStatusResponse)
def dice_status(db: Session = Depends(get_db), user_id: int = Depends(get_current_user_id)) -> DiceStatusResponse:
    today = date.today()
    return service.get_status(db=db, user_id=user_id, today=today)


@router.post("/play", response_model=DicePlayResponse)
def dice_play(db: Session = Depends(get_db), user_id: int = Depends(get_current_user_id)) -> DicePlayResponse:
    today = date.today()
    return service.play(db=db, user_id=user_id, now=today)
