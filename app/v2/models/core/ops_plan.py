"""Ops plan (playbook) models for admin operations.

This module is intentionally separate from ops_log models:
- ops_plan/* are mutable planning entities (campaign/plan/tasks)
- ops_log/* are immutable execution/audit-like records
"""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import Column, Date, DateTime, ForeignKey, Integer, JSON, String, Text, Index, UniqueConstraint
from sqlalchemy.dialects.mysql import JSON as MySQLJSON

from app.db.base_class import Base


class OpsCampaign(Base):
    __tablename__ = "ops_campaign"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(200), nullable=False)
    status = Column(String(20), nullable=False, default="DRAFT")

    start_date = Column(Date, nullable=True)
    end_date = Column(Date, nullable=True)

    owner_admin_id = Column(Integer, nullable=True)
    goal_json = Column(JSON().with_variant(MySQLJSON, "mysql"), nullable=True)
    notes_md = Column(Text, nullable=True)

    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)


class OpsPlan(Base):
    __tablename__ = "ops_plan"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    campaign_id = Column(Integer, ForeignKey("ops_campaign.id", ondelete="CASCADE"), nullable=False, index=True)

    plan_date = Column(Date, nullable=False, index=True)
    theme_title = Column(String(200), nullable=True)
    key_message = Column(String(500), nullable=True)

    status = Column(String(20), nullable=False, default="DRAFT")
    closing_summary_md = Column(Text, nullable=True)
    kpi_snapshot_json = Column(JSON().with_variant(MySQLJSON, "mysql"), nullable=True)

    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)


class OpsPlanTask(Base):
    __tablename__ = "ops_plan_task"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    plan_id = Column(Integer, ForeignKey("ops_plan.id", ondelete="CASCADE"), nullable=False, index=True)

    slot_time = Column(String(10), nullable=True)  # e.g. "14:00", "20:30"
    title = Column(String(300), nullable=False)
    type = Column(String(30), nullable=False, default="NOTE")
    status = Column(String(20), nullable=False, default="TODO")

    memo = Column(Text, nullable=True)
    payload_json = Column(JSON().with_variant(MySQLJSON, "mysql"), nullable=True)

    executed_at = Column(DateTime, nullable=True)
    actor_admin_id = Column(Integer, nullable=True)

    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)


Index("ix_ops_plan_task_plan_id_status", OpsPlanTask.plan_id, OpsPlanTask.status)
UniqueConstraint(OpsPlan.campaign_id, OpsPlan.plan_date, name="uq_ops_plan_campaign_date")
