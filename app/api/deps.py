"""Shared API dependencies."""
from collections.abc import Generator

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.security import decode_access_token
from app.db.session import SessionLocal
from app.models.user import User
from app.v2.models.user import V2User

bearer_scheme = HTTPBearer(auto_error=False)


def _log_rbac_denied(db: Session, user_id: int, ip_address: str | None = None, user_agent: str | None = None) -> None:
    """RBAC 거부 이벤트 기록 (best-effort)"""
    try:
        from app.v2.models.auth_event import V2UserAuthEvent, AuthEventType
        event = V2UserAuthEvent(
            user_id=user_id,
            event_type=AuthEventType.RBAC_DENIED,
            ip_address=ip_address,
            user_agent=user_agent[:500] if user_agent else None,
            success=False,
            error_message="ADMIN_REQUIRED",
        )
        db.add(event)
        db.commit()
    except Exception:
        db.rollback()  # 로깅 실패해도 원래 요청에는 영향 없음


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
        v2_exists = db.execute(select(V2User.id).where(V2User.id == user_id)).scalar_one_or_none()
        if v2_exists is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="TOKEN_INVALID")

    return user_id


def get_current_admin_info(
    request: Request,
    db: Session = Depends(get_db),
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
) -> tuple[int, str]:
    """Return (admin_id, role) for admin APIs.

    Admin 인증은 Bearer 토큰 + role(클레임 또는 AdminUserProfile.tags의 ROLE_*)가 모두 필요하다.
    role이 없는 일반 유저 토큰에 ADMIN을 기본 부여하면 보안상 위험하므로 금지한다.
    """

    if credentials is None or not credentials.credentials:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="AUTH_REQUIRED")

    _settings = get_settings()
    admin_id = get_current_user_id(db=db, credentials=credentials)

    payload = decode_access_token(credentials.credentials)
    role = payload.get("role")
    roles = payload.get("roles")
    if isinstance(roles, list) and roles:
        role = roles[0]
    if isinstance(role, list) and role:
        role = role[0]

    role_str = str(role).upper() if role else None

    if not role_str:
        from app.models.admin_user_profile import AdminUserProfile

        profile = db.query(AdminUserProfile).filter(AdminUserProfile.user_id == admin_id).first()
        if profile and isinstance(profile.tags, list):
            tag_role = next((t for t in profile.tags if isinstance(t, str) and t.upper().startswith("ROLE_")), None)
            if tag_role:
                role_str = tag_role.replace("ROLE_", "", 1).upper()

    if not role_str:
        # RBAC_DENIED 이벤트 기록
        client_ip = request.client.host if request.client else None
        user_agent = request.headers.get("user-agent")
        _log_rbac_denied(db, admin_id, client_ip, user_agent)
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="ADMIN_REQUIRED")

    # Backward compatibility: treat SUPER_ADMIN as ADMIN.
    if role_str == "SUPER_ADMIN":
        role_str = "ADMIN"

    return admin_id, role_str


def get_current_user(
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
) -> User:
    """Fetch the current user from the database."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user



def get_current_admin_id(
    db: Session = Depends(get_db),
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
) -> int:
    """Extract admin user id; reuse user auth for now with test-mode fallback."""

    return get_current_user_id(db=db, credentials=credentials)
