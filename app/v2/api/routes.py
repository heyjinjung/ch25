"""V2 game API routes (web verification)."""
from datetime import date

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_user_id, get_db
from app.models.game_wallet import GameTokenType
from app.schemas.dice import DicePlayResponse, DiceStatusResponse
from app.schemas.lottery import LotteryPlayResponse, LotteryStatusResponse
from app.schemas.roulette import RoulettePlayRequest, RoulettePlayResponse, RouletteStatusResponse
from app.services.dice_service import DiceService
from app.services.lottery_service import LotteryService
from app.services.roulette_service import RouletteService

router = APIRouter(tags=["v2-games"])

_roulette_service = RouletteService()
_dice_service = DiceService()
_lottery_service = LotteryService()


@router.get("/roulette/status", response_model=RouletteStatusResponse)
def roulette_status(
    ticket_type: str = GameTokenType.ROULETTE_COIN.value,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
) -> RouletteStatusResponse:
    today = date.today()
    return _roulette_service.get_status(db=db, user_id=user_id, today=today, ticket_type=ticket_type)


@router.post("/roulette/play", response_model=RoulettePlayResponse)
def roulette_play(
    payload: RoulettePlayRequest | None = None,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
) -> RoulettePlayResponse:
    today = date.today()
    ticket_type = payload.ticket_type if payload else GameTokenType.ROULETTE_COIN.value
    return _roulette_service.play(db=db, user_id=user_id, now=today, ticket_type=ticket_type)


@router.get("/dice/status", response_model=DiceStatusResponse)
def dice_status(
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
) -> DiceStatusResponse:
    today = date.today()
    return _dice_service.get_status(db=db, user_id=user_id, today=today)


@router.post("/dice/play", response_model=DicePlayResponse)
def dice_play(
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
) -> DicePlayResponse:
    today = date.today()
    return _dice_service.play(db=db, user_id=user_id, now=today)


@router.get("/lottery/status", response_model=LotteryStatusResponse)
def lottery_status(
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
) -> LotteryStatusResponse:
    today = date.today()
    return _lottery_service.get_status(db=db, user_id=user_id, today=today)


@router.post("/lottery/play", response_model=LotteryPlayResponse)
def lottery_play(
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
) -> LotteryPlayResponse:
    today = date.today()
    return _lottery_service.play(db=db, user_id=user_id, now=today)
