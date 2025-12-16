"""New-member dice eligibility and play logs."""

from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Index, Integer, String, UniqueConstraint

from app.db.base_class import Base


class NewMemberDiceEligibility(Base):
    """Admin-granted eligibility for the new-member dice judgement."""

    __tablename__ = "new_member_dice_eligibility"
    __table_args__ = (
        UniqueConstraint("user_id", name="uq_new_member_dice_eligibility_user_id"),
        Index("ix_new_member_dice_eligibility_user_id", "user_id"),
    )

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("user.id", ondelete="CASCADE"), nullable=False)

    is_eligible = Column(Boolean, nullable=False, default=True)
    campaign_key = Column(String(50), nullable=True)
    granted_by = Column(String(100), nullable=True)

    expires_at = Column(DateTime, nullable=True)
    revoked_at = Column(DateTime, nullable=True)

    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)


class NewMemberDiceLog(Base):
    """Single-use play log for the new-member dice judgement."""

    __tablename__ = "new_member_dice_log"
    __table_args__ = (
        UniqueConstraint("user_id", name="uq_new_member_dice_log_user_id"),
        Index("ix_new_member_dice_log_user_created_at", "user_id", "created_at"),
    )

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("user.id", ondelete="CASCADE"), nullable=False)

    campaign_key = Column(String(50), nullable=True)

    outcome = Column(String(10), nullable=False)
    user_dice = Column(Integer, nullable=False)
    dealer_dice = Column(Integer, nullable=False)
    win_link = Column(String(200), nullable=True)

    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
