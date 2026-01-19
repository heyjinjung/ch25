"""V2 Activity Ingestion Routes."""
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_current_active_user
from app.models.user import User
from app.v2.schemas.v2_activity import ActivityRecordRequest, ActivityRecordResponse

router = APIRouter(prefix="/activity", tags=["v2-activity"])


@router.post("/ingest", response_model=ActivityRecordResponse)
def ingest_activity(
    payload: ActivityRecordRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
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
