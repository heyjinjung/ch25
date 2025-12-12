"""User model definition."""
from datetime import datetime

from sqlalchemy import Column, DateTime, Integer, String

from app.db.base_class import Base


class User(Base):
    """Application user account."""

    __tablename__ = "user"

    id = Column(Integer, primary_key=True, index=True)
    external_id = Column(String(100), nullable=False, unique=True)
    nickname = Column(String(100), nullable=True)
    password_hash = Column(String(128), nullable=True)
    level = Column(Integer, nullable=False, server_default="1", default=1)
    xp = Column(Integer, nullable=False, server_default="0", default=0)
    status = Column(String(20), nullable=False, default="ACTIVE")
    last_login_at = Column(DateTime, nullable=True)
    last_login_ip = Column(String(45), nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
