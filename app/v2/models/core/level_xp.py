"""Core level/XP schema for global rewards."""
from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, JSON, String, UniqueConstraint, func
from sqlalchemy.orm import relationship

from app.db.base_class import Base


class UserLevelProgress(Base):
    """Per-user XP/level tracking independent of season pass."""

    __tablename__ = "user_level_progress"

    user_id = Column(Integer, ForeignKey("user.id", ondelete="CASCADE"), primary_key=True)
    level = Column(Integer, nullable=False, default=1)
    xp = Column(Integer, nullable=False, default=0)
    updated_at = Column(DateTime, nullable=False, default=func.now(), onupdate=func.now())

    reward_logs = relationship(
        "UserLevelRewardLog",
        primaryjoin="UserLevelProgress.user_id==UserLevelRewardLog.user_id",
        foreign_keys="UserLevelRewardLog.user_id",
        back_populates="progress",
    )
    xp_events = relationship(
        "UserXpEventLog",
        primaryjoin="UserLevelProgress.user_id==UserXpEventLog.user_id",
        foreign_keys="UserXpEventLog.user_id",
        back_populates="progress",
    )


class UserLevelRewardLog(Base):
    """Level reach logs to enforce idempotent reward payout."""

    __tablename__ = "user_level_reward_log"
    __table_args__ = (
        UniqueConstraint("user_id", "level", name="uq_user_level_reward"),
    )

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("user.id", ondelete="CASCADE"), nullable=False)
    level = Column(Integer, nullable=False)
    reward_type = Column(String(50), nullable=False)
    reward_payload = Column(JSON, nullable=True)
    auto_granted = Column(Boolean, nullable=False, default=False)
    granted_by = Column(Integer, nullable=True)  # admin_id when manual
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    progress = relationship(
        "UserLevelProgress",
        primaryjoin="UserLevelRewardLog.user_id==UserLevelProgress.user_id",
        foreign_keys=[user_id],
        back_populates="reward_logs",
        viewonly=True,
    )


class UserXpEventLog(Base):
    """XP change audit trail for recomputation and debugging."""

    __tablename__ = "user_xp_event_log"
    __table_args__ = (
        UniqueConstraint("id"),
    )

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("user.id", ondelete="CASCADE"), nullable=False)
    source = Column(String(100), nullable=False)
    delta = Column(Integer, nullable=False)
    meta = Column(JSON, nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    progress = relationship(
        "UserLevelProgress",
        primaryjoin="UserXpEventLog.user_id==UserLevelProgress.user_id",
        foreign_keys=[user_id],
        back_populates="xp_events",
        viewonly=True,
    )
