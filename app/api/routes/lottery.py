"""Lottery API routes."""
from datetime import date

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.schemas.lottery import LotteryPlayResponse, LotteryStatusResponse
from app.services.lottery_service import LotteryService

router = APIRouter(prefix="/api/lottery", tags=["lottery"])
service = LotteryService()


@router.get("/status", response_model=LotteryStatusResponse)
def lottery_status(db: Session = Depends(get_db)) -> LotteryStatusResponse:
    # TODO: replace with authenticated user
    user_id = 1
    today = date.today()
    return service.get_status(db=db, user_id=user_id, today=today)


@router.post("/play", response_model=LotteryPlayResponse)
def lottery_play(db: Session = Depends(get_db)) -> LotteryPlayResponse:
    # TODO: replace with authenticated user
    user_id = 1
    today = date.today()
    return service.play(db=db, user_id=user_id, now=today)
