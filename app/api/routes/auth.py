"""Simple token issuance endpoint."""
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import AliasChoices, BaseModel, Field
from typing import Annotated
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.core.security import create_access_token, verify_password
from app.v2.models.auth_event import V2UserAuthEvent, AuthEventType
from app.v2.models.user import V2User, V2UserRole
from app.v2.models.v2_user_segment import V2UserSegment

from app.services.mission_service import MissionService

router = APIRouter(prefix="/api/auth", tags=["auth"])


class TokenRequest(BaseModel):
    user_id: int | None = None
    cc_id: Annotated[str | None, Field(validation_alias=AliasChoices("cc_id", "external_id"))] = None
    external_id: str | None = None  # Backward compatibility
    password: str | None = None


class AuthUser(BaseModel):
    id: int
    cc_id: Annotated[str, Field(validation_alias=AliasChoices("cc_id", "external_id"))]
    external_id: str  # Backward compatibility
    nickname: str | None = None
    status: str | None = None
    level: int | None = None
    segment: str | None = None
    telegram_id: int | None = None
    login_streak: int = 0


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: AuthUser


@router.post("/token", response_model=TokenResponse, summary="Issue JWT for user")
def issue_token(payload: TokenRequest, request: Request, db: Session = Depends(get_db)) -> TokenResponse:
    """V2-only: V2User 테이블에서 사용자 조회 및 JWT 발급."""
    # cc_id 우선, 없으면 user_id로 조회. 둘 다 없으면 401.
    cleaned_cc = (payload.cc_id or payload.external_id or "").strip()

    user = None
    if cleaned_cc:
        user = db.query(V2User).filter(V2User.cc_id == cleaned_cc).first()
    if user is None and payload.user_id is not None:
        user = db.get(V2User, payload.user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="USER_NOT_FOUND")
    # Capture client IP best-effort
    client_ip = request.client.host if request.client else None
    if not client_ip:
        client_ip = "unknown"

    # If password is set, require verification unless no password stored.
    password_hash = getattr(user, "password_hash", None)
    if password_hash:
        if not payload.password or not verify_password(payload.password, password_hash):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="INVALID_CREDENTIALS")
    elif payload.password and hasattr(user, "password_hash"):
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
        try:
            MissionService(db).ensure_login_progress(user.id)
        except Exception:
            pass # Do not block login

        # [Grinder Rule] Streak Logic - V2User 필드 사용
        try:
            from app.services.team_battle_service import TeamBattleService
            from app.core.config import get_settings
            
            kst = ZoneInfo(get_settings().timezone)
            now_kst = datetime.now(kst)
            today_kst = now_kst.date()
            
            last_streak_date = user.last_play_date  # V2User는 Date 타입
            
            # Update streak if it's a new day
            if last_streak_date != today_kst:
                if last_streak_date == today_kst - timedelta(days=1):
                    user.play_streak = (user.play_streak or 0) + 1
                else:
                    user.play_streak = 1  # Reset to 1 (Day 1)
                
                user.last_play_date = today_kst
                
                # Check for Streak Bonus (3 days, 7 days)
                settings = get_settings()
                bonus_points = 0
                if user.play_streak == 3:
                     bonus_points = settings.team_battle_streak_3d_bonus
                elif user.play_streak == 7:
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
                             meta={"streak": user.play_streak},
                             enforce_usage=False
                         )
        except Exception as e:
            # Prevent login failure due to streak system errors
            print(f"Streak update failed: {e}")

        user.last_login_at = datetime.utcnow()

        # Insert login event log (V2UserAuthEvent - v2_user FK)
        db.add(
            V2UserAuthEvent(
                user_id=user.id,
                event_type=AuthEventType.LOGIN_SUCCESS,
                ip_address=client_ip,
                telegram_id=user.telegram_id,
                success=True,
            )
        )

        db.commit()
    except Exception:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="LOGIN_FAILED")

    # V2-only: V2User.role 필드에서 직접 권한 확인
    role_str = None
    if user.role and user.role != V2UserRole.USER:
        role_str = user.role.value if hasattr(user.role, 'value') else str(user.role).upper()
        # Backward compatibility: treat SUPER_ADMIN as ADMIN
        if role_str == "SUPER_ADMIN":
            role_str = "ADMIN"

    token = (
        create_access_token(user_id=user.id, role=role_str, roles=[role_str])
        if role_str
        else create_access_token(user_id=user.id)
    )
    
    # V2-only: V2UserSegment에서 segment 조회
    segment = db.query(V2UserSegment.segment).filter(V2UserSegment.user_id == user.id).scalar()
    
    return TokenResponse(
        access_token=token,
        user=AuthUser(
            id=user.id,
            cc_id=user.cc_id,
            external_id=user.cc_id,  # Backward compatibility
            nickname=user.nickname,
            status=user.status.value if hasattr(user.status, 'value') else str(user.status) if user.status else None,
            level=user.level,
            segment=segment,
            telegram_id=user.telegram_id,
            login_streak=user.play_streak or 0,
        ),
    )
