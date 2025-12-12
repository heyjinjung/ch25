"""Team battle service: teams, seasons, scores, points logging."""
from datetime import datetime
from typing import Optional, Sequence

from fastapi import HTTPException, status
from sqlalchemy import and_, func, select
from sqlalchemy.orm import Session

from app.models.team_battle import TeamSeason, Team, TeamMember, TeamScore, TeamEventLog
from app.models.user import User


class TeamBattleService:
    def get_active_season(self, db: Session, now: datetime | None = None) -> TeamSeason | None:
        today = (now or datetime.utcnow())
        return db.execute(
            select(TeamSeason).where(
                and_(TeamSeason.is_active == True, TeamSeason.starts_at <= today, TeamSeason.ends_at >= today)  # noqa: E712
            )
        ).scalar_one_or_none()

    def create_season(self, db: Session, payload: dict) -> TeamSeason:
        season = TeamSeason(**payload)
        if season.is_active:
            conflict = db.execute(
                select(TeamSeason).where(
                    and_(TeamSeason.is_active == True, TeamSeason.ends_at >= season.starts_at, TeamSeason.starts_at <= season.ends_at)  # noqa: E712
                )
            ).scalar_one_or_none()
            if conflict:
                raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="ACTIVE_SEASON_CONFLICT")
        db.add(season)
        db.commit()
        db.refresh(season)
        return season

    def set_active(self, db: Session, season_id: int, is_active: bool) -> TeamSeason:
        season = db.get(TeamSeason, season_id)
        if not season:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="SEASON_NOT_FOUND")
        season.is_active = is_active
        db.add(season)
        db.commit()
        db.refresh(season)
        return season

    def create_team(self, db: Session, payload: dict, leader_user_id: Optional[int] = None) -> Team:
        team = Team(**payload)
        db.add(team)
        db.commit()
        db.refresh(team)
        if leader_user_id:
            self.join_team(db, team.id, leader_user_id, role="leader")
        return team

    def join_team(self, db: Session, team_id: int, user_id: int, role: str = "member") -> TeamMember:
        team = db.get(Team, team_id)
        if not team or not team.is_active:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="TEAM_NOT_FOUND")
        existing = db.get(TeamMember, user_id)
        if existing:
            if existing.team_id == team_id:
                return existing
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="ALREADY_IN_TEAM")
        member = TeamMember(user_id=user_id, team_id=team_id, role=role)
        db.add(member)
        db.commit()
        db.refresh(member)
        return member

    def leave_team(self, db: Session, user_id: int) -> None:
        member = db.get(TeamMember, user_id)
        if not member:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="NOT_IN_TEAM")
        db.delete(member)
        db.commit()

    def add_points(
        self,
        db: Session,
        team_id: int,
        delta: int,
        action: str,
        user_id: Optional[int],
        season_id: Optional[int],
        meta: Optional[dict],
        now: datetime | None = None,
    ) -> TeamScore:
        if delta == 0:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="ZERO_DELTA")

        season = db.get(TeamSeason, season_id) if season_id else self.get_active_season(db, now)
        if not season:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="NO_ACTIVE_TEAM_SEASON")

        score = db.execute(
            select(TeamScore).where(TeamScore.team_id == team_id, TeamScore.season_id == season.id)
        ).scalar_one_or_none()
        if not score:
            score = TeamScore(team_id=team_id, season_id=season.id, points=0)
            db.add(score)
            db.flush()

        score.points += delta
        score.updated_at = datetime.utcnow()

        log = TeamEventLog(
            team_id=team_id,
            user_id=user_id,
            season_id=season.id,
            action=action,
            delta=delta,
            meta=meta,
        )
        db.add(log)
        db.add(score)
        db.commit()
        db.refresh(score)
        return score

    def leaderboard(self, db: Session, season_id: Optional[int], limit: int, offset: int) -> Sequence[tuple]:
        season = db.get(TeamSeason, season_id) if season_id else self.get_active_season(db)
        if not season:
            return []
        stmt = (
            select(TeamScore.team_id, Team.name, TeamScore.points)
            .join(Team, Team.id == TeamScore.team_id)
            .where(TeamScore.season_id == season.id)
            .order_by(TeamScore.points.desc())
            .offset(offset)
            .limit(limit)
        )
        return db.execute(stmt).all()

    def contributors(self, db: Session, team_id: int, season_id: Optional[int], limit: int, offset: int) -> Sequence[tuple]:
        season = db.get(TeamSeason, season_id) if season_id else self.get_active_season(db)
        if not season:
            return []
        stmt = (
            select(TeamEventLog.user_id, func.sum(TeamEventLog.delta).label("points"))
            .where(TeamEventLog.team_id == team_id, TeamEventLog.season_id == season.id)
            .group_by(TeamEventLog.user_id)
            .order_by(func.sum(TeamEventLog.delta).desc())
            .offset(offset)
            .limit(limit)
        )
        return db.execute(stmt).all()
