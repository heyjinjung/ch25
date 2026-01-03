"""Admin endpoints for granting game tokens."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import desc, literal, literal_column
from sqlalchemy.orm import Session, joinedload

from app.api.deps import get_db
from app.models.dice import DiceLog
from app.models.lottery import LotteryLog, LotteryPrize
from app.models.roulette import RouletteLog, RouletteSegment
from app.models.game_wallet import GameTokenType
from app.models.game_wallet import UserGameWallet
from app.models.game_wallet_ledger import UserGameWalletLedger
from app.models.user import User
from app.schemas.game_tokens import (
    GrantGameTokensRequest,
    GrantGameTokensResponse,
    LedgerEntry,
    PlayLogEntry,
    RevokeGameTokensRequest,
    TokenBalance,
    UserWalletSummary,
)
from app.schemas.base import to_kst_iso
from app.services.game_wallet_service import GameWalletService
from app.services.inventory_service import InventoryService
from app.services.admin_user_identity_service import resolve_user_id_by_identifier
from app.services.admin_user_identity_service import build_admin_user_summary

router = APIRouter(prefix="/admin/api/game-tokens", tags=["admin-game-tokens"])
wallet_service = GameWalletService()


def _resolve_user_id(db: Session, payload) -> int:
    # Backward compatible resolution:
    # - user_id (explicit)
    # - user_identifier (preferred)
    # - telegram_username (legacy)
    # - external_id (legacy; also accepts @username / tg_... patterns)
    if getattr(payload, "user_id", None):
        return int(payload.user_id)

    identifier = (
        getattr(payload, "user_identifier", None)
        or getattr(payload, "telegram_username", None)
        or getattr(payload, "external_id", None)
    )
    if identifier and str(identifier).strip():
        return resolve_user_id_by_identifier(db, str(identifier))
    raise HTTPException(status_code=400, detail="USER_REQUIRED")


@router.post("/grant", response_model=GrantGameTokensResponse)
def grant_tokens(payload: GrantGameTokensRequest, db: Session = Depends(get_db)):
    user_id = _resolve_user_id(db, payload)
    user = db.get(User, user_id)

    # Phase 2 rule: DIAMOND is Inventory SoT (not wallet).
    if payload.token_type == GameTokenType.DIAMOND:
        item = InventoryService.grant_item(
            db,
            user_id=user_id,
            item_type="DIAMOND",
            amount=payload.amount,
            reason="ADMIN_GRANT",
            related_id="admin_game_tokens_grant",
            auto_commit=True,
        )
        balance = int(item.quantity)
    else:
        balance = wallet_service.grant_tokens(db, user_id, payload.token_type, payload.amount)
    summary = build_admin_user_summary(user) if user else None
    return GrantGameTokensResponse(
        user_id=user_id, 
        token_type=payload.token_type, 
        balance=balance, 
        external_id=user.external_id if user else None,
        telegram_username=user.telegram_username if user else None,
        nickname=user.nickname if user else None,
        user=summary,
    )


@router.post("/revoke", response_model=GrantGameTokensResponse)
def revoke_tokens(payload: RevokeGameTokensRequest, db: Session = Depends(get_db)):
    user_id = _resolve_user_id(db, payload)
    user = db.get(User, user_id)

    # Phase 2 rule: DIAMOND is Inventory SoT (not wallet).
    if payload.token_type == GameTokenType.DIAMOND:
        item = InventoryService.consume_item(
            db,
            user_id=user_id,
            item_type="DIAMOND",
            amount=payload.amount,
            reason="ADMIN_REVOKE",
            related_id="admin_game_tokens_revoke",
            auto_commit=True,
        )
        balance = int(item.quantity)
    else:
        balance = wallet_service.revoke_tokens(db, user_id, payload.token_type, payload.amount)
    summary = build_admin_user_summary(user) if user else None
    return GrantGameTokensResponse(
        user_id=user_id, 
        token_type=payload.token_type, 
        balance=balance, 
        external_id=user.external_id if user else None,
        telegram_username=user.telegram_username if user else None,
        nickname=user.nickname if user else None,
        user=summary,
    )


@router.get("/wallets", response_model=list[TokenBalance])
def list_wallets(
    user_id: int | None = None,
    external_id: str | None = None,
    has_balance: bool | None = None,
    token_type: str | None = None,
    limit: int = 50,
    offset: int = 0,
    db: Session = Depends(get_db),
):
    limit = min(max(limit, 1), 200)
    offset = max(offset, 0)

    query = (
        db.query(UserGameWallet, User)
        .join(User, User.id == UserGameWallet.user_id)
        .options(joinedload(User.admin_profile))
    )
    if user_id:
        query = query.filter(UserGameWallet.user_id == user_id)
    if external_id:
        query = query.filter(User.external_id == external_id)
    if has_balance is True:
        query = query.filter(UserGameWallet.balance > 0)
    elif has_balance is False:
        query = query.filter(UserGameWallet.balance == 0)
    if token_type:
        query = query.filter(UserGameWallet.token_type == token_type)
    rows = (
        query.order_by(UserGameWallet.user_id, UserGameWallet.token_type)
        .offset(offset)
        .limit(limit)
        .all()
    )
    return [
        TokenBalance(
            user_id=wallet.user_id,
            external_id=user.external_id,
            telegram_username=user.telegram_username,
            nickname=user.nickname,
            user=build_admin_user_summary(user),
            token_type=wallet.token_type,
            balance=wallet.balance,
        )
        for (wallet, user) in rows
    ]


@router.get("/play-logs", response_model=list[PlayLogEntry])
def list_recent_play_logs(
    limit: int = 50,
    offset: int = 0,
    external_id: str | None = None,
    db: Session = Depends(get_db),
):
    """Unified recent play logs from roulette/dice/lottery with pagination."""
    limit = min(max(limit, 1), 200)
    offset = max(offset, 0)

    # Build optional user filter
    user_filter_roulette = True
    user_filter_dice = True
    user_filter_lottery = True

    if external_id:
        user = db.query(User).filter(User.external_id == external_id).first()
        if user:
            user_filter_roulette = RouletteLog.user_id == user.id
            user_filter_dice = DiceLog.user_id == user.id
            user_filter_lottery = LotteryLog.user_id == user.id
        else:
            return []  # No user found with this external_id

    # 1. Roulette Query
    q_roulette = (
        db.query(
            RouletteLog.id.label("id"),
            RouletteLog.user_id,
            User.external_id,
            User.telegram_username,
            User.nickname,
            RouletteLog.reward_type,
            RouletteLog.reward_amount,
            RouletteSegment.label.label("detail"),
            RouletteLog.created_at.label("created_at"),
            literal("ROULETTE").label("game_type"),
        )
        .join(User, User.id == RouletteLog.user_id)
        .join(RouletteSegment, RouletteSegment.id == RouletteLog.segment_id)
        .filter(user_filter_roulette)
    )

    # 2. Dice Query
    q_dice = (
        db.query(
            DiceLog.id.label("id"),
            DiceLog.user_id,
            User.external_id,
            User.telegram_username,
            User.nickname,
            DiceLog.reward_type,
            DiceLog.reward_amount,
            DiceLog.result.label("detail"),
            DiceLog.created_at.label("created_at"),
            literal("DICE").label("game_type"),
        )
        .join(User, User.id == DiceLog.user_id)
        .filter(user_filter_dice)
    )

    # 3. Lottery Query
    q_lottery = (
        db.query(
            LotteryLog.id.label("id"),
            LotteryLog.user_id,
            User.external_id,
            User.telegram_username,
            User.nickname,
            LotteryLog.reward_type,
            LotteryLog.reward_amount,
            LotteryPrize.label.label("detail"),
            LotteryLog.created_at.label("created_at"),
            literal("LOTTERY").label("game_type"),
        )
        .join(User, User.id == LotteryLog.user_id)
        .join(LotteryPrize, LotteryPrize.id == LotteryLog.prize_id)
        .filter(user_filter_lottery)
    )

    # Union All + Sort + Pagination
    union_q = q_roulette.union_all(q_dice, q_lottery).order_by(desc(literal_column("created_at")))

    rows = union_q.offset(offset).limit(limit).all()

    user_ids = sorted({int(r.user_id) for r in rows if getattr(r, "user_id", None) is not None})
    users = (
        db.query(User)
        .options(joinedload(User.admin_profile))
        .filter(User.id.in_(user_ids))
        .all()
        if user_ids
        else []
    )
    user_summary_by_id = {u.id: build_admin_user_summary(u) for u in users}

    return [
        PlayLogEntry(
            id=row.id,
            user_id=row.user_id,
            external_id=row.external_id,
            telegram_username=row.telegram_username,
            nickname=row.nickname,
            user=user_summary_by_id.get(int(row.user_id)),
            game=row.game_type,
            reward_label=row.detail,
            reward_type=row.reward_type,
            reward_amount=row.reward_amount,
            created_at=to_kst_iso(row.created_at),
        )
        for row in rows
    ]



@router.get("/ledger", response_model=list[LedgerEntry])
def list_wallet_ledger(
    limit: int = 100,
    offset: int = 0,
    user_id: int | None = None,
    external_id: str | None = None,
    token_type: str | None = None,
    db: Session = Depends(get_db),
):
    limit = min(max(limit, 1), 500)
    offset = max(offset, 0)
    query = (
        db.query(UserGameWalletLedger, User)
        .join(User, User.id == UserGameWalletLedger.user_id)
        .options(joinedload(User.admin_profile))
    )
    if user_id:
        query = query.filter(UserGameWalletLedger.user_id == user_id)
    if external_id:
        query = query.filter(User.external_id == external_id)
    if token_type:
        query = query.filter(UserGameWalletLedger.token_type == token_type)

    rows = (
        query.order_by(UserGameWalletLedger.created_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )
    return [
        LedgerEntry(
            id=ledger.id,
            user_id=ledger.user_id,
            external_id=user.external_id,
            telegram_username=user.telegram_username,
            nickname=user.nickname,
            user=build_admin_user_summary(user),
            token_type=ledger.token_type,
            delta=ledger.delta,
            balance_after=ledger.balance_after,
            reason=ledger.reason,
            label=ledger.label,
            meta_json=ledger.meta_json,
            created_at=to_kst_iso(ledger.created_at),
        )
        for (ledger, user) in rows
    ]


@router.get("/summary", response_model=list[UserWalletSummary])
def get_user_wallet_summary(db: Session = Depends(get_db)):
    """Return a summary of all users who have at least one non-zero ticket balance."""
    # We join User and UserGameWallet, filter for balance > 0
    rows = (
        db.query(
            User.id, 
            User.external_id, 
            User.telegram_username,
            User.nickname,
            UserGameWallet.token_type, 
            UserGameWallet.balance
        )
        .join(UserGameWallet, User.id == UserGameWallet.user_id)
        .filter(UserGameWallet.balance > 0)
        .order_by(User.id)
        .all()
    )

    # Group by user
    summary_map: dict[int, UserWalletSummary] = {}
    for user_id, external_id, telegram_username, nickname, token_type, balance in rows:
        if user_id not in summary_map:
            summary_map[user_id] = UserWalletSummary(
                user_id=user_id,
                external_id=external_id,
                telegram_username=telegram_username,
                nickname=nickname,
                balances={},
                user=None,
            )
        summary_map[user_id].balances[token_type] = balance

    user_ids = list(summary_map.keys())
    users = (
        db.query(User)
        .options(joinedload(User.admin_profile))
        .filter(User.id.in_(user_ids))
        .all()
        if user_ids
        else []
    )
    user_summary_by_id = {u.id: build_admin_user_summary(u) for u in users}
    for uid, entry in summary_map.items():
        entry.user = user_summary_by_id.get(uid)

    return list(summary_map.values())
