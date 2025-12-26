"""Public endpoint to request a trial ticket grant."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_user_id, get_db
from app.schemas.trial_grant import TrialGrantRequest, TrialGrantResponse
from app.services.trial_grant_service import TrialGrantService

router = APIRouter(prefix="/api", tags=["trial-grant"])
service = TrialGrantService()


@router.post("/trial-grant", response_model=TrialGrantResponse)
def trial_grant(payload: TrialGrantRequest, db: Session = Depends(get_db), user_id: int = Depends(get_current_user_id)) -> TrialGrantResponse:
    granted, balance, label = service.grant_daily_if_empty(db, user_id=user_id, token_type=payload.token_type)
    return TrialGrantResponse(
        result="OK" if granted > 0 else "SKIP",
        token_type=payload.token_type,
        granted=granted,
        balance=balance,
        label=label,
    )
