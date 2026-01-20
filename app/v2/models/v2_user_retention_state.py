"""V2 user retention state model for Golden."""
from datetime import datetime

from sqlalchemy import Column, DateTime, Enum, Float, ForeignKey, Integer

from app.db.base_class import Base


class V2UserRetentionState(Base):
    """Stores predictive retention signals per user (V2)."""

    __tablename__ = "v2_user_retention_state"

    user_id = Column(Integer, ForeignKey("v2_user.id", ondelete="CASCADE"), primary_key=True)
    churn_probability_score = Column(Float, nullable=False, default=0)
    predicted_ltv = Column(Float, nullable=False, default=0)
    current_win_loss_streak = Column(Integer, nullable=False, default=0)
    session_balance_delta = Column(Float, nullable=False, default=0)
    bet_size_variation_score = Column(Float, nullable=False, default=0)
    loyalty_frequency_score = Column(Integer, nullable=False, default=0)
    psychological_state = Column(
        Enum("IN_FLOW", "BORED", "FRUSTRATED", "TILTED", name="v2_retention_psych_state"),
        nullable=False,
        default="IN_FLOW",
    )
    user_segment_tag = Column(
        Enum("HIGH_ROLLER", "CASUAL_LOYAL", "NEW_USER", "CHURN_RISK", name="v2_retention_segment_tag"),
        nullable=False,
        default="NEW_USER",
    )
    last_intervention_at = Column(DateTime, nullable=True)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)