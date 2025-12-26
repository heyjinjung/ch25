"""Admin audit log for configuration changes."""

from datetime import datetime
from sqlalchemy import JSON, Column, DateTime, Integer, String
from sqlalchemy.dialects.mysql import JSON as MySQLJSON

from app.db.base_class import Base

class AdminAuditLog(Base):
    __tablename__ = "admin_audit_log"

    id = Column(Integer, primary_key=True, index=True)
    admin_id = Column(Integer, nullable=False, index=True)
    action = Column(String(100), nullable=False) # e.g. UPDATE_CONFIG, TOGGLE_MULTIPLIER
    target_type = Column(String(50), nullable=True) # e.g. VaultProgram, UiConfig
    target_id = Column(String(100), nullable=True)
    
    # Store what changed
    before_json = Column(JSON().with_variant(MySQLJSON, "mysql"), nullable=True)
    after_json = Column(JSON().with_variant(MySQLJSON, "mysql"), nullable=True)
    
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
