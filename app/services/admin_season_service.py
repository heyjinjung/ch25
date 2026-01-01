# /workspace/ch25/app/services/admin_season_service.py
from datetime import date
from typing import List, Optional, Tuple

from fastapi import HTTPException, status
from sqlalchemy import and_, func, select
from sqlalchemy.orm import Session

from app.models.season_pass import SeasonPassConfig, SeasonPassLevel
from app.schemas.admin_season import (
    AdminSeasonCreate,
    AdminSeasonLevelCreate,
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

    # ─────────────────────────────────────────────────────────────────────────
    # SeasonPassLevel methods: XP requirements and rewards per level
    # ─────────────────────────────────────────────────────────────────────────

    @staticmethod
    def list_levels(db: Session, season_id: int) -> List[SeasonPassLevel]:
        """List all levels for a season, ordered by level number."""
        AdminSeasonService.get_season(db, season_id)  # Ensure season exists
        return (
            db.query(SeasonPassLevel)
            .filter(SeasonPassLevel.season_id == season_id)
            .order_by(SeasonPassLevel.level)
            .all()
        )

    @staticmethod
    def bulk_upsert_levels(
        db: Session, season_id: int, levels: List[AdminSeasonLevelCreate]
    ) -> List[SeasonPassLevel]:
        """Bulk upsert levels for a season (create or update by level number)."""
        AdminSeasonService.get_season(db, season_id)  # Ensure season exists

        # Get existing levels for this season
        existing = {
            lv.level: lv
            for lv in db.query(SeasonPassLevel)
            .filter(SeasonPassLevel.season_id == season_id)
            .all()
        }

        result: List[SeasonPassLevel] = []
        for level_data in levels:
            if level_data.level in existing:
                # Update existing level
                lv = existing[level_data.level]
                lv.required_xp = level_data.required_xp
                lv.reward_type = level_data.reward_type
                lv.reward_amount = level_data.reward_amount
                lv.auto_claim = level_data.auto_claim
            else:
                # Create new level
                lv = SeasonPassLevel(
                    season_id=season_id,
                    level=level_data.level,
                    required_xp=level_data.required_xp,
                    reward_type=level_data.reward_type,
                    reward_amount=level_data.reward_amount,
                    auto_claim=level_data.auto_claim,
                )
                db.add(lv)
            result.append(lv)

        db.commit()
        for lv in result:
            db.refresh(lv)

        return sorted(result, key=lambda x: x.level)
