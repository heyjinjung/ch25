"""Admin service for managing new-member dice eligibility."""

from __future__ import annotations

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.new_member_dice import NewMemberDiceEligibility
from app.schemas.admin_new_member_dice import AdminNewMemberDiceEligibilityCreate, AdminNewMemberDiceEligibilityUpdate


class AdminNewMemberDiceService:
    @staticmethod
    def list_eligibility(db: Session, user_id: int | None = None):
        stmt = select(NewMemberDiceEligibility)
        if user_id is not None:
            stmt = stmt.where(NewMemberDiceEligibility.user_id == user_id)
        return db.execute(stmt).scalars().all()

    @staticmethod
    def get_eligibility(db: Session, user_id: int) -> NewMemberDiceEligibility:
        row = db.execute(select(NewMemberDiceEligibility).where(NewMemberDiceEligibility.user_id == user_id)).scalar_one_or_none()
        if row is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="NEW_MEMBER_DICE_ELIGIBILITY_NOT_FOUND")
        return row

    @staticmethod
    def upsert_eligibility(db: Session, payload: AdminNewMemberDiceEligibilityCreate) -> NewMemberDiceEligibility:
        row = db.execute(select(NewMemberDiceEligibility).where(NewMemberDiceEligibility.user_id == payload.user_id)).scalar_one_or_none()
        if row is None:
            row = NewMemberDiceEligibility(
                user_id=payload.user_id,
                is_eligible=payload.is_eligible,
                campaign_key=payload.campaign_key,
                granted_by=payload.granted_by,
                expires_at=payload.expires_at,
                revoked_at=None,
            )
            db.add(row)
            db.commit()
            db.refresh(row)
            return row

        row.is_eligible = payload.is_eligible
        row.campaign_key = payload.campaign_key
        row.granted_by = payload.granted_by
        row.expires_at = payload.expires_at
        if payload.is_eligible:
            row.revoked_at = None

        db.add(row)
        db.commit()
        db.refresh(row)
        return row

    @staticmethod
    def update_eligibility(db: Session, user_id: int, payload: AdminNewMemberDiceEligibilityUpdate) -> NewMemberDiceEligibility:
        row = AdminNewMemberDiceService.get_eligibility(db, user_id)
        update_data = payload.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(row, field, value)
        db.add(row)
        db.commit()
        db.refresh(row)
        return row

    @staticmethod
    def delete_eligibility(db: Session, user_id: int) -> None:
        row = AdminNewMemberDiceService.get_eligibility(db, user_id)
        db.delete(row)
        db.commit()
