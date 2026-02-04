"""V2 ticket zero log model."""
from datetime import datetime

from sqlalchemy import Column, DateTime, Integer, String

from app.db.base_class import Base


class V2TicketZeroLog(Base):
    __tablename__ = "v2_ticket_zero_log"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, nullable=False, index=True)
    ticket_type = Column(String(50), nullable=False)
    ticket_amount = Column(Integer, nullable=False, default=1)
    reason = Column(String(80), nullable=False, default="BAILOUT_GRANT")
    granted_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
