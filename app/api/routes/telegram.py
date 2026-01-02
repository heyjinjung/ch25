import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api import deps
from app.core import security, telegram
from app.core.config import get_settings
from app.models.user import User
from app.schemas.telegram import TelegramAuthRequest, TelegramAuthResponse, TelegramLinkTokenResponse

import secrets
import string

router = APIRouter(prefix="/api/telegram", tags=["telegram"])


def _generate_short_code(length: int = 12) -> str:
    """Generate a Base62 short code."""
    alphabet = string.ascii_letters + string.digits
    return ''.join(secrets.choice(alphabet) for _ in range(length))


@router.post("/link-token", response_model=TelegramLinkTokenResponse)
def issue_link_token(
    db: Session = Depends(deps.get_db),
    user_id: int = Depends(deps.get_current_user_id),
) -> TelegramLinkTokenResponse:
    """Issue a short-lived one-time code to link existing user -> Telegram.

    Flow:
    1) Existing user logs in via `/api/auth/token` (external_id/password)
    2) Client calls this endpoint to get `start_param`
    3) Client opens Telegram deep-link containing `start_param` (startapp payload)
    4) Telegram Mini App calls `/api/telegram/auth` with the same start_param
    
    Uses short DB-backed codes instead of JWT to avoid Telegram startapp length limits.
    """
    from app.models.telegram_link_code import TelegramLinkCode
    
    settings = get_settings()
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(status_code=404, detail="USER_NOT_FOUND")
    if user.telegram_id is not None:
        raise HTTPException(status_code=409, detail="TELEGRAM_ALREADY_LINKED")

    # Generate short code (retry on collision)
    for _ in range(5):
        code = _generate_short_code(12)
        existing = db.query(TelegramLinkCode).filter(TelegramLinkCode.code == code).first()
        if not existing:
            break
    else:
        raise HTTPException(status_code=500, detail="CODE_GENERATION_FAILED")

    expires_at = datetime.now(timezone.utc) + timedelta(minutes=max(settings.telegram_link_token_expire_minutes, 1))
    
    link_code = TelegramLinkCode(
        code=code,
        user_id=user.id,
        expires_at=expires_at,
    )
    db.add(link_code)
    
    try:
        db.commit()
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail="LINK_TOKEN_ISSUE_FAILED") from exc

    start_param = f"link_{code}"

    open_url: str | None = None
    if settings.telegram_bot_username and settings.telegram_webapp_short_name:
        open_url = f"https://t.me/{settings.telegram_bot_username}/{settings.telegram_webapp_short_name}?startapp={start_param}"
    elif settings.telegram_bot_username:
        open_url = f"https://t.me/{settings.telegram_bot_username}?startapp={start_param}"

    return TelegramLinkTokenResponse(expires_at_utc=expires_at, start_param=start_param, open_url=open_url)


