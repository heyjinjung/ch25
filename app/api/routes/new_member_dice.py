"""New-member dice judgement API routes (single-use, eligibility-gated)."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_current_user_id
from app.schemas.new_member_dice import NewMemberDicePlayResponse, NewMemberDiceStatusResponse
from app.services.new_member_dice_service import NewMemberDiceService

router = APIRouter(prefix="/api/new-member-dice", tags=["new-member-dice"])
service = NewMemberDiceService()


@router.get("/status", response_model=NewMemberDiceStatusResponse)
def status(db: Session = Depends(get_db), user_id: int = Depends(get_current_user_id)) -> NewMemberDiceStatusResponse:
    return service.get_status(db=db, user_id=user_id)


@router.post("/play", response_model=NewMemberDicePlayResponse)
def play(db: Session = Depends(get_db), user_id: int = Depends(get_current_user_id)) -> NewMemberDicePlayResponse:
    return service.play(db=db, user_id=user_id)
