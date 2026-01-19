"""V2 Golden intervention log model for ops tracking."""
from datetime import datetime

from sqlalchemy import Column, DateTime, Float, ForeignKey, Integer, String, Text

from app.db.base_class import Base


class V2GoldenInterventionLog(Base):
    """Logs all Golden System interventions for audit and analysis."""

    __tablename__ = "v2_golden_intervention_log"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("user.id", ondelete="CASCADE"), nullable=False, index=True)
    trigger_id = Column(String(50), nullable=False, index=True)  # e.g. TRG_LOSE_5, TRG_ZERO_BAL
    trigger_condition = Column(Text, nullable=True)  # Human-readable condition description
    action_taken = Column(String(100), nullable=False)  # e.g. Trigger_Pity_Win, Offer_Zero_Ticket

    # Context data
    user_balance_before = Column(Float, nullable=True)
    session_balance_delta = Column(Float, nullable=True)
    recent_results = Column(String(50), nullable=True)  # e.g. "LOSE,LOSE,LOSE,LOSE,LOSE"

    # Metadata
    cooldown_expires_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow, index=True)
