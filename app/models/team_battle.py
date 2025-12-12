"""Team battle core models (season, team, membership, scores, logs)."""
from datetime import datetime

from sqlalchemy import BigInteger, Boolean, Column, DateTime, ForeignKey, Integer, JSON, String, UniqueConstraint, Index
from sqlalchemy.orm import relationship

from app.db.base_class import Base


class TeamSeason(Base):
    __tablename__ = "team_season"
    __table_args__ = (
        UniqueConstraint("name", name="uq_team_season_name"),
        Index("idx_team_season_active", "is_active"),
        Index("idx_team_season_time", "starts_at", "ends_at"),
    )

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    starts_at = Column(DateTime, nullable=False)
    ends_at = Column(DateTime, nullable=False)
    is_active = Column(Boolean, nullable=False, default=False)
    rewards_schema = Column(JSON, nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    scores = relationship("TeamScore", back_populates="season")
    events = relationship("TeamEventLog", back_populates="season")


class Team(Base):
    __tablename__ = "team"
    __table_args__ = (UniqueConstraint("name", name="uq_team_name"),)

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    icon = Column(String(255), nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    members = relationship("TeamMember", back_populates="team")
    scores = relationship("TeamScore", back_populates="team")
    events = relationship("TeamEventLog", back_populates="team")


class TeamMember(Base):
    __tablename__ = "team_member"
    __table_args__ = (Index("idx_team_member_team", "team_id"),)

    user_id = Column(Integer, primary_key=True)
    team_id = Column(Integer, ForeignKey("team.id", ondelete="CASCADE"), nullable=False)
    role = Column(String(10), nullable=False, default="member")
    joined_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    team = relationship("Team", back_populates="members")


class TeamScore(Base):
    __tablename__ = "team_score"
    __table_args__ = (
        UniqueConstraint("team_id", "season_id", name="uq_team_score"),
        Index("idx_team_score_points", "season_id", "points"),
    )

    team_id = Column(Integer, ForeignKey("team.id", ondelete="CASCADE"), primary_key=True)
    season_id = Column(Integer, ForeignKey("team_season.id", ondelete="CASCADE"), primary_key=True)
    points = Column(BigInteger, nullable=False, default=0)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    team = relationship("Team", back_populates="scores")
    season = relationship("TeamSeason", back_populates="scores")


class TeamEventLog(Base):
    __tablename__ = "team_event_log"
    __table_args__ = (
        Index("idx_tel_season_team", "season_id", "team_id", "created_at"),
        Index("idx_tel_user", "user_id"),
    )

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    team_id = Column(Integer, ForeignKey("team.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("user.id", ondelete="SET NULL"), nullable=True)
    season_id = Column(Integer, ForeignKey("team_season.id", ondelete="CASCADE"), nullable=False)
    action = Column(String(50), nullable=False)
    delta = Column(Integer, nullable=False)
    meta = Column(JSON, nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    team = relationship("Team", back_populates="events")
    season = relationship("TeamSeason", back_populates="events")
