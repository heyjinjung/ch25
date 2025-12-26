"""App-level UI configuration (admin-editable)."""

from datetime import datetime

from sqlalchemy import Column, DateTime, Integer, String, UniqueConstraint, JSON

from app.db.base_class import Base


class AppUiConfig(Base):
    __tablename__ = "app_ui_config"
    __table_args__ = (UniqueConstraint("key", name="uq_app_ui_config_key"),)

    id = Column(Integer, primary_key=True, index=True)
    key = Column(String(100), nullable=False)
    value_json = Column(JSON, nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
