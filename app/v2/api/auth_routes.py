"""V2 Auth routes."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.models.user import User
from app.v2.schemas.v2_auth import AuthTokenRequest, AuthTokenResponse, AuthUser
from app.v2.services.auth_service import V2AuthService
from app.v2.services.user_service import V2UserService

router = APIRouter(prefix="/auth", tags=["Auth"])


@router.post("/token", response_model=AuthTokenResponse, summary="Issue V2 JWT")
def v2_issue_token(
    payload: AuthTokenRequest,
    request: Request,
    db: Session = Depends(get_db),
) -> AuthTokenResponse:
    _ = request
    try:
        token, user = V2AuthService.issue_token(
            db,
            user_id=payload.user_id,
            cc_id=payload.cc_id,
            external_id=payload.external_id,
            password=payload.password,
        )
    except ValueError as exc:
        detail = str(exc) if str(exc) else "USER_NOT_FOUND"
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=detail) from exc

    legacy_user_id = V2UserService.ensure_legacy_user_id(db, int(user.id))
    legacy_user = db.get(User, legacy_user_id)
    vault_balance = int(legacy_user.vault_locked_balance or 0) if legacy_user else int(user.vault_locked_balance or 0)

    return AuthTokenResponse(
        access_token=token,
        user=AuthUser(
            id=int(user.id),
            external_id=user.cc_id,
            cc_id=user.cc_id,
            nickname=user.nickname,
            telegram_id=user.telegram_id,
            telegram_username=user.telegram_username,
            vault_locked_balance=vault_balance,
        ),
    )


@router.post("/login", response_model=AuthTokenResponse, summary="Login (alias)")
def v2_login(
    payload: AuthTokenRequest,
    request: Request,
    db: Session = Depends(get_db),
) -> AuthTokenResponse:
    return v2_issue_token(payload, request, db)


@router.post("/refresh", response_model=AuthTokenResponse)
def v2_refresh() -> AuthTokenResponse:
    raise HTTPException(status_code=501, detail="NOT_IMPLEMENTED")


@router.post("/logout")
def v2_logout() -> dict:
    return {"success": True}
