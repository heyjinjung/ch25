"""V2 auth service."""
from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException
from sqlalchemy.orm import Session
import jwt

from app.core.config import get_settings
from app.core.security import create_access_token
from app.v2.models.user import V2User
from app.v2.models.auth_event import V2UserAuthEvent, AuthEventType
from app.v2.models.refresh_token import V2UserRefreshToken


def _coerce_utc(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def log_auth_event(
    db: Session,
    user_id: int,
    event_type: AuthEventType,
    ip_address: str | None = None,
    user_agent: str | None = None,
    telegram_id: int | None = None,
    success: bool = True,
    error_message: str | None = None,
) -> V2UserAuthEvent:
    """
    인증 이벤트 기록

    Args:
        db: DB 세션
        user_id: 유저 ID (실패 시 0)
        event_type: 이벤트 타입
        ip_address: 클라이언트 IP
        user_agent: User-Agent 헤더
        telegram_id: 텔레그램 유저 ID
        success: 성공 여부
        error_message: 실패 시 에러 메시지

    Returns:
        V2UserAuthEvent: 생성된 이벤트 레코드
    """
    event = V2UserAuthEvent(
        user_id=user_id,
        event_type=event_type,
        ip_address=ip_address,
        user_agent=user_agent[:500] if user_agent else None,
        telegram_id=telegram_id,
        success=success,
        error_message=error_message[:500] if error_message else None,
    )
    db.add(event)
    db.flush()  # Use flush for better test isolation; caller/middleware can commit
    return event


def create_refresh_token(user_id: int, expires_days: int = 30) -> tuple[str, str]:
    """
    Refresh Token 생성

    Args:
        user_id: 유저 ID
        expires_days: 만료 일수 (기본 30일)

    Returns:
        tuple[str, str]: (token, jti)
    """
    settings = get_settings()
    now = datetime.now(timezone.utc)
    jti = str(uuid.uuid4())

    payload = {
        "sub": str(user_id),
        "iat": now,
        "exp": now + timedelta(days=expires_days),
        "typ": "refresh",
        "jti": jti,
    }

    token = jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)
    return token, jti


def decode_refresh_token(token: str) -> dict:
    """
    Refresh Token 검증 및 디코딩

    Args:
        token: Refresh Token 문자열

    Returns:
        dict: 디코딩된 페이로드

    Raises:
        HTTPException: 검증 실패 시
    """
    settings = get_settings()
    try:
        payload = jwt.decode(
            token, settings.jwt_secret, algorithms=[settings.jwt_algorithm]
        )

        typ = payload.get("typ")
        if typ != "refresh":
            raise HTTPException(status_code=401, detail="TOKEN_INVALID")

        jti = payload.get("jti")
        if not jti:
            raise HTTPException(status_code=401, detail="TOKEN_INVALID")

        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="TOKEN_EXPIRED")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="TOKEN_INVALID")


