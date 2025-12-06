# /workspace/ch25/app/services/admin_roulette_service.py
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.exceptions import InvalidConfigError
from app.models.roulette import RouletteConfig, RouletteSegment
from app.schemas.admin_roulette import AdminRouletteConfigCreate, AdminRouletteConfigUpdate


class AdminRouletteService:
    """Admin CRUD operations for roulette configurations and segments."""

    @staticmethod
    def list_configs(db: Session):
        return db.query(RouletteConfig).all()

    @staticmethod
    def get_config(db: Session, config_id: int) -> RouletteConfig:
        config = db.get(RouletteConfig, config_id)
        if not config:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="ROULETTE_CONFIG_NOT_FOUND")
        return config

    @staticmethod
    def _validate_weights(total_weight: int):
        if total_weight <= 0:
            raise InvalidConfigError("INVALID_ROULETTE_CONFIG")

    @staticmethod
    def _apply_segments(db: Session, config: RouletteConfig, segments_data):
        config.segments.clear()
        total_weight = 0
        for segment in segments_data:
            total_weight += segment.weight
            config.segments.append(
                RouletteSegment(
                    slot_index=segment.index,
                    label=segment.label,
                    reward_type=segment.reward_type,
                    reward_amount=segment.reward_value,
                    weight=segment.weight,
                    is_jackpot=segment.is_jackpot,
                )
            )
        AdminRouletteService._validate_weights(total_weight)

    @staticmethod
    def create_config(db: Session, data: AdminRouletteConfigCreate) -> RouletteConfig:
        config = RouletteConfig(
            name=data.name,
            is_active=data.is_active,
            max_daily_spins=data.max_daily_spins,
        )
        AdminRouletteService._apply_segments(db, config, data.segments)
        db.add(config)
        db.commit()
        db.refresh(config)
        return config

    @staticmethod
    def update_config(db: Session, config_id: int, data: AdminRouletteConfigUpdate) -> RouletteConfig:
        config = AdminRouletteService.get_config(db, config_id)
        update_data = data.dict(exclude_unset=True)
        if "name" in update_data:
            config.name = update_data["name"]
        if "is_active" in update_data:
            config.is_active = update_data["is_active"]
        if "max_daily_spins" in update_data:
            config.max_daily_spins = update_data["max_daily_spins"]
        if data.segments is not None:
            AdminRouletteService._apply_segments(db, config, data.segments)
        db.add(config)
        db.commit()
        db.refresh(config)
        return config

    @staticmethod
    def toggle_active(db: Session, config_id: int, active: bool) -> RouletteConfig:
        config = AdminRouletteService.get_config(db, config_id)
        config.is_active = active
        db.add(config)
        db.commit()
        db.refresh(config)
        return config
