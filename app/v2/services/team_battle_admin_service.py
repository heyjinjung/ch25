"""V2 Team Battle Admin Service.

어드민 전용 팀배틀 관리 기능:
- 시즌 생성/수정/종료
- 팀 관리 (생성/비활성화)
- 점수 조정 (관리자 수동)
- 보상 배포 (시즌 종료 시)
"""

from __future__ import annotations

import logging
from datetime import datetime, timedelta
from typing import Any, Sequence

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.team_battle import Team, TeamEventLog, TeamMember, TeamScore, TeamSeason
from app.models.user import User
from app.v2.services.admin_audit_service import V2AdminAuditService

logger = logging.getLogger(__name__)


class TeamBattleAdminService:
    """어드민용 팀배틀 관리 서비스."""
    
    # -------------------------------------------------------------------------
    # Season Management
    # -------------------------------------------------------------------------
    
    def list_seasons(
        self,
        db: Session,
        *,
        include_inactive: bool = True,
        limit: int = 20,
        offset: int = 0,
    ) -> Sequence[TeamSeason]:
        """모든 시즌 목록 조회."""
        stmt = select(TeamSeason).order_by(TeamSeason.id.desc()).offset(offset).limit(limit)
        if not include_inactive:
            stmt = stmt.where(TeamSeason.is_active == True)  # noqa: E712
        return db.execute(stmt).scalars().all()
    
    def get_season(self, db: Session, season_id: int) -> TeamSeason | None:
        """시즌 상세 조회."""
        return db.get(TeamSeason, season_id)
    
    def create_season(
        self,
        db: Session,
        *,
        name: str,
        starts_at: datetime,
        ends_at: datetime,
        rewards_schema: dict | None = None,
        is_active: bool = False,
        admin_id: int,
    ) -> TeamSeason:
        """새 시즌 생성."""
        season = TeamSeason(
            name=name,
            starts_at=starts_at,
            ends_at=ends_at,
            rewards_schema=rewards_schema,
            is_active=is_active,
        )
        db.add(season)
        db.flush()
        
        # 감사 로그
        V2AdminAuditService.log(
            db,
            admin_id=admin_id,
            action="TEAM_SEASON_CREATE",
            target_type="team_season",
            target_id=str(season.id),
            after={
                "name": name,
                "starts_at": starts_at.isoformat(),
                "ends_at": ends_at.isoformat(),
                "is_active": is_active,
            },
            auto_commit=False,
        )
        
        db.commit()
        db.refresh(season)
        logger.info(f"Team season created: {season.id} ({name}) by admin {admin_id}")
        return season
    
    def update_season(
        self,
        db: Session,
        *,
        season_id: int,
        name: str | None = None,
        starts_at: datetime | None = None,
        ends_at: datetime | None = None,
        rewards_schema: dict | None = None,
        is_active: bool | None = None,
        admin_id: int,
    ) -> TeamSeason:
        """시즌 정보 수정."""
        season = db.get(TeamSeason, season_id)
        if not season:
            raise ValueError("SEASON_NOT_FOUND")
        
        before = {
            "name": season.name,
            "starts_at": season.starts_at.isoformat() if season.starts_at else None,
            "ends_at": season.ends_at.isoformat() if season.ends_at else None,
            "is_active": season.is_active,
        }
        
        if name is not None:
            season.name = name
        if starts_at is not None:
            season.starts_at = starts_at
        if ends_at is not None:
            season.ends_at = ends_at
        if rewards_schema is not None:
            season.rewards_schema = rewards_schema
        if is_active is not None:
            # 다른 활성 시즌이 있으면 비활성화
            if is_active:
                db.execute(
                    TeamSeason.__table__.update()
                    .where(TeamSeason.id != season_id)
                    .values(is_active=False)
                )
            season.is_active = is_active
        
        after = {
            "name": season.name,
            "starts_at": season.starts_at.isoformat() if season.starts_at else None,
            "ends_at": season.ends_at.isoformat() if season.ends_at else None,
            "is_active": season.is_active,
        }
        
        V2AdminAuditService.log(
            db,
            admin_id=admin_id,
            action="TEAM_SEASON_UPDATE",
            target_type="team_season",
            target_id=str(season_id),
            before=before,
            after=after,
            auto_commit=False,
        )
        
        db.commit()
        db.refresh(season)
        logger.info(f"Team season updated: {season_id} by admin {admin_id}")
        return season
    
    def end_season(
        self,
        db: Session,
        *,
        season_id: int,
        admin_id: int,
        distribute_rewards: bool = False,
    ) -> dict[str, Any]:
        """시즌 종료 처리.
        
        Returns:
            종료 결과 요약 (순위, 보상 배포 결과 등)
        """
        season = db.get(TeamSeason, season_id)
        if not season:
            raise ValueError("SEASON_NOT_FOUND")
        
        # 시즌 비활성화
        season.is_active = False
        season.ends_at = datetime.utcnow()
        
        # 최종 순위 계산
        final_rankings = self._calculate_final_rankings(db, season_id)
        
        result = {
            "season_id": season_id,
            "season_name": season.name,
            "ended_at": season.ends_at.isoformat(),
            "final_rankings": final_rankings,
            "rewards_distributed": False,
        }
        
        # 보상 배포 (옵션)
        if distribute_rewards and season.rewards_schema:
            try:
                rewards_result = self._distribute_season_rewards(db, season, final_rankings)
                result["rewards_distributed"] = True
                result["rewards_result"] = rewards_result
            except Exception as e:
                logger.error(f"Failed to distribute rewards for season {season_id}: {e}")
                result["rewards_error"] = str(e)
        
        V2AdminAuditService.log(
            db,
            admin_id=admin_id,
            action="TEAM_SEASON_END",
            target_type="team_season",
            target_id=str(season_id),
            after=result,
            auto_commit=False,
        )
        
        db.commit()
        logger.info(f"Team season ended: {season_id} by admin {admin_id}")
        return result
    
    def _calculate_final_rankings(self, db: Session, season_id: int) -> list[dict]:
        """시즌 최종 순위 계산."""
        stmt = (
            select(TeamScore.team_id, Team.name, TeamScore.points)
            .join(Team, Team.id == TeamScore.team_id)
            .where(TeamScore.season_id == season_id)
            .order_by(TeamScore.points.desc())
        )
        rows = db.execute(stmt).all()
        
        return [
            {"rank": i + 1, "team_id": row.team_id, "team_name": row.name, "points": row.points}
            for i, row in enumerate(rows)
        ]
    
    def _distribute_season_rewards(
        self,
        db: Session,
        season: TeamSeason,
        rankings: list[dict],
    ) -> dict:
        """시즌 보상 배포 (rewards_schema 기반)."""
        # TODO: 보상 스키마 파싱 및 배포 로직 구현
        # 현재는 플레이스홀더
        return {"status": "NOT_IMPLEMENTED", "message": "Rewards distribution requires implementation"}
    
    # -------------------------------------------------------------------------
    # Team Management
    # -------------------------------------------------------------------------
    
    def list_teams(
        self,
        db: Session,
        *,
        include_inactive: bool = True,
        limit: int = 50,
        offset: int = 0,
    ) -> Sequence[Team]:
        """모든 팀 목록 조회."""
        stmt = select(Team).order_by(Team.id.asc()).offset(offset).limit(limit)
        if not include_inactive:
            stmt = stmt.where(Team.is_active == True)  # noqa: E712
        return db.execute(stmt).scalars().all()
    
    def get_team_detail(self, db: Session, team_id: int) -> dict[str, Any] | None:
        """팀 상세 정보 (멤버 포함)."""
        team = db.get(Team, team_id)
        if not team:
            return None
        
        # 멤버 목록
        members = (
            db.execute(
                select(TeamMember, User)
                .join(User, User.id == TeamMember.user_id)
                .where(TeamMember.team_id == team_id)
            )
            .all()
        )
        
        return {
            "id": team.id,
            "name": team.name,
            "icon": team.icon,
            "is_active": team.is_active,
            "created_at": team.created_at.isoformat() if team.created_at else None,
            "members": [
                {
                    "user_id": m.TeamMember.user_id,
                    "username": m.User.username,
                    "role": m.TeamMember.role,
                    "joined_at": m.TeamMember.joined_at.isoformat() if m.TeamMember.joined_at else None,
                }
                for m in members
            ],
            "member_count": len(members),
        }
    
    def create_team(
        self,
        db: Session,
        *,
        name: str,
        icon: str | None = None,
        admin_id: int,
    ) -> Team:
        """새 팀 생성."""
        team = Team(name=name, icon=icon, is_active=True)
        db.add(team)
        db.flush()
        
        V2AdminAuditService.log(
            db,
            admin_id=admin_id,
            action="TEAM_CREATE",
            target_type="team",
            target_id=str(team.id),
            after={"name": name, "icon": icon},
            auto_commit=False,
        )
        
        db.commit()
        db.refresh(team)
        logger.info(f"Team created: {team.id} ({name}) by admin {admin_id}")
        return team
    
    def update_team(
        self,
        db: Session,
        *,
        team_id: int,
        name: str | None = None,
        icon: str | None = None,
        is_active: bool | None = None,
        admin_id: int,
    ) -> Team:
        """팀 정보 수정."""
        team = db.get(Team, team_id)
        if not team:
            raise ValueError("TEAM_NOT_FOUND")
        
        before = {"name": team.name, "icon": team.icon, "is_active": team.is_active}
        
        if name is not None:
            team.name = name
        if icon is not None:
            team.icon = icon
        if is_active is not None:
            team.is_active = is_active
        
        after = {"name": team.name, "icon": team.icon, "is_active": team.is_active}
        
        V2AdminAuditService.log(
            db,
            admin_id=admin_id,
            action="TEAM_UPDATE",
            target_type="team",
            target_id=str(team_id),
            before=before,
            after=after,
            auto_commit=False,
        )
        
        db.commit()
        db.refresh(team)
        logger.info(f"Team updated: {team_id} by admin {admin_id}")
        return team
    
    # -------------------------------------------------------------------------
    # Score Management
    # -------------------------------------------------------------------------
    
    def adjust_team_score(
        self,
        db: Session,
        *,
        team_id: int,
        season_id: int,
        delta: int,
        reason: str,
        admin_id: int,
    ) -> TeamScore:
        """팀 점수 조정 (관리자 수동)."""
        # 점수 레코드 조회 또는 생성
        score = (
            db.execute(
                select(TeamScore).where(
                    TeamScore.team_id == team_id,
                    TeamScore.season_id == season_id,
                )
            )
            .scalar_one_or_none()
        )
        
        if not score:
            score = TeamScore(team_id=team_id, season_id=season_id, points=0)
            db.add(score)
            db.flush()
        
        before_points = score.points
        score.points = max(0, score.points + delta)  # 음수 방지
        after_points = score.points
        
        V2AdminAuditService.log(
            db,
            admin_id=admin_id,
            action="TEAM_SCORE_ADJUST",
            target_type="team_score",
            target_id=f"{team_id}:{season_id}",
            before={"points": before_points},
            after={"points": after_points, "delta": delta, "reason": reason},
            auto_commit=False,
        )
        
        db.commit()
        db.refresh(score)
        logger.info(
            f"Team score adjusted: team={team_id}, season={season_id}, "
            f"delta={delta}, new_points={after_points} by admin {admin_id}"
        )
        return score
    
    # -------------------------------------------------------------------------
    # Member Management
    # -------------------------------------------------------------------------
    
    def force_join_team(
        self,
        db: Session,
        *,
        user_id: int,
        team_id: int,
        admin_id: int,
        reason: str = "Admin forced join",
    ) -> TeamMember:
        """강제 팀 가입 (선택 기간 무시)."""
        # 기존 멤버십 제거
        existing = db.get(TeamMember, user_id)
        if existing:
            db.delete(existing)
            db.flush()
        
        member = TeamMember(user_id=user_id, team_id=team_id, role="member")
        db.add(member)
        
        V2AdminAuditService.log(
            db,
            admin_id=admin_id,
            action="TEAM_FORCE_JOIN",
            target_type="team_member",
            target_id=str(user_id),
            after={"user_id": user_id, "team_id": team_id, "reason": reason},
            auto_commit=False,
        )
        
        db.commit()
        db.refresh(member)
        logger.info(f"User {user_id} force joined team {team_id} by admin {admin_id}")
        return member
    
    def force_leave_team(
        self,
        db: Session,
        *,
        user_id: int,
        admin_id: int,
        reason: str = "Admin forced leave",
    ) -> bool:
        """강제 팀 탈퇴."""
        member = db.get(TeamMember, user_id)
        if not member:
            return False
        
        V2AdminAuditService.log(
            db,
            admin_id=admin_id,
            action="TEAM_FORCE_LEAVE",
            target_type="team_member",
            target_id=str(user_id),
            before={"user_id": user_id, "team_id": member.team_id},
            after={"reason": reason},
            auto_commit=False,
        )
        
        db.delete(member)
        db.commit()
        logger.info(f"User {user_id} force left team by admin {admin_id}")
        return True
    
    # -------------------------------------------------------------------------
    # Statistics
    # -------------------------------------------------------------------------
    
    def get_season_stats(self, db: Session, season_id: int) -> dict[str, Any]:
        """시즌 통계 요약."""
        season = db.get(TeamSeason, season_id)
        if not season:
            raise ValueError("SEASON_NOT_FOUND")
        
        # 총 참여 팀 수
        team_count = (
            db.execute(
                select(func.count(func.distinct(TeamScore.team_id)))
                .where(TeamScore.season_id == season_id)
            )
            .scalar_one() or 0
        )
        
        # 총 참여 유저 수 (활성 팀 멤버)
        user_count = (
            db.execute(
                select(func.count(func.distinct(TeamMember.user_id)))
                .join(Team, Team.id == TeamMember.team_id)
                .where(Team.is_active == True)  # noqa: E712
            )
            .scalar_one() or 0
        )
        
        # 총 점수 합계
        total_points = (
            db.execute(
                select(func.coalesce(func.sum(TeamScore.points), 0))
                .where(TeamScore.season_id == season_id)
            )
            .scalar_one() or 0
        )
        
        # 이벤트 로그 수
        event_count = (
            db.execute(
                select(func.count(TeamEventLog.id))
                .where(TeamEventLog.season_id == season_id)
            )
            .scalar_one() or 0
        )
        
        return {
            "season_id": season_id,
            "season_name": season.name,
            "is_active": season.is_active,
            "starts_at": season.starts_at.isoformat() if season.starts_at else None,
            "ends_at": season.ends_at.isoformat() if season.ends_at else None,
            "team_count": team_count,
            "user_count": user_count,
            "total_points": total_points,
            "event_count": event_count,
        }
