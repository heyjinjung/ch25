"""Team battle service: teams, seasons, scores, points logging."""
from datetime import datetime, timedelta, date
from typing import Optional, Sequence, Iterable
import random
from zoneinfo import ZoneInfo

from fastapi import HTTPException, status
from sqlalchemy import and_, case, func, select
from sqlalchemy.orm import Session

from app.models.team_battle import TeamSeason, Team, TeamMember, TeamScore, TeamEventLog
from app.models.external_ranking import ExternalRankingData
from app.models.game_wallet import GameTokenType
from app.services.game_wallet_service import GameWalletService
from app.services.level_xp_service import LevelXPService
from app.core.config import get_settings


class TeamBattleService:
    POINTS_PER_PLAY = 10
    DAILY_POINT_CAP = 500  # 50 plays per day
    TEAM_SELECTION_WINDOW_HOURS = 12
    MIN_PLAYS_FOR_REWARD = 30
    DEFAULT_WEIGHT_DEPOSIT = 0.6
    DEFAULT_WEIGHT_PLAY = 0.4

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

    def _day_bounds_for_date(self, target_date: date) -> tuple[datetime, datetime]:
        settings = get_settings()
        tz = ZoneInfo(settings.timezone)
        utc = ZoneInfo("UTC")

        start_local = datetime(target_date.year, target_date.month, target_date.day, tzinfo=tz)
        end_local = start_local + timedelta(days=1)
        start_utc = start_local.astimezone(utc).replace(tzinfo=None)
        end_utc = end_local.astimezone(utc).replace(tzinfo=None)
        return start_utc, end_utc

    def _normalize_to_utc(self, dt: datetime, now: datetime | None = None) -> datetime:
        """Convert datetime to UTC naive while handling local tz inputs.

        - If tz-aware, convert to UTC and drop tzinfo for DB storage/comparison.
        - If naive but clearly ahead of current UTC time (likely local KST input),
          treat it as local timezone and convert to UTC.
        - Otherwise, assume the value is already UTC naive.
        """

        utc = ZoneInfo("UTC")
        tz = ZoneInfo(get_settings().timezone)
        reference = now or self._now_utc()

        if dt.tzinfo:
            return dt.astimezone(utc).replace(tzinfo=None)

        if dt - reference > timedelta(hours=4):
            return dt.replace(tzinfo=tz).astimezone(utc).replace(tzinfo=None)

        return dt

    def ensure_current_season(self, db: Session, now: datetime | None = None) -> TeamSeason:
        """Ensure a 2-day rolling season (KST anchored) exists covering `now`."""
        today = now or self._now_utc()
        settings = get_settings()
        tz = ZoneInfo(settings.timezone)
        utc = ZoneInfo("UTC")

        base = today if today.tzinfo else today.replace(tzinfo=utc)
        local = base.astimezone(tz)
        start_local = datetime(local.year, local.month, local.day, tzinfo=tz)
        end_local = start_local + timedelta(days=2)
        start = start_local.astimezone(utc).replace(tzinfo=None)
        end = end_local.astimezone(utc).replace(tzinfo=None)

        existing = db.execute(
            select(TeamSeason).where(
                and_(TeamSeason.starts_at <= today, TeamSeason.ends_at >= today)
            )
        ).scalar_one_or_none()
        if existing:
            return existing

        season = TeamSeason(
            name=f"Battle {start_local.date().isoformat()}",
            starts_at=start,
            ends_at=end - timedelta(seconds=1),
            is_active=True,
            rewards_schema={"rank1_coupon": 30000, "rank2_points": 100, "top3_coupon": 10000},
        )
        db.add(season)
        db.flush()
        db.query(TeamSeason).filter(TeamSeason.id != season.id, TeamSeason.is_active == True).update({"is_active": False})  # noqa: E712
        db.commit()
        db.refresh(season)
        return season

    def get_active_season(self, db: Session, now: datetime | None = None) -> TeamSeason | None:
        reference = now or self._now_utc()

        season = db.execute(select(TeamSeason).where(TeamSeason.is_active == True)).scalar_one_or_none()  # noqa: E712
        if not season:
            return None

        start_utc = self._normalize_to_utc(season.starts_at, reference)
        end_utc = self._normalize_to_utc(season.ends_at, reference)

        if start_utc <= reference <= end_utc:
            season.starts_at = start_utc
            season.ends_at = end_utc
            return season

        return None

    def _get_active_or_current(self, db: Session, now: datetime | None = None) -> TeamSeason:
        season = self.get_active_season(db, now)
        if season:
            return season
        return self.ensure_current_season(db, now)

    def _assert_selection_window_open(self, season: TeamSeason, now: datetime) -> None:
        start_utc = self._normalize_to_utc(season.starts_at, now)
        join_deadline = start_utc + timedelta(hours=self.TEAM_SELECTION_WINDOW_HOURS)
        if now < start_utc or now > join_deadline:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="TEAM_SELECTION_CLOSED")

    def _assert_today_usage(self, db: Session, user_id: int, now: datetime) -> None:
        start, end = self._day_bounds(now)
        row = db.execute(
            select(ExternalRankingData).where(
                ExternalRankingData.user_id == user_id,
                ExternalRankingData.updated_at >= start,
                ExternalRankingData.updated_at < end,
            )
        ).scalar_one_or_none()
        if not row:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="USAGE_REQUIRED_TODAY")
        # Must have positive activity vs daily baseline
        if (row.deposit_amount <= (row.daily_base_deposit or 0)) and (row.play_count <= (row.daily_base_play or 0)):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="USAGE_REQUIRED_TODAY")

    def get_membership(self, db: Session, user_id: int) -> TeamMember | None:
        return db.get(TeamMember, user_id)

    def create_season(self, db: Session, payload: dict) -> TeamSeason:
        payload = payload.copy()
        payload["starts_at"] = self._normalize_to_utc(payload["starts_at"])
        payload["ends_at"] = self._normalize_to_utc(payload["ends_at"])

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

    def update_season(self, db: Session, season_id: int, payload: dict) -> TeamSeason:
        season = db.get(TeamSeason, season_id)
        if not season:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="SEASON_NOT_FOUND")

        payload = payload.copy()
        if payload.get("starts_at"):
            payload["starts_at"] = self._normalize_to_utc(payload["starts_at"])
        if payload.get("ends_at"):
            payload["ends_at"] = self._normalize_to_utc(payload["ends_at"])

        for key, value in payload.items():
            if value is None:
                continue
            setattr(season, key, value)

        if payload.get("is_active"):
            db.query(TeamSeason).filter(TeamSeason.id != season.id, TeamSeason.is_active == True).update({"is_active": False})  # noqa: E712

        db.add(season)
        db.commit()
        db.refresh(season)
        return season

    def delete_season(self, db: Session, season_id: int) -> None:
        season = db.get(TeamSeason, season_id)
        if not season:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="SEASON_NOT_FOUND")
        db.delete(season)
        db.commit()

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

    def update_team(self, db: Session, team_id: int, payload: dict) -> Team:
        team = db.get(Team, team_id)
        if not team:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="TEAM_NOT_FOUND")
        for key, value in payload.items():
            if value is None:
                continue
            setattr(team, key, value)
        db.add(team)
        db.commit()
        db.refresh(team)
        return team

    def delete_team(self, db: Session, team_id: int) -> None:
        team = db.get(Team, team_id)
        if not team:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="TEAM_NOT_FOUND")
        db.delete(team)
        db.commit()

    def join_team(self, db: Session, team_id: int, user_id: int, role: str = "member", now: datetime | None = None, bypass_selection: bool = False) -> TeamMember:
        now = now or self._now_utc()
        season = self._get_active_or_current(db, now)
        if not bypass_selection:
            self._assert_selection_window_open(season, now)

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

    def auto_assign_team(self, db: Session, user_id: int, now: datetime | None = None) -> TeamMember:
        now = now or self._now_utc()
        season = self._get_active_or_current(db, now)
        self._assert_selection_window_open(season, now)

        existing = db.get(TeamMember, user_id)
        if existing:
            return existing

        counts = db.execute(
            select(Team.id, func.count(TeamMember.user_id).label("member_count"))
            .where(Team.is_active == True)  # noqa: E712
            .outerjoin(TeamMember, TeamMember.team_id == Team.id)
            .group_by(Team.id)
            .order_by(func.count(TeamMember.user_id).asc(), Team.id.asc())
        ).all()
        if not counts:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="NO_ACTIVE_TEAMS")

        target_team_id = counts[0].id
        return self.join_team(db, team_id=target_team_id, user_id=user_id, role="member", now=now)

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

    def add_points(
        self,
        db: Session,
        team_id: int,
        delta: int,
        action: str,
        user_id: Optional[int],
        season_id: Optional[int],
        meta: Optional[dict],
        enforce_usage: bool = True,
        now: datetime | None = None,
    ) -> TeamScore:
        if delta == 0:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="ZERO_DELTA")

        now = now or self._now_utc()

        season = db.get(TeamSeason, season_id) if season_id else self._get_active_or_current(db, now)
        if not season:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="NO_ACTIVE_TEAM_SEASON")

        member = db.get(TeamMember, user_id) if user_id else None
        if user_id and (not member or member.team_id != team_id):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="NOT_IN_TEAM")

        if action == "GAME_PLAY" and user_id:
            if enforce_usage:
                self._assert_today_usage(db, user_id=user_id, now=now)
            delta = self.POINTS_PER_PLAY
            start, end = self._day_bounds(now)
            points_today = db.execute(
                select(func.coalesce(func.sum(TeamEventLog.delta), 0)).where(
                    TeamEventLog.user_id == user_id,
                    TeamEventLog.action == "GAME_PLAY",
                    TeamEventLog.created_at >= start,
                    TeamEventLog.created_at < end,
                )
            ).scalar_one()
            remaining = self.DAILY_POINT_CAP - points_today
            if remaining <= 0:
                raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail="DAILY_POINT_CAP_REACHED")
            delta = min(delta, remaining)

        score = db.execute(
            select(TeamScore).where(TeamScore.team_id == team_id, TeamScore.season_id == season.id)
        ).scalar_one_or_none()
        if not score:
            score = TeamScore(team_id=team_id, season_id=season.id, points=0)
            db.add(score)
            db.flush()

        score.points += delta
        score.updated_at = self._now_utc()

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

        contributions = db.execute(
            select(
                TeamEventLog.team_id,
                TeamEventLog.user_id,
                func.coalesce(func.sum(TeamEventLog.delta), 0).label("points"),
            )
            .where(
                TeamEventLog.season_id == season_id,
                TeamEventLog.action == "GAME_PLAY",
                TeamEventLog.user_id.isnot(None),
            )
            .group_by(TeamEventLog.team_id, TeamEventLog.user_id)
        ).all()

        contrib_map: dict[int, dict[int, int]] = {}
        for row in contributions:
            team_contrib = contrib_map.setdefault(row.team_id, {})
            team_contrib[row.user_id] = row.points

        wallet = GameWalletService()
        min_points = self.MIN_PLAYS_FOR_REWARD * self.POINTS_PER_PLAY

        def eligible_users_for_team(team_id: int) -> list[dict]:
            users: list[dict] = []
            team_members = db.query(TeamMember).filter(TeamMember.team_id == team_id).all()
            for m in team_members:
                points = contrib_map.get(team_id, {}).get(m.user_id, 0)
                if points >= min_points:
                    users.append({"user_id": m.user_id, "points": points})
            return users

        rank1 = standings[0]
        rank2 = standings[1] if len(standings) > 1 else None

        auto_rewards: list[int] = []
        if rank2:
            for entry in eligible_users_for_team(rank2.team_id):
                LevelXPService().add_xp(
                    db,
                    user_id=entry["user_id"],
                    delta=100,
                    source="TEAM_BATTLE_RANK2",
                    meta={"season_id": season_id, "team_id": rank2.team_id, "rank": 2},
                )
                auto_rewards.append(entry["user_id"])

        all_eligible = [
            {"team_id": t_id, "user_id": u_id, "points": pts}
            for t_id, by_user in contrib_map.items()
            for u_id, pts in by_user.items()
            if pts >= min_points
        ]
        top3_manual = sorted(all_eligible, key=lambda x: (-x["points"], x["team_id"], x["user_id"]))[:3]

        return {
            "season_id": season_id,
            "rank1": {"team_id": rank1.team_id, "points": rank1.points, "manual_coupon": 30000, "eligible_users": eligible_users_for_team(rank1.team_id)},
            "rank2": {"team_id": rank2.team_id, "points": rank2.points} if rank2 else None,
            "rank2_auto_rewarded": auto_rewards,
            "top3_manual_coupon": top3_manual,
            "min_points_required": min_points,
        }

    def _percentile(self, values: list[int], pct: float) -> float:
        if not values:
            return 0.0
        sorted_vals = sorted(values)
        k = (len(sorted_vals) - 1) * (pct / 100.0)
        f = int(k)
        c = min(f + 1, len(sorted_vals) - 1)
        if f == c:
            return float(sorted_vals[f])
        d0 = sorted_vals[f] * (c - k)
        d1 = sorted_vals[c] * (k - f)
        return float(d0 + d1)

    def _normalize(self, value: int, cap: float) -> float:
        if cap <= 0:
            return 0.0
        return min(value / cap, 1.0)

    def _compute_activity_rows(
        self,
        rows: Iterable[ExternalRankingData],
        target_date: date,
        start: datetime,
        end: datetime,
    ) -> list[dict]:
        results: list[dict] = []
        for row in rows:
            if not row:
                continue
            deposit_delta = 0
            play_delta = 0
            if row.last_daily_reset and row.last_daily_reset == target_date:
                deposit_delta = max((row.deposit_amount or 0) - (row.daily_base_deposit or 0), 0)
                play_delta = max((row.play_count or 0) - (row.daily_base_play or 0), 0)
            elif row.updated_at and start <= row.updated_at < end:
                # Fallback: treat entire amounts as today's activity if updated during window
                deposit_delta = max(row.deposit_amount or 0, 0)
                play_delta = max(row.play_count or 0, 0)

            active = deposit_delta > 0 or play_delta > 0 or (row.updated_at and start <= row.updated_at < end)
            if not active:
                continue
            results.append(
                {
                    "user_id": row.user_id,
                    "deposit": int(deposit_delta),
                    "plays": int(play_delta),
                }
            )
        return results

    def compute_balanced_teams(
        self,
        db: Session,
        season_id: Optional[int] = None,
        target_date: Optional[date] = None,
        weight_deposit: float = DEFAULT_WEIGHT_DEPOSIT,
        weight_play: float = DEFAULT_WEIGHT_PLAY,
    ) -> dict:
        season = db.get(TeamSeason, season_id) if season_id else self._get_active_or_current(db)
        if not season:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="NO_ACTIVE_TEAM_SEASON")

        teams = db.execute(select(Team).where(Team.is_active == True)).scalars().all()  # noqa: E712
        if len(teams) != 2:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="REQUIRES_TWO_ACTIVE_TEAMS")

        target_date = target_date or (self._now_utc().date() - timedelta(days=1))
        start, end = self._day_bounds_for_date(target_date)

        rows = db.execute(select(ExternalRankingData)).scalars().all()
        activity = self._compute_activity_rows(rows, target_date=target_date, start=start, end=end)
        if not activity:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="NO_ACTIVE_USERS")

        deposits = [row["deposit"] for row in activity if row["deposit"] > 0]
        plays = [row["plays"] for row in activity if row["plays"] > 0]
        cap_deposit = self._percentile(deposits, 95) or max(deposits, default=0)
        cap_plays = self._percentile(plays, 95) or max(plays, default=0)

        seed = int(f"{season.id}{target_date.strftime('%Y%m%d')}")
        rng = random.Random(seed)

        scored = []
        for row in activity:
            deposit_norm = self._normalize(row["deposit"], cap_deposit)
            play_norm = self._normalize(row["plays"], cap_plays)
            score = (weight_deposit * deposit_norm) + (weight_play * play_norm)
            scored.append({
                "user_id": row["user_id"],
                "deposit": row["deposit"],
                "plays": row["plays"],
                "score": score,
            })

        scored.sort(key=lambda x: (-x["score"], -x["deposit"], -x["plays"], x["user_id"]))

        # Shuffle users with identical scores (within epsilon) for opacity
        epsilon = 1e-9
        i = 0
        while i < len(scored):
            j = i + 1
            while j < len(scored) and abs(scored[j]["score"] - scored[i]["score"]) <= epsilon:
                j += 1
            if j - i > 1:
                rng.shuffle(scored[i:j])
            i = j

        team_totals = [0.0, 0.0]
        team_members: list[list[dict]] = [[], []]

        for row in scored:
            idx = 0 if team_totals[0] <= team_totals[1] else 1
            team_members[idx].append(row)
            team_totals[idx] += row["score"]

        return {
            "season_id": season.id,
            "target_date": target_date.isoformat(),
            "teams": [teams[0].id, teams[1].id],
            "assignments": [team_members[0], team_members[1]],
            "totals": team_totals,
        }

    def apply_balanced_teams(
        self,
        db: Session,
        season_id: Optional[int] = None,
        target_date: Optional[date] = None,
        weight_deposit: float = DEFAULT_WEIGHT_DEPOSIT,
        weight_play: float = DEFAULT_WEIGHT_PLAY,
    ) -> dict:
        plan = self.compute_balanced_teams(
            db,
            season_id=season_id,
            target_date=target_date,
            weight_deposit=weight_deposit,
            weight_play=weight_play,
        )
        team_ids = plan["teams"]
        assignments = plan["assignments"]

        # Persist memberships (bypass selection window and allow moves)
        for idx, rows in enumerate(assignments):
            team_id = team_ids[idx]
            for row in rows:
                member = db.get(TeamMember, row["user_id"])
                if member and member.team_id == team_id:
                    continue
                if member:
                    member.team_id = team_id
                    member.role = member.role or "member"
                    db.add(member)
                else:
                    db.add(TeamMember(user_id=row["user_id"], team_id=team_id, role="member"))
        db.commit()

        plan.update(
            {
                "team1_count": len(assignments[0]),
                "team2_count": len(assignments[1]),
            }
        )
        return plan

    def leaderboard(self, db: Session, season_id: Optional[int], limit: int, offset: int) -> Sequence[tuple]:
        season = db.get(TeamSeason, season_id) if season_id else self.get_active_season(db)
        if not season:
            return []

        member_count = func.count(func.distinct(TeamMember.user_id)).label("member_count")
        latest_event = func.max(TeamEventLog.created_at).label("latest_event_at")
        latest_nulls_last = case((latest_event.is_(None), 1), else_=0)
        stmt = (
            select(TeamScore.team_id, Team.name, TeamScore.points, member_count, latest_event)
            .join(Team, Team.id == TeamScore.team_id)
            .outerjoin(TeamMember, TeamMember.team_id == TeamScore.team_id)
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

    def list_teams(self, db: Session, include_inactive: bool = False) -> Sequence[Team]:
        stmt = select(Team)
        if not include_inactive:
            stmt = stmt.where(Team.is_active == True)  # noqa: E712
        return db.execute(stmt).scalars().all()

    def contributors(self, db: Session, team_id: int, season_id: Optional[int], limit: int, offset: int) -> Sequence[tuple]:
        from app.models.user import User
        season = db.get(TeamSeason, season_id) if season_id else self.get_active_season(db)
        if not season:
            return []
        # Include members with zero points so 참여자 목록 is visible even before 점수 적립
        points_sum = func.coalesce(func.sum(TeamEventLog.delta), 0).label("points")
        latest_event = func.max(TeamEventLog.created_at).label("latest_event_at")
        latest_nulls_last = case((latest_event.is_(None), 1), else_=0)
        stmt = (
            select(TeamMember.user_id, User.nickname, points_sum, latest_event)
            .join(User, User.id == TeamMember.user_id)
            .where(TeamMember.team_id == team_id)
            .outerjoin(
                TeamEventLog,
                and_(
                    TeamEventLog.team_id == TeamMember.team_id,
                    TeamEventLog.user_id == TeamMember.user_id,
                    TeamEventLog.season_id == season.id,
                ),
            )
            .group_by(TeamMember.user_id, User.nickname)
            .order_by(
                points_sum.desc(),
                latest_nulls_last,
                latest_event.desc(),
                TeamMember.user_id.asc(),
            )
            .offset(offset)
            .limit(limit)
        )
        return db.execute(stmt).all()
