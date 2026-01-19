"""V2 level reward table model."""
from datetime import datetime

from sqlalchemy import Column, DateTime, Integer, JSON, String

from app.db.base_class import Base


class V2LevelRewardTable(Base):
    __tablename__ = "v2_level_reward_table"

    level = Column(Integer, primary_key=True, index=True)
    required_xp = Column(Integer, nullable=False)
    reward_type = Column(String(50), nullable=False)
    reward_amount = Column(Integer, nullable=False)
    reward_payload = Column(JSON, nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
