import os
from datetime import datetime, timedelta, timezone

import jwt
import pytest
from fastapi import HTTPException
from fastapi.security import HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.security import create_access_token
from app.v2.api.deps import get_current_user_id
from app.v2.models.auth_event import AuthEventType, V2UserAuthEvent
from app.v2.models.refresh_token import V2UserRefreshToken
from app.v2.models.user import V2User
from app.v2.services.auth_service import (
    V2AuthService,
    create_refresh_token,
    decode_refresh_token,
    log_auth_event,
)


def _make_jwt(payload: dict) -> str:
    settings = get_settings()
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def test_log_auth_event_truncates_user_agent_and_error_message(db: Session):
    long_ua = "u" * 800
    long_error = "e" * 900

    log_auth_event(
        db,
        user_id=0,
        event_type=AuthEventType.LOGIN_FAILED,
        ip_address="1.2.3.4",
        user_agent=long_ua,
        success=False,
        error_message=long_error,
    )
    db.commit()

    row = (
        db.query(V2UserAuthEvent)
        .filter(V2UserAuthEvent.event_type == AuthEventType.LOGIN_FAILED)
        .order_by(V2UserAuthEvent.id.desc())
        .first()
    )
    assert row is not None
    assert row.user_agent is not None
    assert len(row.user_agent) == 500
    assert row.error_message is not None
    assert len(row.error_message) == 500


def test_decode_refresh_token_invalid_typ_raises(db: Session):
    _ = db
    now = datetime.now(timezone.utc)
    token = _make_jwt(
        {
            "sub": "123",
            "iat": now,
            "exp": now + timedelta(minutes=10),
            "typ": "access",
            "jti": "x",
        }
    )

    with pytest.raises(HTTPException) as exc:
        decode_refresh_token(token)
    assert exc.value.status_code == 401
    assert exc.value.detail == "TOKEN_INVALID"


def test_decode_refresh_token_missing_jti_raises(db: Session):
    _ = db
    now = datetime.now(timezone.utc)
    token = _make_jwt(
        {
            "sub": "123",
            "iat": now,
            "exp": now + timedelta(minutes=10),
            "typ": "refresh",
        }
    )

    with pytest.raises(HTTPException) as exc:
        decode_refresh_token(token)
    assert exc.value.status_code == 401
    assert exc.value.detail == "TOKEN_INVALID"


def test_decode_refresh_token_expired_raises(db: Session):
    _ = db
    now = datetime.now(timezone.utc)
    token = _make_jwt(
        {
            "sub": "123",
            "iat": now - timedelta(days=2),
            "exp": now - timedelta(days=1),
            "typ": "refresh",
            "jti": "expired",
        }
    )

    with pytest.raises(HTTPException) as exc:
        decode_refresh_token(token)
    assert exc.value.status_code == 401
    assert exc.value.detail == "TOKEN_EXPIRED"


def test_refresh_access_token_token_not_found(db: Session):
    user = V2User(cc_id="rt_nf", nickname="rt")
    db.add(user)
    db.commit()
    db.refresh(user)

    refresh_token, _jti = create_refresh_token(int(user.id))

    with pytest.raises(HTTPException) as exc:
        V2AuthService.refresh_access_token(db, refresh_token)
    assert exc.value.status_code == 401
    assert exc.value.detail == "TOKEN_NOT_FOUND"


def test_refresh_access_token_token_revoked(db: Session):
    user = V2User(cc_id="rt_rev", nickname="rt")
    db.add(user)
    db.commit()
    db.refresh(user)

    refresh_token, jti = create_refresh_token(int(user.id))
    token_record = V2UserRefreshToken(
        user_id=int(user.id),
        jti=jti,
        expires_at=datetime.now(timezone.utc) + timedelta(days=30),
        revoked_at=datetime.now(timezone.utc),
    )
    db.add(token_record)
    db.commit()

    with pytest.raises(HTTPException) as exc:
        V2AuthService.refresh_access_token(db, refresh_token)
    assert exc.value.status_code == 401
    assert exc.value.detail == "TOKEN_REVOKED"


