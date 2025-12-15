"""Survey reward orchestration built on top of RewardService."""
from __future__ import annotations

from typing import Any

from sqlalchemy.orm import Session

from app.models.survey import Survey, SurveyResponse, SurveyRewardStatus
from app.services.reward_service import RewardService


class SurveyRewardService:
    """Parse reward_json and delegate delivery to RewardService."""

    def __init__(self) -> None:
        self.reward_service = RewardService()

    def apply_reward(self, db: Session, survey: Survey, response: SurveyResponse) -> tuple[bool, str | None]:
        reward_cfg = survey.reward_json or {}
        reward_type = (
            reward_cfg.get("reward_type")
            or reward_cfg.get("token_type")
            or reward_cfg.get("type")
            or ""
        )
        amount = reward_cfg.get("amount") or reward_cfg.get("token_amount") or 0

        # Short-circuit to keep reward idempotent when complete_with_reward is called multiple times
        # (e.g., concurrent submissions or retrying a finished response).
        if response.reward_status == SurveyRewardStatus.GRANTED:
            toast_message = reward_cfg.get("toast_message")
            return True, toast_message or "설문 보상이 지급되었습니다."
        if response.reward_status == SurveyRewardStatus.SCHEDULED:
            return False, None

        if not reward_type or amount == 0:
            response.reward_status = SurveyRewardStatus.NONE
            response.reward_payload = reward_cfg
            return False, None

        toast_message = reward_cfg.get("toast_message")
        response.reward_status = SurveyRewardStatus.SCHEDULED
        response.reward_payload = reward_cfg
        db.add(response)
        db.commit()
        db.refresh(response)

        try:
            self.reward_service.deliver(db, user_id=response.user_id, reward_type=reward_type, reward_amount=amount, meta=reward_cfg)
            response.reward_status = SurveyRewardStatus.GRANTED
            db.add(response)
            db.commit()
            db.refresh(response)
            return True, toast_message or "설문 보상이 지급되었습니다."
        except Exception:
            response.reward_status = SurveyRewardStatus.FAILED
            db.add(response)
            db.commit()
            db.refresh(response)
            return False, None
