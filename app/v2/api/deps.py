"""V2 API dependencies."""
from __future__ import annotations

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.core.config import get_settings
from app.core.security import decode_access_token
from app.v2.models.user import V2User

bearer_scheme = HTTPBearer(auto_error=False)


def get_current_user_id(
    db: Session = Depends(get_db),
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
) -> int:
    settings = get_settings()

    if credentials is None or not credentials.credentials:
        if settings.test_mode:
            demo_user = db.query(V2User).order_by(V2User.id.asc()).first()
            if demo_user is not None:
                return int(demo_user.id)
            demo_user = V2User(cc_id="test_mode_demo", nickname="Test Mode Demo")
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

    user_exists = db.query(V2User.id).filter(V2User.id == user_id).first()
    if user_exists is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="TOKEN_INVALID")

    return user_id


def get_current_user(
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
) -> V2User:
    user = db.get(V2User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user
