"""Simple token issuance endpoint."""
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.core.security import create_access_token, verify_password
from app.models.user import User
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo

from app.services.mission_service import MissionService
from app.models.mission import MissionCategory

router = APIRouter(prefix="/api/auth", tags=["auth"])


class TokenRequest(BaseModel):
    user_id: int | None = None
    external_id: str | None = None
    password: str | None = None


class AuthUser(BaseModel):
    id: int
    external_id: str
    nickname: str | None = None
    status: str | None = None
    level: int | None = None
    telegram_id: int | None = None


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: AuthUser


@router.post("/token", response_model=TokenResponse, summary="Issue JWT for user")
def issue_token(payload: TokenRequest, request: Request, db: Session = Depends(get_db)) -> TokenResponse:
    # external_id 우선, 없으면 user_id로 조회. 둘 다 없으면 401.
    cleaned_external = payload.external_id.strip() if payload.external_id else None

    user = None
    if cleaned_external:
        user = db.query(User).filter(User.external_id == cleaned_external).first()
    if user is None and payload.user_id is not None:
        user = db.get(User, payload.user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="USER_NOT_FOUND")
    # Capture client IP best-effort
    client_ip = request.client.host if request.client else None
    if not client_ip:
        client_ip = "unknown"

    # If password is set, require verification unless no password stored.
    if user.password_hash:
        if not payload.password or not verify_password(payload.password, user.password_hash):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="INVALID_CREDENTIALS")
    elif payload.password:
        # If no password stored yet and client provided one, set it as initial secret.
        from app.core.security import hash_password  # local import to avoid cycle

        user.password_hash = hash_password(payload.password)

    try:
        # Ensure FK values are available for audit log writes
        if user.id is None:
            db.flush()

        # Update login audit fields
        # first_login_at is the source of truth for "new user" onboarding window.
        # Only set it when this is the user's first recorded login (avoid reclassifying existing users).
        if user.first_login_at is None and user.last_login_at is None:
            user.first_login_at = datetime.utcnow()
        # [Mission] Check Day 2+ Login
        # Logic: If last_login_at was on a Previous Day (KST), increment 'LOGIN' mission.
        kst = ZoneInfo("Asia/Seoul")
        now_kst = datetime.now(kst)
        today_kst_date = now_kst.date()
        
        should_increment_login = False
        
        if user.last_login_at:
            # Convert last_login_at (UTC) to KST
            last_login_utc = user.last_login_at.replace(tzinfo=timezone.utc)
            last_login_kst = last_login_utc.astimezone(kst)
            if last_login_kst.date() < today_kst_date:
                should_increment_login = True
        else:
            # First login ever? usually first_login_at handles this, but for mission logic,
            # if they never logged in, this is the first one.
            # But usually Day 1 is 1/2.
            # If we want to capture Day 1, we should also increment.
            # Let's assume ANY login on a new day counts.
            should_increment_login = True

        if should_increment_login:
            try:
                MissionService(db).update_progress(user.id, "LOGIN", delta=1)
            except Exception:
                pass # Do not block login
        
        user.last_login_at = datetime.utcnow()
        user.last_login_ip = client_ip

        # Insert login event log
        db.add(
            UserEventLog(
                user_id=user.id,
                feature_type="AUTH",
                event_name="AUTH_LOGIN",
                meta_json={"external_id": user.external_id, "ip": client_ip},
            )
        )

        db.commit()
    except Exception:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="LOGIN_FAILED")

    token = create_access_token(user_id=user.id)
    return TokenResponse(
        access_token=token,
        user=AuthUser(
            id=user.id,
            external_id=user.external_id,
            nickname=user.nickname,
            status=user.status,
            level=user.level,
            telegram_id=user.telegram_id,
        ),
    )
