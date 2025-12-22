"""Vault 2.0 scaffold models.

IMPORTANT: These tables are not yet wired into gameplay.
They exist to support a future Vault state machine rollout.
"""

from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, JSON, String

from app.db.base_class import Base


class VaultProgram(Base):
    __tablename__ = "vault_program"

    id = Column(Integer, primary_key=True, index=True)
    key = Column(String(50), nullable=False, unique=True)
    name = Column(String(100), nullable=False)
    duration_hours = Column(Integer, nullable=False, server_default="24", default=24)

    # Phase 2 scaffold fields (no behavior changes yet)
    expire_policy = Column(String(30), nullable=False, server_default="FIXED_24H", default="FIXED_24H")
    unlock_rules_json = Column(JSON, nullable=True)
    ui_copy_json = Column(JSON, nullable=True)
    is_active = Column(Boolean, nullable=False, server_default="1", default=True)

    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)


class VaultStatus(Base):
    __tablename__ = "vault_status"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("user.id"), nullable=False, index=True)
    program_id = Column(Integer, ForeignKey("vault_program.id"), nullable=False, index=True)

    state = Column(String(20), nullable=False, server_default="LOCKED", default="LOCKED")
    locked_amount = Column(Integer, nullable=False, server_default="0", default=0)

    # Phase 2 scaffold fields (no behavior changes yet)
    available_amount = Column(Integer, nullable=False, server_default="0", default=0)
    progress_json = Column(JSON, nullable=True)

    locked_at = Column(DateTime, nullable=True)
    expires_at = Column(DateTime, nullable=True)

    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
