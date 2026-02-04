"""V2 retention ROI log model for Golden."""
from datetime import datetime

from sqlalchemy import Column, DateTime, Float, ForeignKey, Integer, String, Index

from app.db.base_class import Base


class V2RetentionRoiLog(Base):
    """Persist ROI calculation snapshots for interventions (V2)."""

    __tablename__ = "v2_retention_roi_log"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("v2_user.id", ondelete="SET NULL"), nullable=True, index=True)
    predicted_ltv = Column(Float, nullable=False, default=0)
    marketing_cost = Column(Float, nullable=False, default=0)
    roi_percent = Column(Float, nullable=False, default=0)
    event_type = Column(String(50), nullable=True)
    reward_type = Column(String(50), nullable=True)
    reward_amount = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow, index=True)

    __table_args__ = (
        Index("idx_v2_retention_roi_log_event_created", "event_type", "created_at"),
    )