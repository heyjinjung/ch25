from datetime import datetime
from enum import Enum
from typing import Optional

from sqlalchemy import Boolean, Column, DateTime, Enum as SAEnum, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import relationship

from app.db.base_class import Base


class MissionCategory(str, Enum):
    DAILY = "DAILY"
    WEEKLY = "WEEKLY"
    SPECIAL = "SPECIAL"


class MissionRewardType(str, Enum):
    DIAMOND = "DIAMOND"
    GOLD_KEY = "GOLD_KEY"
    DIAMOND_KEY = "DIAMOND_KEY"
    TICKET_BUNDLE = "TICKET_BUNDLE"
    NONE = "NONE"  # Pure XP mission


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

    # Active period (optional)
    start_date = Column(DateTime, nullable=True)
    end_date = Column(DateTime, nullable=True)
    is_active = Column(Boolean, default=True)

    created_at = Column(DateTime, default=datetime.utcnow)


class UserMissionProgress(Base):
    __tablename__ = "user_mission_progress"
    __table_args__ = (UniqueConstraint("user_id", "mission_id", "reset_date", name="uq_user_mission_reset"),)

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("user.id", ondelete="CASCADE"), nullable=False, index=True)
    mission_id = Column(Integer, ForeignKey("mission.id", ondelete="CASCADE"), nullable=False, index=True)

    current_value = Column(Integer, nullable=False, default=0)
    is_completed = Column(Boolean, default=False)
    is_claimed = Column(Boolean, default=False)
    
    # For daily/weekly resets. YYYY-MM-DD for daily, YYYY-WW for weekly.
    # Special missions can use a static value or NULL.
    reset_date = Column(String(50), nullable=False, index=True) 

    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)

    user = relationship("User")
    mission = relationship("Mission")
