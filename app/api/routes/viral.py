from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.api import deps
from app.models.user import User
from app.services.mission_service import MissionService
from app.services.notification_service import NotificationService
from app.core.config import get_settings

router = APIRouter(prefix="/api/viral", tags=["viral"])

class ChannelVerifyRequest(BaseModel):
    mission_id: int
    channel_username: str | None = None # Optional override, otherwise use env/default

class ActionRequest(BaseModel):
    action_type: str
    mission_id: int | None = None
    metadata: dict | None = None

@router.post("/verify/channel", summary="Verify Telegram Channel Subscription")
def verify_channel(
    payload: ChannelVerifyRequest,
    current_user: User = Depends(deps.get_current_user),
    db: Session = Depends(deps.get_db)
):
    """
    Verifies if the current user is a member of the official channel.
    If yes, updates the mission progress.
    """
    # 1. Determine Channel ID
    settings = get_settings()
    # Use the group or channel configured in env (e.g. "@channel_username" or "-10012345678")
    target_channel = payload.channel_username or getattr(settings, "telegram_channel_username", None)

    if not target_channel:
        raise HTTPException(status_code=500, detail="TELEGRAM_CHANNEL_USERNAME is not configured")
    
    # 2. Check Membership
    if not current_user.telegram_id:
         raise HTTPException(status_code=400, detail="User has no connected Telegram ID")

    service = NotificationService()
    is_member = service.check_chat_member(target_channel, current_user.telegram_id)
    
    if not is_member:
        return {"success": False, "message": "Not a member yet"}

    # 3. Update Mission Logic
    # We can either update by specific mission_id or by generic action "JOIN_CHANNEL"
    ms = MissionService(db)
    
    # If mission_id provided, ensure it matches? 
    # Actually, simpler to just trigger "JOIN_CHANNEL" action
    # But user specifically clicked "Check" on a mission card
    
    # Let's trigger action "JOIN_CHANNEL"
    # And specifically enforce the mission_id passed?
    # MissionService.update_progress updates ALL matching action_type.
    # So we just trigger the action.
    
    updated = ms.update_progress(current_user.id, "JOIN_CHANNEL", 1)
    
    if updated:
        return {"success": True, "message": "Verified and Updated"}
    else:
        # If no mission was updated (maybe already complete), but verification passed
        return {"success": True, "message": "Verified (Already completed or no active mission)"}


@router.post("/action", summary="Record Viral Action (Trust-based)")
def record_action(
    payload: ActionRequest,
    current_user: User = Depends(deps.get_current_user),
    db: Session = Depends(deps.get_db)
):
    """
    Records a viral action (Story Share, Wallet Share, etc.). 
    These actions are recorded based on frontend triggers because server-side verification 
    from Telegram is often complex or unavailable for these specific UI events.
    """
    allowed_actions = ["SHARE", "SHARE_STORY", "SHARE_WALLET"]
    if payload.action_type not in allowed_actions:
        raise HTTPException(status_code=400, detail=f"Action type '{payload.action_type}' is not supported via this endpoint")
        
    ms = MissionService(db)
    updated = ms.update_progress(current_user.id, payload.action_type, 1)
    
    return {
        "success": True, 
        "updated_count": len(updated)
    }


@router.post("/action/story", summary="Record Viral Story Action (Legacy Path)")
def record_story_action(
    payload: ActionRequest,
    current_user: User = Depends(deps.get_current_user),
    db: Session = Depends(deps.get_db),
):
    return record_action(payload=payload, current_user=current_user, db=db)