class V2AuthService:
    @staticmethod
    def issue_token(
        db: Session,
        *,
        user_id: int | None = None,
        cc_id: str | None = None,
        external_id: str | None = None,  # Legacy alias for cc_id
        password: str | None = None,
    ) -> tuple[str, V2User]:
        _ = password
        resolved_cc_id = (cc_id or external_id or "").strip()

        from app.v2.services.user_service import V2UserService
        user = None
        if resolved_cc_id:
            user = V2UserService.get_or_create_v2_user_from_legacy(db, resolved_cc_id)
        if user is None and user_id is not None:
            user = db.get(V2User, user_id)
        if user is None:
            raise ValueError("USER_NOT_FOUND")

        token = create_access_token(user_id=int(user.id))
        return token, user

    @staticmethod
    def issue_v2_tokens(
        db: Session,
        *,
        user_id: int | None = None,
        cc_id: str | None = None,
        external_id: str | None = None,
        password: str | None = None,
        role: str | None = None,
    ) -> tuple[str, str, V2User]:
        """
        사용자 식별 후 Access + Refresh Token 동시 발급 (V2 표준)
        """
        # 1. 사용자 식별 (기존 issue_token 로직 재사용)
        resolved_cc_id = (cc_id or external_id or "").strip()

        from app.v2.services.user_service import V2UserService
        user = None
        if resolved_cc_id:
            user = V2UserService.get_or_create_v2_user_from_legacy(db, resolved_cc_id)
        if user is None and user_id is not None:
            user = db.get(V2User, user_id)
        
        if user is None:
            raise ValueError("USER_NOT_FOUND")

        # 2. 다중 토큰 발급
        access_token, refresh_token, _ = V2AuthService.issue_tokens(db, user.id, role=role)
        
        return access_token, refresh_token, user

    @staticmethod
    def issue_tokens(
        db: Session,
        user_id: int,
        role: str | None = None,
    ) -> tuple[str, str, V2UserRefreshToken]:
        """
        Access Token + Refresh Token 발급

        Args:
            db: DB 세션
            user_id: 유저 ID
            role: 관리자 역할 (optional)

        Returns:
            tuple[str, str, V2UserRefreshToken]: (access_token, refresh_token, token_record)
        """
        settings = get_settings()
        # Access Token (V2 전용 만료 시간 사용: 기본 15분)
        access_token = create_access_token(
            user_id,
            role=role,
            expires_minutes=settings.v2_access_token_expire_minutes,
        )

        # Refresh Token
        refresh_token, jti = create_refresh_token(user_id)

        # DB 저장
        now_utc = datetime.now(timezone.utc)
        token_record = V2UserRefreshToken(
            user_id=user_id,
            jti=jti,
            expires_at=now_utc + timedelta(days=30),
        )
        db.add(token_record)
        db.commit()

        return access_token, refresh_token, token_record

    @staticmethod
    def refresh_access_token(
        db: Session,
        refresh_token: str,
    ) -> tuple[str, str | None, V2User]:
        """
        Access Token 갱신

        Args:
            db: DB 세션
            refresh_token: Refresh Token 문자열

        Returns:
            tuple[str, str | None, V2User]: (new_access_token, new_refresh_token or None, user)

        Raises:
            HTTPException: 검증 실패 시
        """
        # 1. Refresh Token 디코딩
        decoded = decode_refresh_token(refresh_token)
        jti = decoded.get("jti")
        user_id = int(decoded.get("sub"))

        # 2. DB에서 토큰 조회
        token_record = db.query(V2UserRefreshToken).filter(
            V2UserRefreshToken.jti == jti,
            V2UserRefreshToken.user_id == user_id,
        ).first()

        if not token_record:
            raise HTTPException(status_code=401, detail="TOKEN_NOT_FOUND")

        # 3. Revoked 확인
        if token_record.revoked_at is not None:
            raise HTTPException(status_code=401, detail="TOKEN_REVOKED")

        # 4. 만료 확인
        now_utc = datetime.now(timezone.utc)
        expires_at = _coerce_utc(token_record.expires_at)
        if expires_at < now_utc:
            raise HTTPException(status_code=401, detail="TOKEN_EXPIRED")

        # 5. 새 Access Token 발급 (V2 전용 만료 시간)
        settings = get_settings()
        new_access_token = create_access_token(
            user_id,
            expires_minutes=settings.v2_access_token_expire_minutes,
        )

        # 6. last_used_at 갱신 (sliding window)
        token_record.last_used_at = now_utc

        # 7. 만료 7일 미만 시 새 Refresh Token 발급 (sliding)
        new_refresh_token = None
        days_left = (expires_at - now_utc).days

        if days_left < 7:
            new_refresh_token, new_jti = create_refresh_token(user_id)
            new_token_record = V2UserRefreshToken(
                user_id=user_id,
                jti=new_jti,
                expires_at=now_utc + timedelta(days=30),
            )
            db.add(new_token_record)
            # 기존 토큰 revoke
            token_record.revoked_at = now_utc

        db.commit()

        # 8. 유저 정보 조회
        user = db.get(V2User, user_id)
        if not user:
            raise HTTPException(status_code=401, detail="USER_NOT_FOUND")

        return new_access_token, new_refresh_token, user

    @staticmethod
    def revoke_refresh_token(
        db: Session,
        user_id: int,
        refresh_token: str | None = None,
        revoke_all: bool = False,
    ) -> int:
        """
        Refresh Token 폐기 (로그아웃)

        Args:
            db: DB 세션
            user_id: 유저 ID
            refresh_token: 폐기할 Refresh Token (None이면 revoke_all 필요)
            revoke_all: 모든 토큰 폐기 여부

        Returns:
            int: 폐기된 토큰 수
        """
        revoked_count = 0
        now = datetime.now(timezone.utc)

        if revoke_all:
            # 모든 유효한 토큰 폐기
            tokens = db.query(V2UserRefreshToken).filter(
                V2UserRefreshToken.user_id == user_id,
                V2UserRefreshToken.revoked_at.is_(None),
            ).all()

            for token in tokens:
                token.revoked_at = now
                revoked_count += 1
        elif refresh_token:
            try:
                decoded = decode_refresh_token(refresh_token)
                jti = decoded.get("jti")

                token_record = db.query(V2UserRefreshToken).filter(
                    V2UserRefreshToken.jti == jti,
                    V2UserRefreshToken.user_id == user_id,
                ).first()

                if token_record and token_record.revoked_at is None:
                    token_record.revoked_at = now
                    revoked_count = 1
            except HTTPException:
                pass  # 이미 무효한 토큰은 무시

        db.commit()
        return revoked_count
