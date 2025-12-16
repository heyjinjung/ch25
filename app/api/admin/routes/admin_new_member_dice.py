"""Admin endpoints for new-member dice eligibility."""

from typing import List, Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.schemas.admin_new_member_dice import (
    AdminNewMemberDiceEligibilityCreate,
    AdminNewMemberDiceEligibilityResponse,
    AdminNewMemberDiceEligibilityUpdate,
)
from app.services.admin_new_member_dice_service import AdminNewMemberDiceService

router = APIRouter(prefix="/admin/api/new-member-dice/eligibility", tags=["admin-new-member-dice"])


@router.get("", response_model=List[AdminNewMemberDiceEligibilityResponse])
@router.get("/", response_model=List[AdminNewMemberDiceEligibilityResponse])
def list_eligibility(
    user_id: Optional[int] = Query(default=None),
    external_id: Optional[str] = Query(default=None),
    db: Session = Depends(get_db),
) -> List[AdminNewMemberDiceEligibilityResponse]:
    rows = AdminNewMemberDiceService.list_eligibility(db, user_id=user_id, external_id=external_id)
    return [AdminNewMemberDiceEligibilityResponse.model_validate(r) for r in rows]


@router.post("", response_model=AdminNewMemberDiceEligibilityResponse, status_code=201)
@router.post("/", response_model=AdminNewMemberDiceEligibilityResponse, status_code=201)
def upsert_eligibility(payload: AdminNewMemberDiceEligibilityCreate, db: Session = Depends(get_db)) -> AdminNewMemberDiceEligibilityResponse:
    row = AdminNewMemberDiceService.upsert_eligibility(db, payload)
    return AdminNewMemberDiceEligibilityResponse.model_validate(row)


@router.put("/{user_id}", response_model=AdminNewMemberDiceEligibilityResponse)
def update_eligibility(user_id: int, payload: AdminNewMemberDiceEligibilityUpdate, db: Session = Depends(get_db)) -> AdminNewMemberDiceEligibilityResponse:
    row = AdminNewMemberDiceService.update_eligibility(db, user_id, payload)
    return AdminNewMemberDiceEligibilityResponse.model_validate(row)


@router.put("/by-external/{external_id}", response_model=AdminNewMemberDiceEligibilityResponse)
def update_eligibility_by_external_id(
    external_id: str,
    payload: AdminNewMemberDiceEligibilityUpdate,
    db: Session = Depends(get_db),
) -> AdminNewMemberDiceEligibilityResponse:
    user_id = AdminNewMemberDiceService._resolve_user_id(db, None, external_id)
    row = AdminNewMemberDiceService.update_eligibility(db, user_id, payload)
    return AdminNewMemberDiceEligibilityResponse.model_validate(row)


@router.delete("/{user_id}", status_code=204)
def delete_eligibility(user_id: int, db: Session = Depends(get_db)) -> None:
    AdminNewMemberDiceService.delete_eligibility(db, user_id)


@router.delete("/by-external/{external_id}", status_code=204)
def delete_eligibility_by_external_id(external_id: str, db: Session = Depends(get_db)) -> None:
    user_id = AdminNewMemberDiceService._resolve_user_id(db, None, external_id)
    AdminNewMemberDiceService.delete_eligibility(db, user_id)
