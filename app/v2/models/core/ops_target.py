"""Ops target list models for grouping users in operational plans.

Based on spec: docs/06_ops/202601/20260113_ops_crisis_scenarios_spec.md
"""

from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, Integer, JSON, String, Boolean, UniqueConstraint
from sqlalchemy.dialects.mysql import JSON as MySQLJSON
from sqlalchemy.orm import relationship

from app.db.base_class import Base


class OpsTargetList(Base):
    """A specific group of users targeted for an operational plan/task.
    
    Used for:
    - Crisis Scenario targeting (11 scenarios)
    - Segment-based targeting
    - Manual/CSV upload targeting
    """
    
    __tablename__ = "ops_target_list"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    plan_id = Column(Integer, ForeignKey("ops_plan.id", ondelete="CASCADE"), nullable=False, index=True)

    name = Column(String(200), nullable=False)  # e.g. "2026-01-13 Unlucky Newbies"
    
    # Source metadata
    source_type = Column(String(50), nullable=False)  # SCENARIO, SEGMENT, UPLOAD, MANUAL
    source_params = Column(JSON().with_variant(MySQLJSON, "mysql"), nullable=True)  # e.g. {"scenario_id": 1}

    # Cached stats
    count_snapshot = Column(Integer, nullable=False, default=0)

    # Status
    is_processed = Column(Boolean, nullable=False, default=False)

    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    plan = relationship("OpsPlan")
    members = relationship("OpsTargetMember", back_populates="target_list", cascade="all, delete-orphan")


class OpsTargetMember(Base):
    """Individual user member within a target list.
    
    Includes Result Check fields for conversion tracking.
    """
    
    __tablename__ = "ops_target_member"
    __table_args__ = (UniqueConstraint("target_list_id", "user_id", name="uq_target_member_list_user"),)

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    target_list_id = Column(Integer, ForeignKey("ops_target_list.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("user.id", ondelete="CASCADE"), nullable=False, index=True)

    # Execution status for this specific member in this specific list
    status = Column(String(20), nullable=False, default="PENDING")  # PENDING, SENT, FAILED
    
    # Per-user payload/variables (e.g. calculated bonus amount for this user)
    data = Column(JSON().with_variant(MySQLJSON, "mysql"), nullable=True)

    # Result Check fields (Conversion Tracking)
    result_status = Column(String(20), nullable=False, default="NONE")  # NONE, CHECKED
    converted_at = Column(DateTime, nullable=True)  # Timestamp when target action was achieved (NULL = not converted)
    conversion_value = Column(Integer, nullable=True)  # Value of conversion (e.g. deposit amount, play count)

    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    target_list = relationship("OpsTargetList", back_populates="members")
    user = relationship("User")
