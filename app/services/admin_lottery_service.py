# /workspace/ch25/app/services/admin_lottery_service.py
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.exceptions import InvalidConfigError
from app.models.lottery import LotteryConfig, LotteryPrize
from app.schemas.admin_lottery import AdminLotteryConfigCreate, AdminLotteryConfigUpdate


class AdminLotteryService:
    """Admin CRUD operations for lottery configurations and prizes."""

    @staticmethod
    def list_configs(db: Session):
        return db.query(LotteryConfig).all()

    @staticmethod
    def get_config(db: Session, config_id: int) -> LotteryConfig:
        config = db.get(LotteryConfig, config_id)
        if not config:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="LOTTERY_CONFIG_NOT_FOUND")
        return config

    @staticmethod
    def _apply_prizes(config: LotteryConfig, prizes_data):
        config.prizes.clear()
        total_weight = 0
        active_weight = 0
        active_count = 0
        for prize in prizes_data:
            if prize.weight < 0:
                raise InvalidConfigError("INVALID_LOTTERY_CONFIG")
            if prize.stock is not None and prize.stock < 0:
                raise InvalidConfigError("INVALID_LOTTERY_CONFIG")
            total_weight += prize.weight
            if prize.is_active:
                active_count += 1
                active_weight += prize.weight
            config.prizes.append(
                LotteryPrize(
                    label=prize.label,
                    reward_type=prize.reward_type,
                    reward_amount=prize.reward_value,
                    weight=prize.weight,
                    stock=prize.stock,
                    is_active=prize.is_active,
                )
            )
        if active_count == 0 or active_weight <= 0:
            raise InvalidConfigError("INVALID_LOTTERY_CONFIG")

    @staticmethod
    def create_config(db: Session, data: AdminLotteryConfigCreate) -> LotteryConfig:
        try:
            config = LotteryConfig(
                name=data.name,
                is_active=data.is_active,
                max_daily_tickets=data.max_daily_plays,
            )
            AdminLotteryService._apply_prizes(config, data.prizes)
            db.add(config)
            db.commit()
            db.refresh(config)
            return config
        except InvalidConfigError:
            db.rollback()
            raise
        except Exception:
            db.rollback()
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="INVALID_LOTTERY_CONFIG")

    @staticmethod
    def update_config(db: Session, config_id: int, data: AdminLotteryConfigUpdate) -> LotteryConfig:
        config = AdminLotteryService.get_config(db, config_id)
        try:
            update_data = data.dict(exclude_unset=True)
            if "name" in update_data:
                config.name = update_data["name"]
            if "is_active" in update_data:
                config.is_active = update_data["is_active"]
            if "max_daily_plays" in update_data:
                config.max_daily_tickets = update_data["max_daily_plays"]
            if data.prizes is not None:
                AdminLotteryService._apply_prizes(config, data.prizes)
            db.add(config)
            db.commit()
            db.refresh(config)
            return config
        except InvalidConfigError:
            db.rollback()
            raise
        except Exception:
            db.rollback()
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="INVALID_LOTTERY_CONFIG")

    @staticmethod
    def toggle_active(db: Session, config_id: int, active: bool) -> LotteryConfig:
        config = AdminLotteryService.get_config(db, config_id)
        config.is_active = active
        db.add(config)
        db.commit()
        db.refresh(config)
        return config
