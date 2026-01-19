"""V2 ops execution result model."""
from datetime import datetime

from sqlalchemy import Column, DateTime, Integer, JSON, String

from app.db.base_class import Base


class V2OpsExecutionResult(Base):
    __tablename__ = "v2_ops_execution_result"

    id = Column(Integer, primary_key=True, autoincrement=True)
    task_id = Column(Integer, nullable=False, index=True)
    kind = Column(String(50), nullable=False)
    payload_json = Column(JSON, nullable=False)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
