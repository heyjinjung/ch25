import logging
from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.v2.api import deps
from app.v2.models.user import V2User
from app.services.mission_service import MissionService
from app.services.notification_service import NotificationService
from app.core.config import get_settings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/viral", tags=["viral"])

class ChannelVerifyRequest(BaseModel):
    mission_id: int
    channel_username: str | None = None

class ActionRequest(BaseModel):
    action_type: str
    mission_id: int | None = None
    metadata: dict | None = None

@router.post("/verify/channel", summary="Verify Telegram Channel Subscription")
def verify_channel(
    payload: ChannelVerifyRequest,
    current_user: V2User = Depends(deps.get_current_user),
    db: Session = Depends(deps.get_db)
):
    """
    Verifies if the current V2 user is a member of the official channel.
    """
    settings = get_settings()
    target_channel = payload.channel_username or getattr(settings, "telegram_channel_username", None)

    if not target_channel:
        raise HTTPException(status_code=500, detail="TELEGRAM_CHANNEL_USERNAME is not configured")
    
    if not current_user.telegram_id:
         raise HTTPException(status_code=400, detail="User has no connected Telegram ID")

    # 1. Check membership via Telegram API
    service = NotificationService()
    try:
        is_member = service.check_chat_member(target_channel, current_user.telegram_id)
    except Exception as e:
        logger.error(f"[VIRAL_VERIFY] Telegram API Error for user {current_user.id}: {str(e)}")
        return {"success": False, "message": "텔레그램 인증 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요."}
    
    if not is_member:
        logger.warning(
            f"[VIRAL_VERIFY] User {current_user.id} (TG: {current_user.telegram_id}) "
            f"failed membership check for {target_channel}"
        )
        return {"success": False, "message": "채널 가입이 확인되지 않았습니다. 가입 후 다시 시도해주세요."}

    # 2. Update Mission Progress (Idempotency is handled inside MissionService.update_progress)
    ms = MissionService(db)
    # JOIN_CHANNEL matches aliases in MissionService
    updated = ms.update_progress(current_user.id, "JOIN_CHANNEL", 1)
    
    if updated:
        logger.info(f"[VIRAL_VERIFY] User {current_user.id} verified for channel {target_channel}")
        return {"success": True, "message": "인증 성공! 보상이 지급되었습니다."}
    else:
        # If updated list is empty, it means no active mission was found OR it's already completed
        return {"success": True, "message": "이미 인증되었거나 진행 중인 미션이 없습니다."}

@router.post("/action", summary="Record Viral Action (Trust-based)")
def record_action(
    payload: ActionRequest,
    current_user: V2User = Depends(deps.get_current_user),
    db: Session = Depends(deps.get_db)
):
    """
    Records a viral action (Story Share, Link Share, etc.) based on frontend trigger.
    """
    allowed_actions = ["SHARE", "SHARE_STORY", "SHARE_LINK", "SHARE_WALLET"]
    if payload.action_type not in allowed_actions:
        raise HTTPException(status_code=400, detail=f"Action type '{payload.action_type}' is not supported")
        
    ms = MissionService(db)
    updated = ms.update_progress(current_user.id, payload.action_type, 1)
    
    return {
        "success": True, 
        "updated_count": len(updated)
    }

@router.post("/action/story", summary="Record Viral Story Action (Legacy Path)")
def record_story_action(
    payload: ActionRequest,
    current_user: V2User = Depends(deps.get_current_user),
    db: Session = Depends(deps.get_db),
):
    return record_action(payload=payload, current_user=current_user, db=db)
