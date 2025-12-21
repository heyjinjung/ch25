"""Shared API dependencies."""
from collections.abc import Generator

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.security import decode_access_token
from app.db.session import SessionLocal
from app.models.user import User

bearer_scheme = HTTPBearer(auto_error=False)


def get_db() -> Generator[Session, None, None]:
    """Provide a transactional database session for request handling."""

    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_current_user_id(
    db: Session = Depends(get_db),
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
) -> int:
    """Extract user id from Bearer token; raise 401 if missing or invalid.

    In TEST_MODE, allow anonymous access by selecting an existing user id.
    """
    settings = get_settings()

    # In TEST_MODE, allow anonymous access. Do NOT hardcode a user id because
    # server dumps may not include user 1, which can cause FK failures.
    if credentials is None or not credentials.credentials:
        if settings.test_mode:
            demo_user_id = db.execute(select(func.min(User.id))).scalar_one_or_none()
            if demo_user_id is not None:
                return int(demo_user_id)

            demo_user = User(external_id="test_mode_demo", nickname="Test Mode Demo")
            db.add(demo_user)
            db.commit()
            db.refresh(demo_user)
            return int(demo_user.id)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="AUTH_REQUIRED")

    payload = decode_access_token(credentials.credentials)
    sub = payload.get("sub")
    try:
        user_id = int(sub)
    except (TypeError, ValueError) as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="TOKEN_INVALID") from exc

    user_exists = db.execute(select(User.id).where(User.id == user_id)).scalar_one_or_none()
    if user_exists is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="TOKEN_INVALID")

    return user_id


def get_current_admin_id(
    db: Session = Depends(get_db),
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
) -> int:
    """Extract admin user id; reuse user auth for now with test-mode fallback."""

    return get_current_user_id(db=db, credentials=credentials)
