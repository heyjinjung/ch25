from datetime import datetime, time
from enum import Enum
from typing import Optional

from sqlalchemy import Boolean, Column, DateTime, Enum as SAEnum, ForeignKey, Integer, String, Text, UniqueConstraint, Time
from sqlalchemy.orm import relationship

from app.db.base_class import Base


class MissionCategory(str, Enum):
    DAILY = "DAILY"
    WEEKLY = "WEEKLY"
    SPECIAL = "SPECIAL"
    NEW_USER = "NEW_USER"


class ApprovalStatus(str, Enum):
    NONE = "NONE"
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"


class MissionRewardType(str, Enum):
    NONE = "NONE"
    DIAMOND = "DIAMOND"
    GOLD_KEY = "GOLD_KEY"
    DIAMOND_KEY = "DIAMOND_KEY"
    CASH_UNLOCK = "CASH_UNLOCK"
    TICKET_BUNDLE = "TICKET_BUNDLE"
    TICKET_ROULETTE = "TICKET_ROULETTE"
    TICKET_LOTTERY = "TICKET_LOTTERY"
    TICKET_DICE = "TICKET_DICE"
    POINT = "POINT"
    GIFTICON_BAEMIN = "GIFTICON_BAEMIN"
    GIFTICON_COMPOSE = "GIFTICON_COMPOSE"
    CHICKEN_GIFTICON_5000 = "CHICKEN_GIFTICON_5000"
    CHICKEN_GIFTICON_10000 = "CHICKEN_GIFTICON_10000"
    STARBUCKS_GIFTICON_2000 = "STARBUCKS_GIFTICON_2000"
    STARBUCKS_GIFTICON_10000 = "STARBUCKS_GIFTICON_10000"
    PIZZA_GIFTICON_5000 = "PIZZA_GIFTICON_5000"
    PIZZA_GIFTICON_10000 = "PIZZA_GIFTICON_10000"
    GOOGLE_GIFTICON_5000 = "GOOGLE_GIFTICON_5000"
    GOOGLE_GIFTICON_10000 = "GOOGLE_GIFTICON_10000"
    
    # V2 Standard Types (SoT)
    CC_POINT = "CC_POINT"
    GAME_XP = "GAME_XP"
    TICKET = "TICKET"
    BUNDLE = "BUNDLE"


class Mission(Base):
    __tablename__ = "mission"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    category = Column(SAEnum(MissionCategory), nullable=False, index=True)
    
    # Logic Identifier (e.g., "play_game_5", "login_streak")
    logic_key = Column(String(100), unique=True, nullable=False, index=True)
    
    # Action Type (e.g., "PLAY_GAME", "LOGIN", "INVITE") - One Action maps to Multiple Missions
    action_type = Column(String(50), nullable=True, index=True)

    # Goal target (e.g., 5 for "Play 5 times")
    target_value = Column(Integer, nullable=False, default=1)

    # Rewards
    reward_type = Column(SAEnum(MissionRewardType), nullable=False)
    reward_amount = Column(Integer, nullable=False, default=0)
    xp_reward = Column(Integer, nullable=False, default=0)

    # V6: Admin Approval
    requires_approval = Column(Boolean, default=False)

    # Active period (optional)
    start_date = Column(DateTime, nullable=True)
    end_date = Column(DateTime, nullable=True)
    start_time = Column(Time, nullable=True)
    end_time = Column(Time, nullable=True)
    auto_claim = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)

    created_at = Column(DateTime, default=datetime.utcnow)


class UserMissionProgress(Base):
    __tablename__ = "user_mission_progress"
    __table_args__ = (UniqueConstraint("user_id", "mission_id", "reset_date", name="uq_user_mission_reset"),)

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("v2_user.id", ondelete="CASCADE"), nullable=False, index=True)
    mission_id = Column(Integer, ForeignKey("mission.id", ondelete="CASCADE"), nullable=False, index=True)

    current_value = Column(Integer, nullable=False, default=0)
    is_completed = Column(Boolean, default=False)
    is_claimed = Column(Boolean, default=False)
    
    # V6: Admin Approval
    approval_status = Column(SAEnum(ApprovalStatus), nullable=False, server_default="NONE", default=ApprovalStatus.NONE)

    # For daily/weekly resets. YYYY-MM-DD for daily, YYYY-WW for weekly.
    # Special missions can use a static value or NULL.
    reset_date = Column(String(50), nullable=False, index=True) 

    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)

    user = relationship("V2User")
    mission = relationship("Mission")


# Backward compatibility: �Ϻ� �׽�Ʈ/���Ž� �ڵ忡�� UserMission �̸��� �����Ѵ�.
UserMission = UserMissionProgress


class StreakConfig(Base):
    """Streak daily reward config (�׽�Ʈ�� ȣȯ ��)."""
    __tablename__ = "streak_config"

    id = Column(Integer, primary_key=True, index=True)
    day_number = Column(Integer, nullable=False, index=True)
    reward_type = Column(String(50), nullable=False)
    reward_amount = Column(Integer, nullable=False, default=0)
    description = Column(Text, nullable=True)


class UserStreak(Base):
    """User streak tracking (�׽�Ʈ�� ȣȯ ��)."""
    __tablename__ = "user_streak"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("v2_user.id", ondelete="CASCADE"), nullable=False, index=True)
    current_streak = Column(Integer, nullable=False, default=0)
    last_hit_date = Column(DateTime, nullable=True)
    total_hits = Column(Integer, nullable=False, default=0)

    user = relationship("V2User")
