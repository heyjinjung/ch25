# /workspace/ch25/app/services/admin_roulette_service.py
from fastapi import HTTPException, status
from sqlalchemy.exc import IntegrityError
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
    def _apply_segments(db: Session, config: RouletteConfig, segments_data):
        # Normalize to exactly 6 slots (0~5). If fewer, pad with empty slots; if more, truncate.
        normalized_input = list(segments_data[:6])
        if len(normalized_input) < 6:
            for i in range(len(normalized_input), 6):
                normalized_input.append(
                    type(normalized_input[0])(
                        slot_index=i,
                        label=f"빈 슬롯 {i+1}",
                        weight=1,
                        reward_type="NONE",
                        reward_amount=0,
                        is_jackpot=False,
                    )
                )

        config.segments.clear()
        normalized = []
        for i, segment in enumerate(normalized_input[:6]):
            weight = segment.weight if segment.weight is not None else 0
            weight = max(weight, 1)
            normalized.append(
                RouletteSegment(
                    slot_index=i,
                    label=segment.label,
                    reward_type=segment.reward_type,
                    reward_amount=segment.reward_value if hasattr(segment, "reward_value") else getattr(segment, "reward_amount", 0),
                    weight=weight,
                    is_jackpot=segment.is_jackpot,
                )
            )
        config.segments.extend(normalized)

    @staticmethod
    def create_config(db: Session, data: AdminRouletteConfigCreate) -> RouletteConfig:
        try:
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
        except (InvalidConfigError, IntegrityError):
            db.rollback()
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="INVALID_ROULETTE_CONFIG")
        except Exception:
            db.rollback()
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="INVALID_ROULETTE_CONFIG")

    @staticmethod
    def update_config(db: Session, config_id: int, data: AdminRouletteConfigUpdate) -> RouletteConfig:
        config = AdminRouletteService.get_config(db, config_id)
        try:
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
        except (InvalidConfigError, IntegrityError):
            db.rollback()
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="INVALID_ROULETTE_CONFIG")
        except Exception:
            db.rollback()
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="INVALID_ROULETTE_CONFIG")

    @staticmethod
    def toggle_active(db: Session, config_id: int, active: bool) -> RouletteConfig:
        config = AdminRouletteService.get_config(db, config_id)
        config.is_active = active
        db.add(config)
        db.commit()
        db.refresh(config)
        return config

    @staticmethod
    def delete_config(db: Session, config_id: int) -> None:
        config = AdminRouletteService.get_config(db, config_id)
        db.delete(config)
        db.commit()
