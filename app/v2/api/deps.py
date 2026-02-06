"""V2 API dependencies."""
from __future__ import annotations
from typing import Generator

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select, func
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.security import decode_access_token
from app.db.session import SessionLocal
from app.v2.models.auth_event import AuthEventType
from app.v2.models.user import V2User, V2UserRole, V2UserStatus
from app.v2.services.auth_service import log_auth_event

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


def get_current_admin_info(
    request: Request,
    db: Session = Depends(get_db),
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
) -> tuple[int, str]:
    """Return (admin_id, role) for admin APIs.

    V2-only: JWT의 role 클레임 또는 V2User.role 필드에서 권한 확인.
    """

    if credentials is None or not credentials.credentials:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="AUTH_REQUIRED")

    admin_id = get_current_user_id(db=db, credentials=credentials)

    payload = decode_access_token(credentials.credentials)
    role = payload.get("role")
    roles = payload.get("roles")
    if isinstance(roles, list) and roles:
        role = roles[0]
    if isinstance(role, list) and role:
        role = role[0]

    role_str = str(role).upper() if role else None

    # V2-only: JWT에 role이 없으면 V2User.role에서 확인
    if not role_str:
        v2_user = db.execute(select(V2User).where(V2User.id == admin_id)).scalar_one_or_none()
        if v2_user and v2_user.role:
            role_str = v2_user.role.value if hasattr(v2_user.role, 'value') else str(v2_user.role).upper()

    if not role_str or role_str == V2UserRole.USER.value:
        try:
            log_auth_event(
                db,
                user_id=admin_id,
                event_type=AuthEventType.RBAC_DENIED,
                ip_address=getattr(getattr(request, "client", None), "host", None),
                user_agent=request.headers.get("user-agent"),
                error_message="ADMIN_REQUIRED",
                success=False,
            )
            db.flush()
        except Exception:
            pass
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="ADMIN_REQUIRED")

    # Backward compatibility: treat SUPER_ADMIN as ADMIN.
    if role_str == "SUPER_ADMIN":
        role_str = "ADMIN"

    return admin_id, role_str


def get_current_admin_id(
    db: Session = Depends(get_db),
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
) -> int:
    return get_current_user_id(db=db, credentials=credentials)
