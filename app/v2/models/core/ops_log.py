"""Ops log models for admin operations."""
from datetime import datetime, date
from sqlalchemy import Boolean, Column, Date, DateTime, ForeignKey, Integer, JSON, String, Index
from sqlalchemy.dialects.mysql import JSON as MySQLJSON

from app.db.base_class import Base


class OpsDailyLog(Base):
    __tablename__ = "ops_daily_log"

    date = Column(Date, primary_key=True, index=True)
    theme_title = Column(String(200), nullable=True)
    manager_id = Column(Integer, nullable=True)
    status = Column(String(20), nullable=False, default="DRAFT")
    summary_md = Column(String(length=5000), nullable=True)
    kpi_snapshot = Column(JSON().with_variant(MySQLJSON, "mysql"), nullable=True)


class OpsLogEntry(Base):
    __tablename__ = "ops_log_entry"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    daily_log_date = Column(Date, ForeignKey("ops_daily_log.date", ondelete="CASCADE"), nullable=False)
    timestamp = Column(DateTime, nullable=False, default=datetime.utcnow, index=True)
    category = Column(String(50), nullable=False)
    action_code = Column(String(100), nullable=False)
    target_model = Column(String(50), nullable=False, default="NONE")
    target_id = Column(String(100), nullable=True, index=True)
    meta_data = Column(JSON().with_variant(MySQLJSON, "mysql"), nullable=False, default=dict)
    is_automated = Column(Boolean, nullable=False, default=False)
    actor_id = Column(Integer, nullable=False)
    ref_id = Column(String(100), nullable=True, unique=True)


Index("ix_ops_log_entry_daily_log_date", OpsLogEntry.daily_log_date)
Index("ix_ops_log_entry_ref_id_unique", OpsLogEntry.ref_id, unique=True)
