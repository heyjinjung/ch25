"""Admin endpoints for granting game tokens."""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.models.dice import DiceLog
from app.models.lottery import LotteryLog
from app.models.roulette import RouletteLog
from app.models.game_wallet import UserGameWallet
from app.models.user import User
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


def _resolve_user_id(db: Session, user_id: int | None, external_id: str | None) -> int:
    if user_id:
        return user_id
    if external_id:
        user = db.query(User).filter(User.external_id == external_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="USER_NOT_FOUND")
        return user.id
    raise HTTPException(status_code=400, detail="USER_REQUIRED")


@router.post("/grant", response_model=GrantGameTokensResponse)
def grant_tokens(payload: GrantGameTokensRequest, db: Session = Depends(get_db)):
    user_id = _resolve_user_id(db, payload.user_id, payload.external_id)
    external = db.get(User, user_id).external_id
    balance = wallet_service.grant_tokens(db, user_id, payload.token_type, payload.amount)
    return GrantGameTokensResponse(user_id=user_id, token_type=payload.token_type, balance=balance, external_id=external)


@router.post("/revoke", response_model=GrantGameTokensResponse)
def revoke_tokens(payload: RevokeGameTokensRequest, db: Session = Depends(get_db)):
    user_id = _resolve_user_id(db, payload.user_id, payload.external_id)
    external = db.get(User, user_id).external_id
    balance = wallet_service.revoke_tokens(db, user_id, payload.token_type, payload.amount)
    return GrantGameTokensResponse(user_id=user_id, token_type=payload.token_type, balance=balance, external_id=external)


@router.get("/wallets", response_model=list[TokenBalance])
def list_wallets(user_id: int | None = None, external_id: str | None = None, db: Session = Depends(get_db)):
    query = db.query(UserGameWallet, User.external_id).join(User, User.id == UserGameWallet.user_id)
    if user_id:
        query = query.filter(UserGameWallet.user_id == user_id)
    if external_id:
        query = query.filter(User.external_id == external_id)
    rows = query.order_by(UserGameWallet.user_id, UserGameWallet.token_type).all()
    return [
        TokenBalance(
            user_id=row.UserGameWallet.user_id,  # type: ignore[attr-defined]
            external_id=row.external_id,  # type: ignore[attr-defined]
            token_type=row.UserGameWallet.token_type,  # type: ignore[attr-defined]
            balance=row.UserGameWallet.balance,  # type: ignore[attr-defined]
        )
        for row in rows
    ]


@router.get("/play-logs", response_model=list[PlayLogEntry])
def list_recent_play_logs(limit: int = 50, db: Session = Depends(get_db)):
    """Unified recent play logs from roulette/dice/lottery."""
    limit = min(max(limit, 1), 200)
    roulette_rows = (
        db.query(
            RouletteLog.id,
            RouletteLog.user_id,
            User.external_id,
            RouletteLog.reward_type,
            RouletteLog.reward_amount,
            RouletteLog.created_at,
        )
        .join(User, User.id == RouletteLog.user_id)
        .order_by(RouletteLog.created_at.desc())
        .limit(limit)
        .all()
    )
    dice_rows = (
        db.query(
            DiceLog.id,
            DiceLog.user_id,
            User.external_id,
            DiceLog.reward_type,
            DiceLog.reward_amount,
            DiceLog.created_at,
        )
        .join(User, User.id == DiceLog.user_id)
        .order_by(DiceLog.created_at.desc())
        .limit(limit)
        .all()
    )
    lottery_rows = (
        db.query(
            LotteryLog.id,
            LotteryLog.user_id,
            User.external_id,
            LotteryLog.reward_type,
            LotteryLog.reward_amount,
            LotteryLog.created_at,
        )
        .join(User, User.id == LotteryLog.user_id)
        .order_by(LotteryLog.created_at.desc())
        .limit(limit)
        .all()
    )

    def to_entry(rows, game: str):
        return [
          PlayLogEntry(
              id=row.id,
              user_id=row.user_id,
              external_id=row.external_id,
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
