"""JWT helper utilities."""
from datetime import datetime, timedelta, timezone
from typing import Any, Dict

import jwt
import bcrypt
from fastapi import HTTPException, status

from app.core.config import get_settings


def create_access_token(
    user_id: int,
    expires_minutes: int | None = None,
    role: str | None = None,
    roles: list[str] | None = None,
) -> str:
    settings = get_settings()
    now = datetime.now(timezone.utc)
    expire_delta = timedelta(minutes=expires_minutes or settings.jwt_expire_minutes)
    payload: Dict[str, Any] = {"sub": str(user_id), "iat": now, "exp": now + expire_delta, "typ": "access"}

    if role:
        payload["role"] = role
    if roles:
        payload["roles"] = roles
    elif role:
        payload["roles"] = [role]

    token = jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)
    return token


def create_telegram_link_token(user_id: int, nonce: str, expires_minutes: int | None = None) -> str:
    """Create a short-lived single-use token for linking Telegram -> existing user.

    NOTE: This token MUST NOT be accepted by `decode_access_token`.
    """
    settings = get_settings()
    now = datetime.now(timezone.utc)
    expire_delta = timedelta(minutes=expires_minutes or settings.telegram_link_token_expire_minutes)
    payload: Dict[str, Any] = {
        "sub": str(user_id),
        "iat": now,
        "exp": now + expire_delta,
        "typ": "tg_link",
        "nonce": nonce,
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def _decode_token(token: str) -> Dict[str, Any]:
    settings = get_settings()
    try:
        return jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
    except jwt.ExpiredSignatureError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="TOKEN_EXPIRED") from exc
    except jwt.InvalidTokenError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="TOKEN_INVALID") from exc


def decode_access_token(token: str) -> Dict[str, Any]:
    payload = _decode_token(token)
    typ = payload.get("typ")
    # Backward compatible: legacy tokens didn't include `typ`.
    if typ not in (None, "access"):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="TOKEN_INVALID")
    return payload


def decode_telegram_link_token(token: str) -> Dict[str, Any]:
    payload = _decode_token(token)
    if payload.get("typ") != "tg_link":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="TOKEN_INVALID")
    return payload


def hash_password(password: str) -> str:
    """Hash password using bcrypt (new accounts) or SHA256 (legacy)."""
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, password_hash: str | None) -> bool:
    """Verify password against bcrypt or SHA256 hash (legacy compatibility)."""
    if not password_hash:
        return False
    
    # Check if it's a bcrypt hash (starts with $2b$)
    if password_hash.startswith("$2b$") or password_hash.startswith("$2a$"):
        try:
            return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))
        except Exception:
            return False
    
    # Legacy SHA256 fallback
    import hashlib
    return hashlib.sha256(password.encode("utf-8")).hexdigest() == password_hash
