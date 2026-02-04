"""V2 Auth/User alias routes.

Purpose:
- Provide /api/v2/* endpoints that behave exactly like existing V1 endpoints.
- Keep migration low-risk while FE switches to /api/v2.

Note:
- When Telegram-native auth becomes the SoT, these alias routes can be replaced
  by true V2 implementations while optionally keeping V1 compatibility.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from app.api.deps import get_current_user_id, get_db

from app.api.routes import activity as v1_activity
from app.api.routes import auth as v1_auth
from app.api.routes import new_user_onboarding as v1_new_user
from app.api.routes import telegram as v1_telegram

router = APIRouter(tags=["v2-auth-user-alias"])


@router.post("/auth/token", response_model=v1_auth.TokenResponse, tags=["v2-auth"])
def v2_issue_token(
    payload: v1_auth.TokenRequest,
    request: Request,
    db: Session = Depends(get_db),
) -> v1_auth.TokenResponse:
    return v1_auth.issue_token(payload, request, db)


@router.post("/activity/record", response_model=v1_activity.ActivityRecordResponse, tags=["v2-activity"])
def v2_record_activity(
    payload: v1_activity.ActivityRecordRequest,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
) -> v1_activity.ActivityRecordResponse:
    return v1_activity.record_activity(payload, db, user_id)


@router.get("/new-user/status", response_model=v1_new_user.NewUserStatusResponse, tags=["v2-new-user"])
def v2_new_user_status(
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
) -> v1_new_user.NewUserStatusResponse:
    return v1_new_user.status(db, user_id)


@router.post("/new-user/claim-welcome", response_model=v1_new_user.ClaimWelcomeResponse, tags=["v2-new-user"])
def v2_claim_welcome(
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
) -> v1_new_user.ClaimWelcomeResponse:
    return v1_new_user.claim_welcome(db, user_id)


@router.post("/telegram/link-token", response_model=v1_telegram.TelegramLinkTokenResponse, tags=["v2-telegram"])
def v2_issue_link_token(
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
) -> v1_telegram.TelegramLinkTokenResponse:
    return v1_telegram.issue_link_token(db, user_id)


@router.post("/telegram/auth", response_model=v1_telegram.TelegramAuthResponse, tags=["v2-telegram"])
def v2_telegram_auth(
    payload: v1_telegram.TelegramAuthRequest,
    db: Session = Depends(get_db),
) -> v1_telegram.TelegramAuthResponse:
    return v1_telegram.telegram_auth(payload, db)

# --- Added for SoT Compliance ---

@router.post("/auth/login", tags=["v2-auth"])
def v2_login(
    payload: v1_auth.TokenRequest,
    request: Request,
    db: Session = Depends(get_db),
):
    # Alias to token issue
    return v1_auth.issue_token(payload, request, db)

@router.post("/auth/refresh", tags=["v2-auth"])
def v2_refresh():
    # Placeholder
    return {"access_token": "mock_refresh", "token_type": "bearer"}

@router.post("/auth/logout", tags=["v2-auth"])
def v2_logout():
    return {"success": True}

@router.get("/user/me", tags=["v2-user"])
def v2_user_me(user_id: int = Depends(get_current_user_id)):
    return {"id": user_id, "nickname": "test_user"}

@router.get("/user/balance", tags=["v2-user"])
def v2_user_balance(user_id: int = Depends(get_current_user_id)):
    return {"vault_locked": 0, "vault_available": 0}
