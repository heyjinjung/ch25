"""Admin service for managing new-member dice eligibility."""

from __future__ import annotations

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.new_member_dice import NewMemberDiceEligibility
from app.models.user import User
from app.schemas.admin_new_member_dice import AdminNewMemberDiceEligibilityCreate, AdminNewMemberDiceEligibilityUpdate


class AdminNewMemberDiceService:
    @staticmethod
    def _resolve_user_id(db: Session, user_id: int | None, external_id: str | None) -> int:
        if user_id is not None:
            return user_id
        if external_id is not None:
            user = db.execute(select(User).where(User.external_id == external_id)).scalar_one_or_none()
            if user is None:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="USER_NOT_FOUND")
            return user.id
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="USER_REQUIRED")

    @staticmethod
    def list_eligibility(db: Session, user_id: int | None = None, external_id: str | None = None):
        stmt = (
            select(
                NewMemberDiceEligibility,
                User.external_id.label("external_id"),
                User.nickname.label("nickname"),
            )
            .select_from(NewMemberDiceEligibility)
            .join(User, User.id == NewMemberDiceEligibility.user_id)
        )
        if user_id is not None:
            stmt = stmt.where(NewMemberDiceEligibility.user_id == user_id)
        if external_id is not None:
            stmt = stmt.where(User.external_id == external_id)

        rows = db.execute(stmt).all()
        # Return lightweight objects that Pydantic can read via from_attributes.
        results = []
        for eligibility, ext, nick in rows:
            setattr(eligibility, "external_id", ext)
            setattr(eligibility, "nickname", nick)
            results.append(eligibility)
        return results

    @staticmethod
    def get_eligibility(db: Session, user_id: int) -> NewMemberDiceEligibility:
        row = db.execute(select(NewMemberDiceEligibility).where(NewMemberDiceEligibility.user_id == user_id)).scalar_one_or_none()
        if row is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="NEW_MEMBER_DICE_ELIGIBILITY_NOT_FOUND")
        return row

    @staticmethod
    def upsert_eligibility(db: Session, payload: AdminNewMemberDiceEligibilityCreate) -> NewMemberDiceEligibility:
        resolved_user_id = AdminNewMemberDiceService._resolve_user_id(db, payload.user_id, payload.external_id)
        row = db.execute(select(NewMemberDiceEligibility).where(NewMemberDiceEligibility.user_id == resolved_user_id)).scalar_one_or_none()
        if row is None:
            row = NewMemberDiceEligibility(
                user_id=resolved_user_id,
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
