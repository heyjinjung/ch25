"""Inventory models for Item and Ledger."""
from datetime import datetime

from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship

from app.db.base_class import Base


class UserInventoryItem(Base):
    """User item inventory."""

    __tablename__ = "user_inventory_item"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("user.id", ondelete="CASCADE"), nullable=False, index=True)
    item_type = Column(String(50), nullable=False, index=True)
    quantity = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint("user_id", "item_type", name="uq_user_inventory_item_user_item"),
    )


class UserInventoryLedger(Base):
    """Ledger for inventory changes."""

    __tablename__ = "user_inventory_ledger"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("user.id", ondelete="CASCADE"), nullable=False, index=True)
    item_type = Column(String(50), nullable=False, index=True)
    change_amount = Column(Integer, nullable=False)  # +/-
    balance_after = Column(Integer, nullable=False)
    reason = Column(String(100), nullable=False)
    related_id = Column(String(100), nullable=True) # e.g. order_id, admin_id
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
