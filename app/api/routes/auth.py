"""Simple token issuance endpoint."""
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.core.security import create_access_token, verify_password
from app.models.feature import UserEventLog
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
    login_streak: int = 0


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
        try:
            MissionService(db).ensure_login_progress(user.id)
        except Exception:
            pass # Do not block login

        # [Grinder Rule] Streak Logic
        try:
            from app.services.team_battle_service import TeamBattleService
            from app.core.config import get_settings
            
            kst = ZoneInfo(get_settings().timezone)
            now_kst = datetime.now(kst)
            today_kst = now_kst.date()
            
            last_streak_date = None
            if user.last_streak_updated_at:
                # Ensure UTC awareness for correct conversion
                base_time = user.last_streak_updated_at
                if base_time.tzinfo is None:
                    base_time = base_time.replace(tzinfo=timezone.utc)
                last_streak_date = base_time.astimezone(kst).date()
            
            # Update streak if it's a new day
            if last_streak_date != today_kst:
                if last_streak_date == today_kst - timedelta(days=1):
                    user.login_streak += 1
                else:
                    user.login_streak = 1  # Reset to 1 (Day 1)
                
                user.last_streak_updated_at = datetime.utcnow()
                
                # Check for Streak Bonus (3 days, 7 days)
                settings = get_settings()
                bonus_points = 0
                if user.login_streak == 3:
                     bonus_points = settings.team_battle_streak_3d_bonus
                elif user.login_streak == 7:
                     bonus_points = settings.team_battle_streak_7d_bonus
                
                if bonus_points > 0:
                     svc = TeamBattleService()
                     member = svc.get_membership(db, user.id)
                     if member:
                         svc.add_points(
                             db, 
                             team_id=member.team_id, 
                             delta=bonus_points, 
                             action="STREAK_BONUS", 
                             user_id=user.id, 
                             season_id=None, 
                             meta={"streak": user.login_streak},
                             enforce_usage=False
                         )
        except Exception as e:
            # Prevent login failure due to streak system errors
            print(f"Streak update failed: {e}")

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
            login_streak=user.login_streak,
        ),
    )
