"""Admin endpoints for granting game tokens."""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.schemas.game_tokens import GrantGameTokensRequest, GrantGameTokensResponse
from app.services.game_wallet_service import GameWalletService

router = APIRouter(prefix="/admin/api/game-tokens", tags=["admin-game-tokens"])
wallet_service = GameWalletService()


@router.post("/grant", response_model=GrantGameTokensResponse)
def grant_tokens(payload: GrantGameTokensRequest, db: Session = Depends(get_db)):
    balance = wallet_service.grant_tokens(db, payload.user_id, payload.token_type, payload.amount)
    return GrantGameTokensResponse(user_id=payload.user_id, token_type=payload.token_type, balance=balance)
