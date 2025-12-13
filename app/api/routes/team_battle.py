"""Public/team endpoints for team battle."""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_user_id, get_db
from app.schemas.team_battle import (
    TeamSeasonResponse,
    TeamJoinRequest,
    TeamMembershipResponse,
    LeaderboardEntry,
    ContributorEntry,
    TeamResponse,
)
from app.services.team_battle_service import TeamBattleService

router = APIRouter(prefix="/api/team-battle", tags=["team-battle"])
svc = TeamBattleService()


@router.get("/seasons/active", response_model=TeamSeasonResponse | None)
def get_active_season(db: Session = Depends(get_db)):
    return svc.get_active_season(db)


@router.post("/teams/join")
def join_team(
    payload: TeamJoinRequest,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    member = svc.join_team(db, team_id=payload.team_id, user_id=user_id)
    return {"team_id": member.team_id, "user_id": member.user_id, "role": member.role}


@router.post("/teams/auto-assign")
def auto_assign(
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    member = svc.auto_assign_team(db, user_id=user_id)
    return {"team_id": member.team_id, "user_id": member.user_id, "role": member.role}


@router.get("/teams/me", response_model=TeamMembershipResponse | None)
def my_team(db: Session = Depends(get_db), user_id: int = Depends(get_current_user_id)):
    return svc.get_membership(db, user_id=user_id)


@router.post("/teams/leave")
def leave_team(db: Session = Depends(get_db), user_id: int = Depends(get_current_user_id)):
    svc.leave_team(db, user_id=user_id)
    return {"left": True}


@router.get("/teams/leaderboard", response_model=list[LeaderboardEntry])
def leaderboard(season_id: int | None = None, limit: int = 20, offset: int = 0, db: Session = Depends(get_db)):
    rows = svc.leaderboard(db, season_id=season_id, limit=min(limit, 100), offset=max(offset, 0))
    return [LeaderboardEntry(team_id=r.team_id, team_name=r.name, points=r.points) for r in rows]


@router.get("/teams/{team_id}/contributors", response_model=list[ContributorEntry])
def contributors(team_id: int, season_id: int | None = None, limit: int = 20, offset: int = 0, db: Session = Depends(get_db)):
    rows = svc.contributors(db, team_id=team_id, season_id=season_id, limit=min(limit, 100), offset=max(offset, 0))
    return [ContributorEntry(user_id=r.user_id, points=r.points or 0) for r in rows]


@router.get("/teams", response_model=list[TeamResponse])
def list_teams(db: Session = Depends(get_db)):
    return svc.list_teams(db, include_inactive=False)
