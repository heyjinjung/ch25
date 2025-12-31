import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api import deps
from app.core import security, telegram
from app.models.user import User
from app.schemas.telegram import TelegramAuthRequest, TelegramAuthResponse

router = APIRouter(prefix="/telegram", tags=["telegram"])


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
    
    # 1. Find user by telegram_id
    user = db.query(User).filter(User.telegram_id == tg_id).first()
    is_new_user = False
    
    if not user:
        # Create new user for the 1/1 Re-launch
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
        user={
            "id": user.id,
            "external_id": user.external_id,
            "nickname": user.nickname,
            "status": user.status,
            "level": user.level,
            "telegram_id": user.telegram_id,
        }
    )
