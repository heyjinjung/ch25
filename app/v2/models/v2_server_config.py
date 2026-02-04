"""V2 server configuration model."""
from datetime import datetime
from typing import Any

from sqlalchemy import Column, DateTime, String
from sqlalchemy.dialects.mysql import JSON

from app.db.base_class import Base


class V2ServerConfig(Base):
    """Server-side dynamic configuration."""

    __tablename__ = "v2_server_config"

    key = Column(String(100), primary_key=True, index=True)
    value = Column(JSON, nullable=False)
    description = Column(String(255), nullable=True)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
