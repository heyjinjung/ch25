"""V2 Viral Action API - 텔레그램 채널 가입 확인 및 바이럴 액션 기록.

프론트엔드가 호출하는 /api/viral/* 엔드포인트 제공.
- /api/viral/verify/channel - 텔레그램 채널 구독 확인 및 미션 진행
- /api/viral/action - 바이럴 액션 기록
"""
from datetime import datetime
from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.v2.api.deps import get_current_user_id, get_db
from app.v2.services.mission_service import V2MissionService

router = APIRouter(prefix="/api/viral", tags=["v2-viral"])


class VerifyChannelRequest(BaseModel):
    mission_id: int
    channel_username: Optional[str] = None


class VerifyChannelResponse(BaseModel):
    success: bool
    message: str
    mission_completed: bool = False


class ViralActionRequest(BaseModel):
    action_type: str
    mission_id: Optional[int] = None
    metadata: Optional[Dict[str, Any]] = None


class ViralActionResponse(BaseModel):
    success: bool
    message: str


@router.post("/verify/channel", response_model=VerifyChannelResponse)
def verify_channel_subscription(
    payload: VerifyChannelRequest,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
) -> VerifyChannelResponse:
    """
    텔레그램 채널 구독 확인 후 미션 진행.

    프론트엔드에서 사용자가 텔레그램 채널에 가입했다고 확인되면 호출됨.
    실제 구독 확인은 Telegram Bot API를 통해 해야 하지만,
    현재는 프론트엔드 신뢰 기반으로 미션 진행 처리.

    TODO: Telegram Bot API를 사용한 실제 구독 확인 로직 추가
    """
    try:
        service = V2MissionService(db)

        # JOIN_TELEGRAM_CHANNEL 액션으로 미션 진행
        # action_type aliases: JOIN_CHANNEL, JOIN_TELEGRAM_CHANNEL, TELEGRAM_JOIN, TG_CHANNEL_JOIN
        updated = service.update_progress(user_id, "JOIN_TELEGRAM_CHANNEL", delta=1)

        mission_completed = any(p.is_completed for p in updated)

        return VerifyChannelResponse(
            success=True,
            message="CHANNEL_VERIFIED",
            mission_completed=mission_completed,
        )
    except Exception as e:
        # 미션 업데이트 실패해도 에러 반환하지 않음 (UX 고려)
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"[VIRAL] Channel verification failed: user_id={user_id}, error={e}")

        return VerifyChannelResponse(
            success=False,
            message="VERIFICATION_FAILED",
            mission_completed=False,
        )


@router.post("/action", response_model=ViralActionResponse)
def record_viral_action(
    payload: ViralActionRequest,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
) -> ViralActionResponse:
    """
    바이럴 액션 기록 (스토리 공유, 초대 등).

    프론트엔드에서 사용자가 바이럴 액션을 수행했을 때 호출됨.
    action_type에 따라 해당 미션 진행 처리.
    """
    action_type = (payload.action_type or "").strip().upper()
    if not action_type:
        raise HTTPException(status_code=400, detail="INVALID_ACTION_TYPE")

    try:
        service = V2MissionService(db)

        # 액션 타입에 따라 미션 진행
        service.update_progress(user_id, action_type, delta=1)

        return ViralActionResponse(
            success=True,
            message="ACTION_RECORDED",
        )
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"[VIRAL] Action recording failed: user_id={user_id}, action={action_type}, error={e}")

        return ViralActionResponse(
            success=False,
            message="ACTION_FAILED",
        )
