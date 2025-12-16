"""Service for new-member dice judgement (single-use, admin-granted eligibility)."""

from __future__ import annotations

from datetime import datetime
import random

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.new_member_dice import NewMemberDiceEligibility, NewMemberDiceLog
from app.schemas.new_member_dice import NewMemberDicePlayResponse, NewMemberDicePlayResult, NewMemberDiceStatusResponse


class NewMemberDiceService:
    WIN_LINK = "https://ccc-010.com"
    USER_WIN_RATE = 0.05

    @staticmethod
    def _is_eligible_row_active(row: NewMemberDiceEligibility | None, now: datetime) -> bool:
        if row is None:
            return False
        if not row.is_eligible:
            return False
        if row.revoked_at is not None:
            return False
        if row.expires_at is not None and row.expires_at <= now:
            return False
        return True

    def _get_eligibility(self, db: Session, user_id: int) -> NewMemberDiceEligibility | None:
        return db.execute(
            select(NewMemberDiceEligibility).where(NewMemberDiceEligibility.user_id == user_id)
        ).scalar_one_or_none()

    def _get_log(self, db: Session, user_id: int) -> NewMemberDiceLog | None:
        return db.execute(select(NewMemberDiceLog).where(NewMemberDiceLog.user_id == user_id)).scalar_one_or_none()

    def get_status(self, db: Session, user_id: int, now: datetime | None = None) -> NewMemberDiceStatusResponse:
        now_dt = now or datetime.utcnow()
        eligibility = self._get_eligibility(db, user_id)
        eligible = self._is_eligible_row_active(eligibility, now_dt)

        log = self._get_log(db, user_id)
        return NewMemberDiceStatusResponse(
            eligible=eligible,
            already_played=log is not None,
            played_at=log.created_at if log else None,
            last_outcome=log.outcome if log else None,
            last_user_dice=log.user_dice if log else None,
            last_dealer_dice=log.dealer_dice if log else None,
            win_link=self.WIN_LINK,
        )

    def play(self, db: Session, user_id: int, now: datetime | None = None) -> NewMemberDicePlayResponse:
        now_dt = now or datetime.utcnow()
        eligibility = self._get_eligibility(db, user_id)
        if not self._is_eligible_row_active(eligibility, now_dt):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="NEW_MEMBER_DICE_NOT_ELIGIBLE",
            )

        existing = self._get_log(db, user_id)
        if existing is not None:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="NEW_MEMBER_DICE_ALREADY_PLAYED")

        user_wins = random.random() < self.USER_WIN_RATE
        if user_wins:
            outcome = "WIN"
            user_roll = random.randint(2, 6)
            dealer_roll = random.randint(1, user_roll - 1)
            message = "선착순 이벤트 당첨"
        else:
            outcome = "LOSE"
            dealer_roll = random.randint(2, 6)
            user_roll = random.randint(1, dealer_roll - 1)
            message = "다음기회에, 다른 이벤혜택은 지민이 문의"

        log = NewMemberDiceLog(
            user_id=user_id,
            campaign_key=eligibility.campaign_key if eligibility else None,
            outcome=outcome,
            user_dice=user_roll,
            dealer_dice=dealer_roll,
            win_link=self.WIN_LINK,
        )

        db.add(log)
        try:
            db.commit()
        except IntegrityError:
            db.rollback()
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="NEW_MEMBER_DICE_ALREADY_PLAYED")

        db.refresh(log)

        return NewMemberDicePlayResponse(
            result="OK",
            game=NewMemberDicePlayResult(
                user_dice=[log.user_dice],
                dealer_dice=[log.dealer_dice],
                outcome=log.outcome,
            ),
            message=message,
            win_link=self.WIN_LINK,
        )
