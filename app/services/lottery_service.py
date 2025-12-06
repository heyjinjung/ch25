"""Lottery service implementing status and play flows."""
from datetime import date, datetime
import random

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.exceptions import InvalidConfigError
from app.models.feature import FeatureType
from app.models.lottery import LotteryConfig, LotteryLog, LotteryPrize
from app.schemas.lottery import LotteryPlayResponse, LotteryPrizeSchema, LotteryStatusResponse
from app.services.feature_service import FeatureService
from app.services.game_common import GamePlayContext, apply_season_pass_stamp, log_game_play
from app.services.reward_service import RewardService


class LotteryService:
    """Encapsulates lottery gameplay with weighted prizes and stock handling."""

    def __init__(self) -> None:
        self.feature_service = FeatureService()
        self.reward_service = RewardService()

    def _get_today_config(self, db: Session) -> LotteryConfig:
        config = db.execute(select(LotteryConfig).where(LotteryConfig.is_active.is_(True))).scalar_one_or_none()
        if config is None:
            raise InvalidConfigError("LOTTERY_CONFIG_MISSING")
        return config

    def _eligible_prizes(self, db: Session, config_id: int) -> list[LotteryPrize]:
        prizes_stmt = select(LotteryPrize).where(LotteryPrize.config_id == config_id, LotteryPrize.is_active.is_(True))
        if db.bind and db.bind.dialect.name != "sqlite":
            prizes_stmt = prizes_stmt.with_for_update()
        prizes = db.execute(prizes_stmt).scalars().all()
        eligible = [p for p in prizes if (p.stock is None or p.stock > 0)]
        for prize in eligible:
            if prize.weight < 0:
                raise InvalidConfigError("INVALID_LOTTERY_CONFIG")
        total_weight = sum(p.weight for p in eligible if p.weight > 0)
        if len(eligible) == 0 or total_weight <= 0:
            raise InvalidConfigError("INVALID_LOTTERY_CONFIG")
        return eligible

    def get_status(self, db: Session, user_id: int, today: date) -> LotteryStatusResponse:
        self.feature_service.validate_feature_active(db, today, FeatureType.LOTTERY)
        config = self._get_today_config(db)
        prizes = self._eligible_prizes(db, config.id)

        today_tickets = db.execute(
            select(func.count()).select_from(LotteryLog).where(
                LotteryLog.user_id == user_id,
                LotteryLog.config_id == config.id,
                func.date(LotteryLog.created_at) == today,
            )
        ).scalar_one()
        # Daily cap removed: use 0 to denote unlimited.
        unlimited = 0
        remaining = 0

        return LotteryStatusResponse(
            config_id=config.id,
            name=config.name,
            max_daily_tickets=unlimited,
            today_tickets=today_tickets,
            remaining_tickets=remaining,
            prize_preview=[LotteryPrizeSchema.from_orm(p) for p in prizes],
            feature_type=FeatureType.LOTTERY,
        )

    def play(self, db: Session, user_id: int, now: date | datetime) -> LotteryPlayResponse:
        today = now.date() if isinstance(now, datetime) else now
        self.feature_service.validate_feature_active(db, today, FeatureType.LOTTERY)
        config = self._get_today_config(db)
        prizes = self._eligible_prizes(db, config.id)

        today_tickets = db.execute(
            select(func.count()).select_from(LotteryLog).where(
                LotteryLog.user_id == user_id,
                LotteryLog.config_id == config.id,
                func.date(LotteryLog.created_at) == today,
            )
        ).scalar_one()

        weighted_pool: list[LotteryPrize] = []
        for prize in prizes:
            weighted_pool.extend([prize] * max(prize.weight, 0))
        chosen = random.choice(weighted_pool)

        if chosen.stock is not None:
            chosen.stock -= 1
            db.add(chosen)

        log_entry = LotteryLog(
            user_id=user_id,
            config_id=config.id,
            prize_id=chosen.id,
            reward_type=chosen.reward_type,
            reward_amount=chosen.reward_amount,
        )
        db.add(log_entry)
        db.commit()
        db.refresh(log_entry)

        ctx = GamePlayContext(user_id=user_id, feature_type=FeatureType.LOTTERY.value, today=today)
        log_game_play(ctx, db, {"prize_id": chosen.id, "reward_type": chosen.reward_type})

        self.reward_service.deliver(
            db,
            user_id=user_id,
            reward_type=chosen.reward_type,
            reward_amount=chosen.reward_amount,
            meta={"reason": "lottery_play", "prize_id": chosen.id},
        )
        season_pass = apply_season_pass_stamp(ctx, db)

        return LotteryPlayResponse(
            result="OK",
            prize=LotteryPrizeSchema.from_orm(chosen),
            season_pass=season_pass,
        )
