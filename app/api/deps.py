"""Shared API dependencies."""
from collections.abc import Generator

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.security import decode_access_token
from app.db.session import SessionLocal
from app.v2.models.user import V2User, V2UserRole, V2UserStatus

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

    V2-only: JWT의 sub는 V2User.id를 의미함. V1 User 테이블 참조 완전 제거.
    """
    settings = get_settings()

    # In TEST_MODE, allow anonymous access using V2User
    if credentials is None or not credentials.credentials:
        if settings.test_mode:
            demo_user_id = db.execute(select(func.min(V2User.id))).scalar_one_or_none()
            if demo_user_id is not None:
                return int(demo_user_id)

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

    # V2-only: V2User 테이블에서만 유효성 확인
    v2_user = db.execute(select(V2User).where(V2User.id == user_id)).scalar_one_or_none()
    if v2_user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="TOKEN_INVALID")

    return user_id


def get_current_admin_info(
    request: Request,
    db: Session = Depends(get_db),
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
) -> tuple[int, str]:
    """Return (admin_id, role) for admin APIs.

    V2-only: JWT의 role 클레임 또는 V2User.role 필드에서 권한 확인.
    V1 AdminUserProfile 참조 완전 제거.
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

    # V2-only: JWT에 role이 없으면 V2User.role에서 확인
    if not role_str:
        v2_user = db.execute(select(V2User).where(V2User.id == admin_id)).scalar_one_or_none()
        if v2_user and v2_user.role:
            role_str = v2_user.role.value if hasattr(v2_user.role, 'value') else str(v2_user.role).upper()

    if not role_str or role_str == V2UserRole.USER.value:
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
) -> V2User:
    """Fetch the current V2User from the database."""
    user = db.query(V2User).filter(V2User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user



def get_current_admin_id(
    db: Session = Depends(get_db),
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
) -> int:
    """Extract admin user id; reuse user auth for now with test-mode fallback."""

    return get_current_user_id(db=db, credentials=credentials)
