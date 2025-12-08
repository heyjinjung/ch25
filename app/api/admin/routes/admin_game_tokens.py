"""Admin endpoints for granting game tokens."""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.models.dice import DiceLog
from app.models.lottery import LotteryLog
from app.models.roulette import RouletteLog
from app.models.game_wallet import UserGameWallet
from app.schemas.game_tokens import (
    GrantGameTokensRequest,
    GrantGameTokensResponse,
    PlayLogEntry,
    RevokeGameTokensRequest,
    TokenBalance,
)
from app.services.game_wallet_service import GameWalletService

router = APIRouter(prefix="/admin/api/game-tokens", tags=["admin-game-tokens"])
wallet_service = GameWalletService()


@router.post("/grant", response_model=GrantGameTokensResponse)
def grant_tokens(payload: GrantGameTokensRequest, db: Session = Depends(get_db)):
    balance = wallet_service.grant_tokens(db, payload.user_id, payload.token_type, payload.amount)
    return GrantGameTokensResponse(user_id=payload.user_id, token_type=payload.token_type, balance=balance)


@router.post("/revoke", response_model=GrantGameTokensResponse)
def revoke_tokens(payload: RevokeGameTokensRequest, db: Session = Depends(get_db)):
    balance = wallet_service.revoke_tokens(db, payload.user_id, payload.token_type, payload.amount)
    return GrantGameTokensResponse(user_id=payload.user_id, token_type=payload.token_type, balance=balance)


@router.get("/wallets", response_model=list[TokenBalance])
def list_wallets(user_id: int | None = None, db: Session = Depends(get_db)):
    query = db.query(UserGameWallet)
    if user_id:
        query = query.filter(UserGameWallet.user_id == user_id)
    rows = query.order_by(UserGameWallet.user_id, UserGameWallet.token_type).all()
    return [
        TokenBalance(user_id=row.user_id, token_type=row.token_type, balance=row.balance)  # type: ignore[arg-type]
        for row in rows
    ]


@router.get("/play-logs", response_model=list[PlayLogEntry])
def list_recent_play_logs(limit: int = 50, db: Session = Depends(get_db)):
    """Unified recent play logs from roulette/dice/lottery."""
    limit = min(max(limit, 1), 200)
    roulette_rows = (
        db.query(RouletteLog.id, RouletteLog.user_id, RouletteLog.reward_type, RouletteLog.reward_amount, RouletteLog.created_at)
        .order_by(RouletteLog.created_at.desc())
        .limit(limit)
        .all()
    )
    dice_rows = (
        db.query(DiceLog.id, DiceLog.user_id, DiceLog.reward_type, DiceLog.reward_amount, DiceLog.created_at)
        .order_by(DiceLog.created_at.desc())
        .limit(limit)
        .all()
    )
    lottery_rows = (
        db.query(LotteryLog.id, LotteryLog.user_id, LotteryLog.reward_type, LotteryLog.reward_amount, LotteryLog.created_at)
        .order_by(LotteryLog.created_at.desc())
        .limit(limit)
        .all()
    )

    def to_entry(rows, game: str):
        return [
          PlayLogEntry(
              id=row.id,
              user_id=row.user_id,
              game=game,
              reward_type=row.reward_type,
              reward_amount=row.reward_amount,
              created_at=row.created_at.isoformat(),
          )
          for row in rows
        ]

    merged = to_entry(roulette_rows, "ROULETTE") + to_entry(dice_rows, "DICE") + to_entry(lottery_rows, "LOTTERY")
    merged.sort(key=lambda r: r.created_at, reverse=True)
    return merged[:limit]
