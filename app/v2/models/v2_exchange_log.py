"""V2 exchange/craft log model."""
from datetime import datetime

from sqlalchemy import Column, DateTime, Integer, String

from app.db.base_class import Base


class V2ExchangeLog(Base):
    __tablename__ = "v2_exchange_log"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, nullable=False, index=True)
    input_type = Column(String(50), nullable=False)
    input_amount = Column(Integer, nullable=False)
    output_type = Column(String(50), nullable=False)
    output_amount = Column(Integer, nullable=False)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
