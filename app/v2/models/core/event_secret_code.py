from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship

from app.db.base_class import Base

class EventSecretCode(Base):
    __tablename__ = "event_secret_code"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(50), unique=True, nullable=False, index=True)
    event_date = Column(String(10), nullable=False, index=True)  # YYYY-MM-DD
    reward_type = Column(String(50), nullable=False)
    reward_amount = Column(Integer, nullable=False)
    is_active = Column(Boolean, default=True)
    expires_at = Column(DateTime, nullable=False)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class UserSecretCodeClaim(Base):
    __tablename__ = "user_secret_code_claim"
    __table_args__ = (UniqueConstraint("user_id", "secret_code_id", name="uq_user_secret_code_claim"),)

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("v2_user.id", ondelete="CASCADE"), nullable=False, index=True)
    secret_code_id = Column(Integer, ForeignKey("event_secret_code.id", ondelete="CASCADE"), nullable=False, index=True)
    
    claimed_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("V2User")
    secret_code = relationship("EventSecretCode")
