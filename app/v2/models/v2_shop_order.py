"""V2 shop order log model."""
from datetime import datetime

from sqlalchemy import Column, DateTime, Integer, String

from app.db.base_class import Base


class V2ShopOrder(Base):
    __tablename__ = "v2_shop_order"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, nullable=False, index=True)
    sku = Column(String(64), nullable=False, index=True)
    name = Column(String(120), nullable=False)
    cost_type = Column(String(50), nullable=False)
    cost_amount = Column(Integer, nullable=False)
    reward_type = Column(String(50), nullable=False)
    reward_amount = Column(Integer, nullable=False)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