@router.post("/auth", response_model=TelegramAuthResponse)
def telegram_auth(
    payload: TelegramAuthRequest,
    db: Session = Depends(deps.get_db)
):
    """
    Authenticate a user via Telegram Mini App initData.
    If the user does not exist, a new account is created.
    This is the SOLE entry point for the 1/1 Telegram-native system.
    """
    try:
        data = telegram.validate_init_data(payload.init_data)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    
    tg_user_data = data.get('user')
    if not tg_user_data:
        raise HTTPException(status_code=400, detail="User data missing in telegram initData")
    
    tg_id = tg_user_data.get('id')
    tg_username = tg_user_data.get('username')
    start_param = (payload.start_param or data.get("start_param") or "").strip()
    
    # 1. Find user by telegram_id
    user = db.query(User).filter(User.telegram_id == tg_id).first()
    is_new_user = False
    linked_to_existing = False
    
    if not user:
        # Attempt "existing account link" first (prevents duplicate users and preserves external_ranking linkage).
        if start_param.startswith("link_"):
            from app.models.telegram_link_code import TelegramLinkCode
            
            code = start_param[len("link_"):]
            # Lookup with FOR UPDATE to prevent race conditions
            link_record = db.query(TelegramLinkCode).filter(
                TelegramLinkCode.code == code
            ).with_for_update().first()
            
            if not link_record:
                raise HTTPException(status_code=400, detail="INVALID_LINK_CODE")
            
            # Check if already used
            if link_record.used_at is not None:
                raise HTTPException(status_code=410, detail="LINK_CODE_ALREADY_USED")
            
            # Check expiry
            now = datetime.now(timezone.utc)
            expires_at_naive = link_record.expires_at.replace(tzinfo=None) if link_record.expires_at.tzinfo else link_record.expires_at
            if expires_at_naive < datetime.utcnow():
                raise HTTPException(status_code=410, detail="LINK_CODE_EXPIRED")
            
            target = db.query(User).filter(User.id == link_record.user_id).first()
            if not target:
                raise HTTPException(status_code=404, detail="USER_NOT_FOUND")

            if target.telegram_id and int(target.telegram_id) != int(tg_id):
                raise HTTPException(status_code=409, detail="TELEGRAM_ALREADY_LINKED_TO_ANOTHER_ACCOUNT")

            # Mark code as used
            link_record.used_at = now
            
            # Attach Telegram to existing user
            target.telegram_id = tg_id
            target.telegram_username = tg_username
            target.telegram_is_blocked = False
            target.telegram_join_count = int(getattr(target, "telegram_join_count", 0) or 0) + 1
            if not target.first_login_at:
                target.first_login_at = now

            try:
                db.commit()
                db.refresh(target)
            except Exception as exc:
                db.rollback()
                raise HTTPException(status_code=500, detail="LINK_ACCOUNT_FAILED") from exc

            user = target
            linked_to_existing = True
        else:
            # Create or link user for the 1/1 Re-launch
            
            # [Refactor] Attempt to link by telegram_username if pre-created by Admin
            if tg_username:
                existing_by_name = db.query(User).filter(
                    User.telegram_username == tg_username,
                    User.telegram_id == None
                ).first()
                if existing_by_name:
                    user = existing_by_name
                    user.telegram_id = tg_id
                    user.first_login_at = datetime.now(timezone.utc)
                    user.telegram_is_blocked = False
                    user.telegram_join_count = 1
                    db.add(user)
                    db.commit()
                    db.refresh(user)
                    # Proceed as linked
                    linked_to_existing = True
            
            if not linked_to_existing:
                is_new_user = True
                unique_suffix = uuid.uuid4().hex[:8]
                external_id = f"tg_{tg_id}_{unique_suffix}"

                user = User(
                    external_id=external_id,
                nickname=tg_username or f"tg_user_{tg_id}",
                telegram_id=tg_id,
                telegram_username=tg_username,
                first_login_at=datetime.now(timezone.utc),
                telegram_is_blocked=False,
                telegram_join_count=1
            )
            db.add(user)
            try:
                db.commit()
                db.refresh(user)

                # --- NEW USER BONUS LOGIC (Phase 2.0.1) ---
                # Grant 10,000 KRW Locked Balance (No Deposit Required Exception)
                user.vault_locked_balance = 10000
                from app.services.vault_service import VaultService
                user.vault_locked_expires_at = VaultService._compute_locked_expires_at(datetime.now(timezone.utc))
                db.add(user)
                # ------------------------------------------

                # --- REFERRAL LOGIC START ---
                if start_param and start_param.startswith("ref_"):
                    # Format: ref_{referrer_user_id}
                    try:
                        referrer_id_str = start_param.split("_")[1]
                        referrer_id = int(referrer_id_str)
                        referrer = db.get(User, referrer_id)
                        if referrer and referrer.id != user.id:
                            # 1. Log referral (Optional: Create Referral model)
                            # For now, just trigger mission
                            from app.services.mission_service import MissionService
                            ms = MissionService(db)
                            # Trigger "INVITE_FRIEND" action for the REFERRER
                            ms.update_progress(referrer.id, "INVITE_FRIEND", 1)
                            # Optionally give referrer a nudge?
                    except (IndexError, ValueError):
                        pass # Invalid ref code, ignore
                # --- REFERRAL LOGIC END ---

            except Exception as e:
                db.rollback()
                raise HTTPException(status_code=500, detail=f"Failed to create telegram user: {str(e)}")
    else:
        # Update existing user session
        user.telegram_username = tg_username
        user.telegram_is_blocked = False
        user.telegram_join_count += 1
        user.last_login_at = datetime.now(timezone.utc)
        try:
            db.commit()
            db.refresh(user)
        except Exception as e:
            db.rollback()
            raise HTTPException(status_code=500, detail=f"Failed to update telegram user: {str(e)}")

    # 2. Issue JWT
    token = security.create_access_token(user.id)
    
    return TelegramAuthResponse(
        access_token=token,
        is_new_user=is_new_user,
        linked_to_existing=linked_to_existing,
        user={
            "id": user.id,
            "external_id": user.external_id,
            "nickname": user.nickname,
            "status": user.status,
            "level": user.level,
            "telegram_id": user.telegram_id,
        }
    )
