"""Admin endpoints for team battle management."""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.schemas.team_battle import (
    TeamSeasonCreate,
    TeamSeasonResponse,
    TeamSeasonUpdate,
    TeamCreate,
    TeamUpdate,
    TeamResponse,
    TeamPointsRequest,
    TeamScoreResponse,
    TeamForceJoinRequest,
    TeamAutoBalanceRequest,
    TeamAutoBalanceResponse,
)
from app.services.team_battle_service import TeamBattleService

router = APIRouter(prefix="/admin/api/team-battle", tags=["admin-team-battle"])
service = TeamBattleService()


@router.post("/seasons", response_model=TeamSeasonResponse)
def create_season(payload: TeamSeasonCreate, db: Session = Depends(get_db)):
    return service.create_season(db, payload.model_dump())


@router.patch("/seasons/{season_id}", response_model=TeamSeasonResponse)
def update_season(season_id: int, payload: TeamSeasonUpdate, db: Session = Depends(get_db)):
    return service.update_season(db, season_id=season_id, payload=payload.model_dump())


@router.delete("/seasons/{season_id}")
def delete_season(season_id: int, db: Session = Depends(get_db)):
    service.delete_season(db, season_id=season_id)
    return {"deleted": True}


@router.post("/seasons/{season_id}/active", response_model=TeamSeasonResponse)
def set_active(season_id: int, is_active: bool, db: Session = Depends(get_db)):
    return service.set_active(db, season_id=season_id, is_active=is_active)


@router.post("/teams", response_model=TeamResponse)
def create_team(payload: TeamCreate, leader_user_id: int | None = None, db: Session = Depends(get_db)):
    return service.create_team(db, payload.model_dump(), leader_user_id=leader_user_id)


@router.get("/teams", response_model=list[TeamResponse])
def list_teams(include_inactive: bool = True, db: Session = Depends(get_db)):
    return service.list_teams(db, include_inactive=include_inactive)


@router.patch("/teams/{team_id}", response_model=TeamResponse)
def update_team(team_id: int, payload: TeamUpdate, db: Session = Depends(get_db)):
    return service.update_team(db, team_id=team_id, payload=payload.model_dump())


@router.delete("/teams/{team_id}")
def delete_team(team_id: int, db: Session = Depends(get_db)):
    service.delete_team(db, team_id=team_id)
    return {"deleted": True}


@router.post("/teams/points", response_model=TeamScoreResponse)
def add_points(payload: TeamPointsRequest, db: Session = Depends(get_db)):
    return service.add_points(
        db,
        team_id=payload.team_id,
        delta=payload.delta,
        action=payload.action,
        user_id=payload.user_id,
        season_id=payload.season_id,
        meta=payload.meta,
        enforce_usage=False,
        auto_join_if_missing=True,
    )


@router.post("/seasons/{season_id}/settle")
def settle_rewards(season_id: int, db: Session = Depends(get_db)):
    return service.settle_daily_rewards(db, season_id=season_id)


@router.post("/teams/force-join")
def force_join(payload: TeamForceJoinRequest, db: Session = Depends(get_db)):
    member = service.move_member(db, team_id=payload.team_id, user_id=payload.user_id, role="member", keep_points=True)
    return {"team_id": member.team_id, "user_id": member.user_id, "role": member.role, "moved": True, "keep_points": True}


@router.post("/teams/auto-balance", response_model=TeamAutoBalanceResponse)
def auto_balance(payload: TeamAutoBalanceRequest, db: Session = Depends(get_db)):
    if payload.apply:
        result = service.apply_balanced_teams(
            db,
            season_id=payload.season_id,
            target_date=payload.target_date,
            weight_deposit=payload.weight_deposit,
            weight_play=payload.weight_play,
        )
    else:
        result = service.compute_balanced_teams(
            db,
            season_id=payload.season_id,
            target_date=payload.target_date,
            weight_deposit=payload.weight_deposit,
            weight_play=payload.weight_play,
        )
    return TeamAutoBalanceResponse(
        season_id=result["season_id"],
        target_date=result["target_date"],
        teams=result["teams"],
        totals=result["totals"],
        team1_count=result.get("team1_count", len(result.get("assignments", [[], []])[0])),
        team2_count=result.get("team2_count", len(result.get("assignments", [[], []])[1])),
    )
