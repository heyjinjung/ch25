"""V2 API routes (web verification + admin ops)."""
from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_current_admin_id, get_current_user_id, get_db
from app.models.game_wallet import GameTokenType
from app.schemas.dice import DicePlayResponse, DiceStatusResponse
from app.schemas.lottery import LotteryPlayResponse, LotteryStatusResponse
from app.schemas.roulette import RoulettePlayRequest, RoulettePlayResponse, RouletteStatusResponse
from app.services.dice_service import DiceService
from app.services.lottery_service import LotteryService
from app.services.roulette_service import RouletteService
from app.v2.schemas.v2_admin_message import V2MessageCreate, V2MessageResponse, V2SegmentBatchResponse
from app.v2.services.admin_message_service import V2AdminMessageService
from app.v2.services.segment_service import V2SegmentService

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


@router.post("/segments/run", response_model=V2SegmentBatchResponse, tags=["v2-admin"])
def run_segment_batch(
    db: Session = Depends(get_db),
    admin_id: int = Depends(get_current_admin_id),
) -> V2SegmentBatchResponse:
    _ = admin_id
    result = V2SegmentService.segment_all_users(db)
    return V2SegmentBatchResponse(**result)


@router.post("/messages", response_model=V2MessageResponse, tags=["v2-admin"])
def create_admin_message(
    payload: V2MessageCreate,
    db: Session = Depends(get_db),
    admin_id: int = Depends(get_current_admin_id),
) -> V2MessageResponse:
    if payload.target_type != "ALL" and not (payload.target_value and payload.target_value.strip()):
        raise HTTPException(status_code=400, detail="TARGET_VALUE_REQUIRED")

    resolved_user_ids = None
    if payload.target_type == "USER" and payload.target_value:
        resolved_user_ids = []
        for raw in payload.target_value.split(","):
            raw = raw.strip()
            if not raw:
                continue
            try:
                resolved_user_ids.append(int(raw))
            except ValueError:
                continue

    msg = V2AdminMessageService.create_message(
        db,
        sender_admin_id=admin_id,
        title=payload.title,
        content=payload.content,
        target_type=payload.target_type,
        target_value=payload.target_value,
        channels=payload.channels,
    )

    V2AdminMessageService.fan_out_message(
        db,
        message_id=msg.id,
        target_type=payload.target_type,
        target_value=payload.target_value,
        resolved_user_ids=resolved_user_ids,
    )

    return msg
