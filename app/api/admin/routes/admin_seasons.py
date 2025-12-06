# /workspace/ch25/app/api/admin/routes/admin_seasons.py
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.schemas.admin_season import (
    AdminSeasonCreate,
    AdminSeasonListResponse,
    AdminSeasonResponse,
    AdminSeasonUpdate,
)
from app.services.admin_season_service import AdminSeasonService

router = APIRouter(prefix="/admin/api/seasons", tags=["admin-seasons"])


@router.get("/", response_model=AdminSeasonListResponse)
def list_seasons(is_active: bool | None = None, page: int = 1, size: int = 20, db: Session = Depends(get_db)):
    return AdminSeasonService.list_seasons(db, is_active=is_active, page=page, size=size)


@router.get("/{season_id}", response_model=AdminSeasonResponse)
def get_season(season_id: int, db: Session = Depends(get_db)):
    season = AdminSeasonService.get_season(db, season_id)
    return AdminSeasonResponse.from_orm(season)


@router.post("/", response_model=AdminSeasonResponse, status_code=201)
def create_season(payload: AdminSeasonCreate, db: Session = Depends(get_db)):
    season = AdminSeasonService.create_season(db, payload)
    return AdminSeasonResponse.from_orm(season)


@router.put("/{season_id}", response_model=AdminSeasonResponse)
def update_season(season_id: int, payload: AdminSeasonUpdate, db: Session = Depends(get_db)):
    season = AdminSeasonService.update_season(db, season_id, payload)
    return AdminSeasonResponse.from_orm(season)
