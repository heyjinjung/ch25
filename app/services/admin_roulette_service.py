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
        # Normalize to exactly 6 slots (0~5). Accept both `index` and `slot_index`, pad/truncate silently.
        raw_segments = list(segments_data)
        if len(raw_segments) < 6:
            for i in range(len(raw_segments), 6):
                raw_segments.append(
                    type(raw_segments[0])(
                        slot_index=i,
                        label=f"빈 슬롯 {i+1}",
                        weight=1,
                        reward_type="NONE",
                        reward_amount=0,
                        is_jackpot=False,
                    )
                )
        if len(raw_segments) > 6:
            raw_segments = raw_segments[:6]

        config.segments.clear()
        # On update, ensure orphan deletions are flushed before inserting new 0~5 slots.
        # Otherwise, MySQL may attempt INSERTs before DELETEs and hit uq_roulette_segment_slot.
        if getattr(config, "id", None) is not None:
            db.flush()
        normalized = []
        for i, segment in enumerate(raw_segments):
            slot_idx = getattr(segment, "slot_index", None)
            if slot_idx is None:
                slot_idx = getattr(segment, "index", i)
            weight = getattr(segment, "weight", 0) or 1
            reward_value = getattr(segment, "reward_value", None)
            if reward_value is None:
                reward_value = getattr(segment, "reward_amount", 0)
            normalized.append(
                RouletteSegment(
                    slot_index=i,  # 강제로 0~5 재배치
                    label=segment.label,
                    reward_type=segment.reward_type,
                    reward_amount=reward_value,
                    weight=max(weight, 1),
                    is_jackpot=getattr(segment, "is_jackpot", False),
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
