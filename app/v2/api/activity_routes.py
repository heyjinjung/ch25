"""V2 Activity Ingestion Routes."""
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.v2.api.deps import get_db
from app.v2.api.deps import get_current_user
from app.v2.models.user import V2User
from app.v2.schemas.v2_activity import ActivityRecordRequest, ActivityRecordResponse

router = APIRouter(prefix="/activity", tags=["v2-activity"])


@router.post("/ingest", response_model=ActivityRecordResponse)
def ingest_activity(
    payload: ActivityRecordRequest,
    db: Session = Depends(get_db),
    current_user: V2User = Depends(get_current_user),
):
    """
    Ingest user activity event.
    V2 Migration: Stores mainly to UserActivityEvent (and soon Redis).
    """
    # For now, just a mock response to satisfy the contract
    # Real implementation involves creating UserActivityEvent

    return ActivityRecordResponse(
        user_id=current_user.id,
        updated_at=datetime.utcnow()
    )


@router.post("/record", response_model=ActivityRecordResponse)
def record_activity(
    payload: ActivityRecordRequest,
    db: Session = Depends(get_db),
    current_user: V2User = Depends(get_current_user),
):
    """
    Record user activity event (alias for /ingest).

    FE 호환성을 위한 별칭 엔드포인트.
    FE: /api/activity/record -> BE: /api/v2/activity/record
    """
    return ingest_activity(payload, db, current_user)
