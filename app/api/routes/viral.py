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
    # Default to official channel if not checking specific one
    # If not set in env, use specific one for now
    target_channel = payload.channel_username or getattr(settings, "TELEGRAM_CHANNEL_USERNAME", "@cc_jm_2026_official")
    
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


@router.post("/action/story", summary="Trigger Story Share Action")
def action_story(
    payload: ActionRequest,
    current_user: User = Depends(deps.get_current_user),
    db: Session = Depends(deps.get_db)
):
    """
    Records a 'Story Share' action. 
    Telegram API does not support server-side verification of stories easily.
    We trust the frontend's interaction (User clicked 'Share to Story').
    """
    if payload.action_type != "SHARE_STORY":
        raise HTTPException(status_code=400, detail="Invalid action type")
        
    ms = MissionService(db)
    updated = ms.update_progress(current_user.id, "SHARE_STORY", 1)
    
    return {
        "success": True, 
        "updated_count": len(updated)
    }
