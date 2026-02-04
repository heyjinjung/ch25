"""V2 Exchange API Routes - Puzzle Collection → Gold Key Craft

SoT: docs/v2_specs/00_sot_meta/00_A_sot_code_ops_chk/learned_/game/20260131_puzzle_collection_gold_key_craft.md
"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_current_user
from app.core.exceptions import NotEnoughTokensError
from app.v2.models.user import V2User
from app.v2.services.v2_exchange_service import V2ExchangeService

router = APIRouter(prefix="/api/v2/exchange", tags=["v2-exchange"])


class CraftPuzzleResponse(BaseModel):
    result: str
    reward_token: str
    reward_amount: int
    consumed_tokens: dict
    message: str


class CraftStatusResponse(BaseModel):
    can_craft: bool
    collection: dict
    required: dict


@router.post("/craft-puzzle", response_model=CraftPuzzleResponse)
def craft_puzzle_to_gold_key(
    db: Session = Depends(get_db),
    current_user: V2User = Depends(get_current_user),
):
    """
    퍼즐 컬렉션 완성 → 골드키 교환
    
    Required: C1 + C2 + J + M 각 1개 이상
    Reward: GOLD_KEY_TICKET 1개
    """
    try:
        result = V2ExchangeService.craft_puzzle_to_gold_key(db, current_user.id)
        return result
    except NotEnoughTokensError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/craft-status", response_model=CraftStatusResponse)
def get_craft_status(
    db: Session = Depends(get_db),
    current_user: V2User = Depends(get_current_user),
):
    """퍼즐 교환 가능 여부 및 현재 잔액 조회"""
    return V2ExchangeService.get_craft_status(db, current_user.id)
