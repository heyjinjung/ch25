"""V2 User routes."""
from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.v2.api.deps import get_current_user
from app.v2.schemas.v2_auth import UserMeResponse, UserBalanceResponse
from app.v2.models.user import V2User

router = APIRouter(prefix="/user", tags=["User"])


@router.get("/me", response_model=UserMeResponse)
def v2_user_me(current_user: V2User = Depends(get_current_user)) -> UserMeResponse:
    return UserMeResponse(
        id=int(current_user.id),
        external_id=current_user.cc_id,
        cc_id=current_user.cc_id,
        nickname=current_user.nickname,
        telegram_id=current_user.telegram_id,
        telegram_username=current_user.telegram_username,
    )


@router.get("/balance", response_model=UserBalanceResponse)
def v2_user_balance(
    db: Session = Depends(get_db),
    current_user: V2User = Depends(get_current_user),
) -> UserBalanceResponse:
    _ = db
    return UserBalanceResponse(vault_locked_balance=int(current_user.vault_locked_balance or 0))
