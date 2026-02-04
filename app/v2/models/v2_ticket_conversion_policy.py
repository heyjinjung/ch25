"""V2 ticket conversion policy model."""
from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, Integer, String

from app.db.base_class import Base


class V2TicketConversionPolicy(Base):
    __tablename__ = "v2_ticket_conversion_policy"

    id = Column(Integer, primary_key=True, autoincrement=True)
    target_ticket_type = Column(String(50), nullable=False)
    ratio_numerator = Column(Integer, nullable=False, default=1)
    ratio_denominator = Column(Integer, nullable=False, default=1)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
