"""Idempotency key model for preventing duplicate side-effects."""

from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint

from app.db.base_class import Base


class UserIdempotencyKey(Base):
    """Stores responses for idempotent user actions."""

    __tablename__ = "user_idempotency_key"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("user.id", ondelete="CASCADE"), nullable=False, index=True)

    scope = Column(String(50), nullable=False, index=True)
    idempotency_key = Column(String(128), nullable=False)

    request_hash = Column(String(64), nullable=False)
    request_json = Column(Text, nullable=False)

    status = Column(String(20), nullable=False, default="IN_PROGRESS", index=True)
    response_json = Column(Text, nullable=True)

    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint("user_id", "scope", "idempotency_key", name="uq_user_idempotency_key_user_scope_key"),
    )
