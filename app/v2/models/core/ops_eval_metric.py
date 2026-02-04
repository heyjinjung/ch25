"""Ops evaluation metrics for plan performance tracking."""

from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, Index, Integer, JSON, String
from sqlalchemy.dialects.mysql import JSON as MySQLJSON

from app.db.base_class import Base


class OpsEvalMetric(Base):
    __tablename__ = "ops_eval_metrics"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    plan_id = Column(Integer, ForeignKey("ops_plan.id", ondelete="CASCADE"), nullable=False, index=True)
    eval_type = Column(String(10), nullable=False)  # D1, D3, D7

    metrics_json = Column(JSON().with_variant(MySQLJSON, "mysql"), nullable=False, default=dict)
    grade = Column(String(5), nullable=True)  # S, A, B, C, F
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)


Index("ix_ops_eval_metrics_plan_eval_type", OpsEvalMetric.plan_id, OpsEvalMetric.eval_type)
Index("ix_ops_eval_metrics_created_at", OpsEvalMetric.created_at)
