"""V2 Auth routes."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_current_user_id
from app.models.user import User
from app.v2.schemas.v2_auth import AuthTokenRequest, AuthTokenResponse, AuthUser
from app.v2.services.auth_service import V2AuthService, log_auth_event
from app.v2.services.user_service import V2UserService
from app.v2.models.auth_event import AuthEventType

router = APIRouter(prefix="/auth", tags=["Auth"])


@router.post("/token", response_model=AuthTokenResponse, summary="Issue V2 JWT")
def v2_issue_token(
    payload: AuthTokenRequest,
    request: Request,
    db: Session = Depends(get_db),
) -> AuthTokenResponse:
    """
    순수 V2 JWT 발급 (Access + Refresh)
    
    기존 Password 기반 인증 또는 CC_ID 기반 인증 지원
    """
    client_ip = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")

    try:
        # 1. 토큰 발급 (V2 전용 - Refresh Token 포함)
        access_token, refresh_token, user = V2AuthService.issue_v2_tokens(
            db,
            user_id=payload.user_id,
            cc_id=payload.cc_id,
            external_id=payload.external_id,
            password=payload.password,
        )
    except ValueError as exc:
        # 실패 이벤트 기록
        from app.v2.services.auth_service import log_auth_event
        from app.v2.models.auth_event import AuthEventType
        log_auth_event(
            db=db,
            user_id=0,
            event_type=AuthEventType.LOGIN_FAILED,
            ip_address=client_ip,
            user_agent=user_agent,
            success=False,
            error_message=str(exc),
        )
        detail = str(exc) if str(exc) else "USER_NOT_FOUND"
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=detail) from exc

    # 2. 로그인 성공 이벤트 기록
    from app.v2.services.auth_service import log_auth_event
    from app.v2.models.auth_event import AuthEventType
    log_auth_event(
        db=db,
        user_id=user.id,
        event_type=AuthEventType.LOGIN_SUCCESS,
        ip_address=client_ip,
        user_agent=user_agent,
        success=True,
    )

    # 3. LOGIN 미션 트리거 (V2 전용)
    try:
        from app.v2.services.mission_service import V2MissionService
        V2MissionService.ensure_login_progress(db, user.id)
    except Exception:
        pass

    return AuthTokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user=AuthUser(
            id=int(user.id),
            external_id=user.cc_id,
            cc_id=user.cc_id,
            nickname=user.nickname,
            telegram_id=user.telegram_id,
            telegram_username=user.telegram_username,
            vault_locked_balance=int(user.vault_locked_balance or 0),
        ),
    )


@router.post("/login", response_model=AuthTokenResponse, summary="Login (alias)")
def v2_login(
    payload: AuthTokenRequest,
    request: Request,
    db: Session = Depends(get_db),
) -> AuthTokenResponse:
    return v2_issue_token(payload, request, db)


class RefreshTokenRequest(BaseModel):
    """Refresh Token 갱신 요청"""
    refresh_token: str


class LogoutRequest(BaseModel):
    """로그아웃 요청"""
    refresh_token: str | None = None
    revoke_all: bool = False


@router.post("/refresh", response_model=AuthTokenResponse)
def v2_refresh(
    payload: RefreshTokenRequest,
    request: Request,
    db: Session = Depends(get_db),
) -> AuthTokenResponse:
    """
    Access Token 갱신

    Refresh Token을 검증하고 새 Access Token을 발급합니다.
    만료 7일 미만인 경우 새 Refresh Token도 함께 발급합니다.
    """
    client_ip = request.client.host if request.client else None

    try:
        new_access_token, new_refresh_token, v2_user = V2AuthService.refresh_access_token(
            db, payload.refresh_token
        )
    except HTTPException as exc:
        raise exc

    # 이벤트 기록
    log_auth_event(
        db=db,
        user_id=v2_user.id,
        event_type=AuthEventType.TOKEN_REFRESH,
        ip_address=client_ip,
        success=True,
    )

    return AuthTokenResponse(
        access_token=new_access_token,
        refresh_token=new_refresh_token or payload.refresh_token,
        user=AuthUser(
            id=int(v2_user.id),
            external_id=v2_user.cc_id,
            cc_id=v2_user.cc_id,
            nickname=v2_user.nickname,
            telegram_id=v2_user.telegram_id,
            telegram_username=v2_user.telegram_username,
            vault_locked_balance=v2_user.vault_locked_balance,
        ),
    )


@router.post("/logout")
def v2_logout(
    payload: LogoutRequest,
    request: Request,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
) -> dict:
    """
    로그아웃

    Refresh Token을 폐기합니다.
    revoke_all=True 시 해당 유저의 모든 Refresh Token을 폐기합니다.
    """
    client_ip = request.client.host if request.client else None

    revoked_count = V2AuthService.revoke_refresh_token(
        db,
        user_id=user_id,
        refresh_token=payload.refresh_token,
        revoke_all=payload.revoke_all,
    )

    # 이벤트 기록
    log_auth_event(
        db=db,
        user_id=user_id,
        event_type=AuthEventType.LOGOUT,
        ip_address=client_ip,
        success=True,
    )

    return {"success": True, "revoked_count": revoked_count}
