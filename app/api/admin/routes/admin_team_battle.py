"""Admin endpoints for team battle management."""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.schemas.team_battle import TeamSeasonCreate, TeamSeasonResponse, TeamCreate, TeamResponse, TeamPointsRequest, TeamScoreResponse
from app.services.team_battle_service import TeamBattleService

router = APIRouter(prefix="/admin/api/team-battle", tags=["admin-team-battle"])
service = TeamBattleService()


@router.post("/seasons", response_model=TeamSeasonResponse)
def create_season(payload: TeamSeasonCreate, db: Session = Depends(get_db)):
    return service.create_season(db, payload.model_dump())


@router.post("/seasons/{season_id}/active", response_model=TeamSeasonResponse)
def set_active(season_id: int, is_active: bool, db: Session = Depends(get_db)):
    return service.set_active(db, season_id=season_id, is_active=is_active)


@router.post("/teams", response_model=TeamResponse)
def create_team(payload: TeamCreate, leader_user_id: int | None = None, db: Session = Depends(get_db)):
    return service.create_team(db, payload.model_dump(), leader_user_id=leader_user_id)


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
    )


@router.post("/seasons/{season_id}/settle")
def settle_rewards(season_id: int, db: Session = Depends(get_db)):
    return service.settle_daily_rewards(db, season_id=season_id)
