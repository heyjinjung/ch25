"""Web-first dev login endpoint (no Telegram initData required)."""
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import AliasChoices, BaseModel, Field
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.core.config import get_settings
from app.core.security import create_access_token
from app.v2.models.user import V2User
from app.v2.services.user_service import V2UserService

router = APIRouter(prefix="/api/v2/dev", tags=["dev"])


class DevLoginRequest(BaseModel):
    cc_id: str | None = Field(None, validation_alias=AliasChoices("cc_id", "external_id"))
    nickname: str | None = None
    create_if_missing: bool = False


class DevLoginUser(BaseModel):
    id: int
    cc_id: str
    nickname: str | None = None
    telegram_id: int | None = None
    telegram_username: str | None = None


class DevLoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: DevLoginUser


@router.post("/login", response_model=DevLoginResponse, summary="Dev login for web-first debugging")
def dev_login(payload: DevLoginRequest, request: Request, db: Session = Depends(get_db)) -> DevLoginResponse:
    settings = get_settings()
    # Use explicit flag (priority) or fallback to env check for backward compatibility
    is_dev_env = settings.env in ["local", "development", "dev"]
    if not settings.dev_login_enabled and not is_dev_env:
        raise HTTPException(status_code=403, detail="DEV_LOGIN_DISABLED")

    cc_id = (payload.cc_id or "dev_web_user").strip()
    if not cc_id:
        raise HTTPException(status_code=400, detail="MISSING_CC_ID")

    user = V2UserService.get_or_create_v2_user_from_legacy(db, cc_id)
    if user is None:
        if not payload.create_if_missing:
            raise HTTPException(status_code=404, detail="USER_NOT_FOUND")
        user = V2UserService.create_user(
            db,
            cc_id=cc_id,
            nickname=payload.nickname or "Web Dev User",
        )
    elif payload.nickname:
        user.nickname = payload.nickname

    client_ip = request.client.host if request.client else None
    _ = client_ip

    # Best-effort: login(출석) 미션 진행 반영 (V2 SoT 기준)
    try:
        from app.v2.services.mission_service import V2MissionService

        V2MissionService(db).update_progress(int(user.id), "LOGIN", delta=1)
    except Exception:
        pass

    try:
        db.commit()
    except Exception:
        db.rollback()
        raise HTTPException(status_code=400, detail="DEV_LOGIN_FAILED")

    token = create_access_token(user_id=int(user.id))
    return DevLoginResponse(
        access_token=token,
        user=DevLoginUser(
            id=int(user.id),
            cc_id=user.cc_id,
            nickname=user.nickname,
            telegram_id=user.telegram_id,
            telegram_username=user.telegram_username,
        ),
    )
