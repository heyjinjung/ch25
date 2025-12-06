# /workspace/ch25/app/services/admin_dice_service.py
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.dice import DiceConfig
from app.schemas.admin_dice import AdminDiceConfigCreate, AdminDiceConfigUpdate


class AdminDiceService:
    """Admin CRUD operations for dice configurations."""

    @staticmethod
    def list_configs(db: Session):
        return db.query(DiceConfig).all()

    @staticmethod
    def get_config(db: Session, config_id: int) -> DiceConfig:
        config = db.get(DiceConfig, config_id)
        if not config:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="DICE_CONFIG_NOT_FOUND")
        return config

    @staticmethod
    def _validate_limits(max_daily_plays: int):
        if max_daily_plays <= 0:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="INVALID_MAX_DAILY_PLAYS")

    @staticmethod
    def create_config(db: Session, data: AdminDiceConfigCreate) -> DiceConfig:
        AdminDiceService._validate_limits(data.max_daily_plays)
        config = DiceConfig(
            name=data.name,
            is_active=data.is_active,
            max_daily_plays=data.max_daily_plays,
            win_reward_type=data.win_reward_type,
            win_reward_amount=data.win_reward_value,
            draw_reward_type=data.draw_reward_type,
            draw_reward_amount=data.draw_reward_value,
            lose_reward_type=data.lose_reward_type,
            lose_reward_amount=data.lose_reward_value,
        )
        db.add(config)
        db.commit()
        db.refresh(config)
        return config

    @staticmethod
    def update_config(db: Session, config_id: int, data: AdminDiceConfigUpdate) -> DiceConfig:
        config = AdminDiceService.get_config(db, config_id)
        update_data = data.dict(exclude_unset=True)
        if "max_daily_plays" in update_data:
            AdminDiceService._validate_limits(update_data["max_daily_plays"])
        for field, value in update_data.items():
            if field == "win_reward_value":
                config.win_reward_amount = value
            elif field == "draw_reward_value":
                config.draw_reward_amount = value
            elif field == "lose_reward_value":
                config.lose_reward_amount = value
            else:
                setattr(config, field, value)
        db.add(config)
        db.commit()
        db.refresh(config)
        return config

    @staticmethod
    def toggle_active(db: Session, config_id: int, active: bool) -> DiceConfig:
        config = AdminDiceService.get_config(db, config_id)
        config.is_active = active
        db.add(config)
        db.commit()
        db.refresh(config)
        return config
