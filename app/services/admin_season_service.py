# /workspace/ch25/app/services/admin_season_service.py
from datetime import date
from typing import Optional, Tuple

from fastapi import HTTPException, status
from sqlalchemy import and_, func, select
from sqlalchemy.orm import Session

from app.models.season_pass import SeasonPassConfig
from app.schemas.admin_season import (
    AdminSeasonCreate,
    AdminSeasonListResponse,
    AdminSeasonResponse,
    AdminSeasonUpdate,
)


class AdminSeasonService:
    """CRUD operations for season_pass_config with active season safeguards."""

    @staticmethod
    def _paginate(query, page: int, size: int) -> Tuple[list[SeasonPassConfig], int]:
        total = query.count()
        items = query.offset((page - 1) * size).limit(size).all()
        return items, total

    @staticmethod
    def list_seasons(
        db: Session, is_active: Optional[bool] = None, page: int = 1, size: int = 20
    ) -> AdminSeasonListResponse:
        query = db.query(SeasonPassConfig)
        if is_active is not None:
            query = query.filter(SeasonPassConfig.is_active == is_active)
        items, total = AdminSeasonService._paginate(query, page, size)
        return AdminSeasonListResponse(
            items=[AdminSeasonResponse.from_orm(item) for item in items], total=total, page=page, size=size
        )

    @staticmethod
    def get_season(db: Session, season_id: int) -> SeasonPassConfig:
        season = db.get(SeasonPassConfig, season_id)
        if not season:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="SEASON_NOT_FOUND")
        return season

    @staticmethod
    def _active_overlap_exists(db: Session, start_date: date, end_date: date, exclude_id: Optional[int] = None) -> bool:
        query = db.query(SeasonPassConfig).filter(SeasonPassConfig.is_active.is_(True))
        if exclude_id:
            query = query.filter(SeasonPassConfig.id != exclude_id)
        return (
            query.filter(
                and_(
                    SeasonPassConfig.start_date <= end_date,
                    SeasonPassConfig.end_date >= start_date,
                )
            ).count()
            > 0
        )

    @staticmethod
    def create_season(db: Session, data: AdminSeasonCreate) -> SeasonPassConfig:
        if data.is_active and AdminSeasonService._active_overlap_exists(db, data.start_date, data.end_date):
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="ACTIVE_SEASON_CONFLICT")
        payload = data.dict(by_alias=True)
        season = SeasonPassConfig(**payload)
        db.add(season)
        db.commit()
        db.refresh(season)
        return season

    @staticmethod
    def update_season(db: Session, season_id: int, data: AdminSeasonUpdate) -> SeasonPassConfig:
        season = AdminSeasonService.get_season(db, season_id)
        update_data = data.dict(exclude_unset=True, by_alias=True)
        if update_data:
            if "start_date" in update_data:
                season.start_date = update_data["start_date"]
            if "end_date" in update_data:
                season.end_date = update_data["end_date"]
            if "season_name" in update_data:
                season.season_name = update_data["season_name"]
            if "max_level" in update_data:
                season.max_level = update_data["max_level"]
            if "base_xp_per_stamp" in update_data:
                season.base_xp_per_stamp = update_data["base_xp_per_stamp"]
            if "is_active" in update_data:
                season.is_active = update_data["is_active"]

            if season.start_date and season.end_date and season.end_date < season.start_date:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="INVALID_SEASON_DATES")

            if season.is_active and AdminSeasonService._active_overlap_exists(
                db, season.start_date, season.end_date, exclude_id=season.id
            ):
                raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="ACTIVE_SEASON_CONFLICT")

            db.add(season)
            db.commit()
            db.refresh(season)
        return season

    @staticmethod
    def deactivate(db: Session, season_id: int) -> SeasonPassConfig:
        season = AdminSeasonService.get_season(db, season_id)
        season.is_active = False
        db.add(season)
        db.commit()
        db.refresh(season)
        return season
