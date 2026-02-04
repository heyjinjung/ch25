"""Segmentation rules stored in DB for dynamic operations."""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import JSON, Boolean, Column, DateTime, Integer, String, UniqueConstraint

from app.db.base_class import Base


class SegmentRule(Base):
    __tablename__ = "segment_rule"
    __table_args__ = (UniqueConstraint("name", name="uq_segment_rule_name"),)

    id = Column(Integer, primary_key=True, autoincrement=True)

    # Human-friendly rule identifier (e.g., VIP_RULE_1)
    name = Column(String(80), nullable=False)

    # Output segment code (e.g., VIP, DORMANT_LONG)
    segment = Column(String(50), nullable=False)

    # Smaller = higher priority (first match wins)
    priority = Column(Integer, nullable=False, default=100)

    enabled = Column(Boolean, nullable=False, default=True)

    # JSON condition tree evaluated by segmentation job
    condition_json = Column(JSON, nullable=False)

    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