def test_refresh_access_token_db_expired_even_if_jwt_valid(db: Session):
    user = V2User(cc_id="rt_dbexp", nickname="rt")
    db.add(user)
    db.commit()
    db.refresh(user)

    refresh_token, jti = create_refresh_token(int(user.id))
    token_record = V2UserRefreshToken(
        user_id=int(user.id),
        jti=jti,
        expires_at=datetime.now(timezone.utc) - timedelta(days=1),
    )
    db.add(token_record)
    db.commit()

    with pytest.raises(HTTPException) as exc:
        V2AuthService.refresh_access_token(db, refresh_token)
    assert exc.value.status_code == 401
    assert exc.value.detail == "TOKEN_EXPIRED"


def test_refresh_access_token_user_not_found_after_token_checks(db: Session):
    ghost_user_id = 777777
    refresh_token, jti = create_refresh_token(ghost_user_id)

    token_record = V2UserRefreshToken(
        user_id=ghost_user_id,
        jti=jti,
        expires_at=datetime.now(timezone.utc) + timedelta(days=30),
    )
    db.add(token_record)
    db.commit()

    with pytest.raises(HTTPException) as exc:
        V2AuthService.refresh_access_token(db, refresh_token)
    assert exc.value.status_code == 401
    assert exc.value.detail == "USER_NOT_FOUND"


def test_revoke_refresh_token_revoke_all(db: Session):
    user = V2User(cc_id="rt_all", nickname="rt")
    db.add(user)
    db.commit()
    db.refresh(user)

    # 2개 발급
    _a1, _r1, tr1 = V2AuthService.issue_tokens(db, int(user.id))
    _a2, _r2, tr2 = V2AuthService.issue_tokens(db, int(user.id))
    assert tr1.id != tr2.id

    revoked = V2AuthService.revoke_refresh_token(db, int(user.id), revoke_all=True)
    assert revoked == 2


def test_revoke_refresh_token_specific_invalid_token_ignored(db: Session):
    user = V2User(cc_id="rt_inv", nickname="rt")
    db.add(user)
    db.commit()
    db.refresh(user)

    revoked = V2AuthService.revoke_refresh_token(db, int(user.id), refresh_token="not-a-jwt")
    assert revoked == 0


def test_get_current_user_id_test_mode_creates_demo_user_when_missing(db: Session, monkeypatch):
    from app.core.config import get_settings as _get_settings

    monkeypatch.setenv("TEST_MODE", "1")
    _get_settings.cache_clear()

    try:
        user_id = get_current_user_id(db=db, credentials=None)
        demo = db.get(V2User, user_id)
        assert demo is not None
        assert demo.cc_id == "test_mode_demo"
    finally:
        monkeypatch.delenv("TEST_MODE", raising=False)
        _get_settings.cache_clear()


def test_get_current_user_id_with_token_invalid_sub_raises(db: Session):
    token = _make_jwt(
        {
            "sub": "not-an-int",
            "iat": datetime.now(timezone.utc),
            "exp": datetime.now(timezone.utc) + timedelta(minutes=10),
            "typ": "access",
        }
    )
    creds = HTTPAuthorizationCredentials(scheme="Bearer", credentials=token)

    with pytest.raises(HTTPException) as exc:
        get_current_user_id(db=db, credentials=creds)

    assert exc.value.status_code == 401
    assert exc.value.detail == "TOKEN_INVALID"


def test_get_current_user_id_with_token_user_missing_raises(db: Session):
    token = create_access_token(424242)
    creds = HTTPAuthorizationCredentials(scheme="Bearer", credentials=token)

    with pytest.raises(HTTPException) as exc:
        get_current_user_id(db=db, credentials=creds)

    assert exc.value.status_code == 401
    assert exc.value.detail == "TOKEN_INVALID"
