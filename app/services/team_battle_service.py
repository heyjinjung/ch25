"""Team battle service: teams, seasons, scores, points logging."""
from datetime import datetime, timedelta
from typing import Optional, Sequence
from zoneinfo import ZoneInfo

from fastapi import HTTPException, status
from sqlalchemy import and_, func, select
from sqlalchemy.orm import Session

from app.models.team_battle import TeamSeason, Team, TeamMember, TeamScore, TeamEventLog
from app.models.user import User
from app.models.game_wallet import GameTokenType
from app.services.game_wallet_service import GameWalletService
from app.core.config import get_settings


class TeamBattleService:
    DAILY_LIMIT = 10

    def _now_utc(self) -> datetime:
        return datetime.utcnow()

    def _day_bounds(self, now: datetime) -> tuple[datetime, datetime]:
        settings = get_settings()
        tz = ZoneInfo(settings.timezone)
        utc = ZoneInfo("UTC")

        base = now if now.tzinfo else now.replace(tzinfo=utc)
        local = base.astimezone(tz)
        start_local = datetime(local.year, local.month, local.day, tzinfo=tz)
        end_local = start_local + timedelta(days=1)
        start_utc = start_local.astimezone(utc).replace(tzinfo=None)
        end_utc = end_local.astimezone(utc).replace(tzinfo=None)
        return start_utc, end_utc

    def ensure_today_season(self, db: Session, now: datetime | None = None) -> TeamSeason:
        today = now or self._now_utc()
        start, end = self._day_bounds(today)
        settings = get_settings()
        tz = ZoneInfo(settings.timezone)
        start_local = start.replace(tzinfo=ZoneInfo("UTC")).astimezone(tz)
        existing = db.execute(
            select(TeamSeason).where(
                and_(TeamSeason.starts_at <= today, TeamSeason.ends_at >= today)
            )
        ).scalar_one_or_none()
        if existing:
            return existing

        season = TeamSeason(
            name=f"Daily {start_local.date().isoformat()}",
            starts_at=start,
            ends_at=end - timedelta(seconds=1),
            is_active=True,
            rewards_schema={"rank1": {"token": "CC_COIN", "amount": 2}},
        )
        db.add(season)
        db.flush()
        # Optionally deactivate other seasons
        db.query(TeamSeason).filter(TeamSeason.id != season.id, TeamSeason.is_active == True).update({"is_active": False})  # noqa: E712
        db.commit()
        db.refresh(season)
        return season

    def get_active_season(self, db: Session, now: datetime | None = None) -> TeamSeason | None:
        today = (now or self._now_utc())
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

        now = now or self._now_utc()

        if action == "GAME_PLAY" and user_id:
            start, end = self._day_bounds(now)
            played = db.execute(
                select(func.count(TeamEventLog.id)).where(
                    TeamEventLog.user_id == user_id,
                    TeamEventLog.action == "GAME_PLAY",
                    TeamEventLog.created_at >= start,
                    TeamEventLog.created_at < end,
                )
            ).scalar_one()
            if played >= self.DAILY_LIMIT:
                raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail="DAILY_LIMIT_REACHED")

        season = db.get(TeamSeason, season_id) if season_id else (self.get_active_season(db, now) or self.ensure_today_season(db, now))
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

    def settle_daily_rewards(self, db: Session, season_id: int) -> dict:
        season = db.get(TeamSeason, season_id)
        if not season:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="SEASON_NOT_FOUND")

        latest_event = func.max(TeamEventLog.created_at).label("latest_event")
        standings = db.execute(
            select(
                TeamScore.team_id,
                TeamScore.points,
                latest_event,
            )
            .join(Team, Team.id == TeamScore.team_id)
            .outerjoin(TeamEventLog, and_(TeamEventLog.team_id == TeamScore.team_id, TeamEventLog.season_id == TeamScore.season_id))
            .where(TeamScore.season_id == season_id)
            .group_by(TeamScore.team_id, TeamScore.points)
            .order_by(TeamScore.points.desc(), latest_event.desc(), TeamScore.team_id.asc())
        ).all()

        if not standings:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="NO_STANDINGS")

        winner_team_id = standings[0].team_id

        members = db.query(TeamMember).filter(TeamMember.team_id == winner_team_id).all()
        wallet = GameWalletService()
        rewarded_users: list[int] = []
        for member in members:
            wallet.grant_tokens(
                db,
                user_id=member.user_id,
                token_type=GameTokenType.CC_COIN,
                amount=2,
                reason="TEAM_BATTLE_REWARD",
                label=f"season:{season_id}:rank:1",
                meta={"season_id": season_id, "team_id": winner_team_id, "rank": 1},
            )
            rewarded_users.append(member.user_id)

        return {
            "season_id": season_id,
            "winner_team_id": winner_team_id,
            "rewarded_users": rewarded_users,
            "reward": {"token": GameTokenType.CC_COIN, "amount": 2},
        }

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

    def list_teams(self, db: Session) -> Sequence[Team]:
        return db.execute(select(Team).where(Team.is_active == True)).scalars().all()  # noqa: E712

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
