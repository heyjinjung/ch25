"""V2 Team Battle service (v2-only).

This service mirrors the subset of behavior needed by V2 routes without importing
legacy (v1) services.
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

from typing import Optional, Sequence
from zoneinfo import ZoneInfo

from fastapi import HTTPException, status
from sqlalchemy import and_, case, func, select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models.team_battle import Team, TeamEventLog, TeamMember, TeamScore, TeamSeason


class V2TeamBattleService:
    TEAM_SELECTION_WINDOW_HOURS = 48
    TEAM_MAX_MEMBERS = 7

    def _now_utc(self) -> datetime:
        return datetime.utcnow()

    def _normalize_to_utc(self, dt: datetime, now: datetime | None = None, assume_local_if_naive: bool = False) -> datetime:
        utc = timezone.utc
        tz = ZoneInfo(get_settings().timezone)
        _ = now or self._now_utc()

        if dt.tzinfo:
            return dt.astimezone(utc).replace(tzinfo=None)

        if assume_local_if_naive:
            return dt.replace(tzinfo=tz).astimezone(utc).replace(tzinfo=None)

        return dt

    def get_active_season(self, db: Session, now: datetime | None = None, ignore_dates: bool = False) -> TeamSeason | None:
        reference = now or self._now_utc()

        season = (
            db.execute(select(TeamSeason).where(TeamSeason.is_active == True).order_by(TeamSeason.id.desc()))  # noqa: E712
            .scalars()
            .first()
        )
        if not season:
            return None

        start_utc = self._normalize_to_utc(season.starts_at, reference)
        end_utc = self._normalize_to_utc(season.ends_at, reference)

        if ignore_dates or (start_utc <= reference <= end_utc):
            season.starts_at = start_utc
            season.ends_at = end_utc
            return season

        return None

    def _get_active_or_current(self, db: Session, now: datetime | None = None, ignore_dates: bool = False) -> TeamSeason:
        season = self.get_active_season(db, now, ignore_dates=ignore_dates)
        if season:
            return season
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="NO_ACTIVE_TEAM_SEASON")

    def _assert_selection_window_open(self, season: TeamSeason, now: datetime) -> None:
        start_utc = self._normalize_to_utc(season.starts_at, now)
        join_deadline = start_utc + timedelta(hours=self.TEAM_SELECTION_WINDOW_HOURS)
        if now < start_utc or now > join_deadline:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="TEAM_SELECTION_CLOSED")

    def get_membership(self, db: Session, user_id: int) -> TeamMember | None:
        return db.get(TeamMember, user_id)

    def _prune_team_memberships_for_deleted_users(self, db: Session, team_id: int | None = None) -> int:
        from sqlalchemy import delete, exists

        from app.v2.models.user import V2User

        active_user_exists = exists(
            select(V2User.id).where(
                V2User.id == TeamMember.user_id,
                V2User.status == "ACTIVE",
            )
        )

        stmt = delete(TeamMember).where(~active_user_exists)
        if team_id is not None:
            stmt = stmt.where(TeamMember.team_id == team_id)
        result = db.execute(stmt)
        return int(getattr(result, "rowcount", 0) or 0)

    def join_team(
        self,
        db: Session,
        team_id: int,
        user_id: int,
        role: str = "member",
        now: datetime | None = None,
        bypass_selection: bool = False,
    ) -> TeamMember:
        now = now or self._now_utc()
        season = self._get_active_or_current(db, now, ignore_dates=bypass_selection)
        if not bypass_selection:
            self._assert_selection_window_open(season, now)

        self._prune_team_memberships_for_deleted_users(db, team_id=team_id)

        team = db.execute(select(Team).where(Team.id == team_id).with_for_update()).scalar_one_or_none()
        if not team or not team.is_active:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="TEAM_NOT_FOUND")

        existing = db.get(TeamMember, user_id)
        if existing:
            if existing.team_id == team_id:
                return existing
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="ALREADY_IN_TEAM")

        member_count = db.execute(select(func.count(TeamMember.user_id)).where(TeamMember.team_id == team_id)).scalar_one()
        if (member_count or 0) >= self.TEAM_MAX_MEMBERS:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="TEAM_FULL")

        member = TeamMember(user_id=user_id, team_id=team_id, role=role)
        db.add(member)
        db.commit()
        db.refresh(member)
        return member

    def leave_team(self, db: Session, user_id: int, now: datetime | None = None) -> None:
        member = db.get(TeamMember, user_id)
        if not member:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="NOT_IN_TEAM")

        now = now or self._now_utc()
        season = self.get_active_season(db, now)
        if season:
            start_utc = self._normalize_to_utc(season.starts_at, now)
            join_deadline = start_utc + timedelta(hours=self.TEAM_SELECTION_WINDOW_HOURS)
            if now > join_deadline:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="TEAM_LOCKED")

        db.delete(member)
        db.commit()

    def leaderboard(self, db: Session, season_id: Optional[int], limit: int, offset: int) -> Sequence[tuple]:
        season = db.get(TeamSeason, season_id) if season_id else self.get_active_season(db)
        if not season:
            return []

        from app.v2.models.user import V2User

        member_count = func.count(func.distinct(V2User.id)).label("member_count")
        latest_event = func.max(TeamEventLog.created_at).label("latest_event_at")
        latest_nulls_last = case((latest_event.is_(None), 1), else_=0)
        stmt = (
            select(TeamScore.team_id, Team.name, TeamScore.points, member_count, latest_event)
            .join(Team, Team.id == TeamScore.team_id)
            .outerjoin(TeamMember, TeamMember.team_id == TeamScore.team_id)
            .outerjoin(V2User, and_(V2User.id == TeamMember.user_id, V2User.status == "ACTIVE"))
            .outerjoin(
                TeamEventLog,
                and_(
                    TeamEventLog.team_id == TeamScore.team_id,
                    TeamEventLog.season_id == TeamScore.season_id,
                ),
            )
            .where(TeamScore.season_id == season.id)
            .group_by(TeamScore.team_id, Team.name, TeamScore.points)
            .order_by(
                TeamScore.points.desc(),
                latest_nulls_last,
                latest_event.desc(),
                TeamScore.team_id.asc(),
            )
            .offset(offset)
            .limit(limit)
        )
        return db.execute(stmt).all()

    def list_joinable_teams(self, db: Session) -> Sequence[Team]:
        from app.models.user import User

        member_count = func.count(func.distinct(User.id))
        stmt = (
            select(Team)
            .where(Team.is_active == True)  # noqa: E712
            .outerjoin(TeamMember, TeamMember.team_id == Team.id)
            .outerjoin(User, and_(User.id == TeamMember.user_id, User.status == "ACTIVE"))
            .group_by(Team.id)
            .having(member_count < self.TEAM_MAX_MEMBERS)
            .order_by(Team.id.asc())
        )
        return db.execute(stmt).scalars().all()

    def list_joinable_teams_view(self, db: Session, now: datetime | None = None) -> list[dict]:
        season = self.get_active_season(db, now)
        season_id = int(season.id) if season else None

        from app.models.user import User

        member_count = func.count(func.distinct(User.id)).label("member_count")
        total_score = func.coalesce(TeamScore.points, 0).label("total_score")

        stmt = (
            select(
                Team.id,
                Team.name,
                member_count,
                total_score,
            )
            .where(Team.is_active == True)  # noqa: E712
            .outerjoin(TeamMember, TeamMember.team_id == Team.id)
            .outerjoin(User, and_(User.id == TeamMember.user_id, User.status == "ACTIVE"))
            .outerjoin(
                TeamScore,
                and_(
                    TeamScore.team_id == Team.id,
                    TeamScore.season_id == season_id,
                ),
            )
            .group_by(Team.id, Team.name, TeamScore.points)
            .having(member_count < self.TEAM_MAX_MEMBERS)
            .order_by(Team.id.asc())
        )

        rows = db.execute(stmt).all()
        return [
            {
                "id": int(team_id),
                "name": name,
                "description": None,
                "member_count": int(mc or 0),
                "max_members": int(self.TEAM_MAX_MEMBERS),
                "total_score": int(score or 0),
            }
            for (team_id, name, mc, score) in rows
        ]

    def get_membership_view(self, db: Session, user_id: int, now: datetime | None = None) -> dict:
        member = db.get(TeamMember, user_id)
        if not member:
            return {"team": None, "membership": None, "has_team": False}

        season = self.get_active_season(db, now)
        season_id = int(season.id) if season else None

        from app.models.user import User

        member_count = func.count(func.distinct(User.id)).label("member_count")
        total_score = func.coalesce(TeamScore.points, 0).label("total_score")

        stmt = (
            select(
                Team.id,
                Team.name,
                member_count,
                total_score,
            )
            .where(Team.id == member.team_id)
            .outerjoin(TeamMember, TeamMember.team_id == Team.id)
            .outerjoin(User, and_(User.id == TeamMember.user_id, User.status == "ACTIVE"))
            .outerjoin(
                TeamScore,
                and_(
                    TeamScore.team_id == Team.id,
                    TeamScore.season_id == season_id,
                ),
            )
            .group_by(Team.id, Team.name, TeamScore.points)
        )
        row = db.execute(stmt).first()
        team_payload = None
        if row:
            team_id, name, mc, score = row
            team_payload = {
                "id": int(team_id),
                "name": name,
                "description": None,
                "member_count": int(mc or 0),
                "max_members": int(self.TEAM_MAX_MEMBERS),
                "total_score": int(score or 0),
            }

        membership_payload = {
            "team_id": int(member.team_id),
            "user_id": int(member.user_id),
            "role": member.role,
            "joined_at": member.joined_at.isoformat() if member.joined_at else None,
            "contribution_score": 0,
        }

        return {"team": team_payload, "membership": membership_payload, "has_team": True}

    def get_leaderboard_view(
        self,
        db: Session,
        season_id: Optional[int],
        limit: int,
        offset: int,
        now: datetime | None = None,
    ) -> dict:
        season = db.get(TeamSeason, season_id) if season_id else self.get_active_season(db, now)
        if not season:
            return {"entries": [], "season_id": 0, "total_count": 0}

        raw_rows = self.leaderboard(db, season_id=season.id, limit=limit, offset=offset)
        entries: list[dict] = []
        for idx, row in enumerate(raw_rows):
            team_id, team_name, points, member_count, _latest_event_at = row
            entries.append(
                {
                    "team": {
                        "id": int(team_id),
                        "name": team_name,
                        "description": None,
                        "member_count": int(member_count or 0),
                        "max_members": int(self.TEAM_MAX_MEMBERS),
                        "total_score": int(points or 0),
                        "rank": int(offset + idx + 1),
                    },
                    "rank": int(offset + idx + 1),
                    "season_score": int(points or 0),
                }
            )

        return {"entries": entries, "season_id": int(season.id), "total_count": int(len(entries))}

    def auto_assign_team(self, db: Session, user_id: int, now: datetime | None = None) -> TeamMember:
        existing = db.get(TeamMember, user_id)
        if existing:
            return existing

        now = now or self._now_utc()
        season = self._get_active_or_current(db, now)
        self._assert_selection_window_open(season, now)

        from app.models.user import User

        member_count = func.count(func.distinct(User.id)).label("member_count")
        stmt = (
            select(Team.id)
            .where(Team.is_active == True)  # noqa: E712
            .outerjoin(TeamMember, TeamMember.team_id == Team.id)
            .outerjoin(User, and_(User.id == TeamMember.user_id, User.status == "ACTIVE"))
            .group_by(Team.id)
            .having(member_count < self.TEAM_MAX_MEMBERS)
            .order_by(member_count.asc(), Team.id.asc())
        )
        candidate_team_ids = [int(tid) for (tid,) in db.execute(stmt).all()]

        last_error: HTTPException | None = None
        for team_id in candidate_team_ids:
            try:
                return self.join_team(db, team_id=team_id, user_id=user_id, now=now)
            except HTTPException as exc:
                # Try next team if it filled up between select and join.
                if exc.detail == "TEAM_FULL":
                    last_error = exc
                    continue
                raise

        raise last_error or HTTPException(status_code=status.HTTP_409_CONFLICT, detail="NO_JOINABLE_TEAM")
