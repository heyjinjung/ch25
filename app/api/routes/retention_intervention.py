"""Retention intervention API endpoints."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_current_user_id, get_db
from app.schemas.retention_intervention import (
    RetentionInterventionRequest,
    RetentionInterventionResponse,
    ReengagementQueueRequest,
    ReengagementQueueResponse,
)
from app.services.retention_intervention_service import RetentionInterventionService

router = APIRouter(prefix="/api/retention", tags=["retention"])


def _get_service() -> RetentionInterventionService:
    return RetentionInterventionService()


@router.post("/intervention/resolve", response_model=RetentionInterventionResponse)
def resolve_intervention(
    payload: RetentionInterventionRequest,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
    service: RetentionInterventionService = Depends(_get_service),
) -> RetentionInterventionResponse:
    event_type = payload.event_type.strip().upper()
    if not event_type:
        raise HTTPException(status_code=400, detail="INVALID_EVENT_TYPE")

    result = service.resolve_intervention(db, user_id=user_id, event_type=event_type, data=payload.data or {})
    return RetentionInterventionResponse(**result)


@router.post("/reengagement/queue", response_model=ReengagementQueueResponse)
def queue_reengagement(
    payload: ReengagementQueueRequest,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
    service: RetentionInterventionService = Depends(_get_service),
) -> ReengagementQueueResponse:
    result = service.enqueue_reengagement(
        db,
        user_id=user_id,
        reason=payload.reason,
        channel=payload.channel,
    )
    return ReengagementQueueResponse(**result)
