import enum
from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, Enum, ForeignKey, Integer
from sqlalchemy.orm import relationship

from app.db.base_class import Base


class VaultStatusEnum(str, enum.Enum):
    LOCKED = "LOCKED"
    UNLOCKED = "UNLOCKED"
    CLAIMED = "CLAIMED"
    EXPIRED = "EXPIRED"


class VaultStatus(Base):
    __tablename__ = "vault_status"

    user_id = Column(Integer, ForeignKey("user.id"), primary_key=True)

    gold_status = Column(
        Enum(VaultStatusEnum), default=VaultStatusEnum.LOCKED, nullable=False
    )
    platinum_status = Column(
        Enum(VaultStatusEnum), default=VaultStatusEnum.LOCKED, nullable=False
    )
    diamond_status = Column(
        Enum(VaultStatusEnum), default=VaultStatusEnum.LOCKED, nullable=False
    )

    platinum_attendance_days = Column(Integer, default=0, nullable=False)
    platinum_deposit_done = Column(Boolean, default=False, nullable=False)

    diamond_deposit_current = Column(Integer, default=0, nullable=False)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    expires_at = Column(DateTime, nullable=False)

    user = relationship("User", backref="vault_status_entry")
