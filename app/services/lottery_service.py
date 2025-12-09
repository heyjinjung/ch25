"""Lottery service implementing status and play flows."""
from datetime import date, datetime
import random
import time

from sqlalchemy import func, select
from sqlalchemy.exc import DBAPIError
from sqlalchemy.orm import Session

from app.core.exceptions import InvalidConfigError, LockAcquisitionError
from app.models.feature import FeatureType
from app.models.game_wallet import GameTokenType
from app.models.lottery import LotteryConfig, LotteryLog, LotteryPrize
from app.schemas.lottery import LotteryPlayResponse, LotteryPrizeSchema, LotteryStatusResponse
from app.services.feature_service import FeatureService
from app.services.game_common import GamePlayContext, log_game_play
from app.services.game_wallet_service import GameWalletService
from app.services.reward_service import RewardService
from app.services.season_pass_service import SeasonPassService


class LotteryService:
    """Encapsulates lottery gameplay with weighted prizes and stock handling."""

    def __init__(self) -> None:
        self.feature_service = FeatureService()
        self.reward_service = RewardService()
        self.wallet_service = GameWalletService()
        self.season_pass_service = SeasonPassService()

    def _get_today_config(self, db: Session) -> LotteryConfig:
        config = db.execute(select(LotteryConfig).where(LotteryConfig.is_active.is_(True))).scalar_one_or_none()
        if config is None:
            raise InvalidConfigError("LOTTERY_CONFIG_MISSING")
        return config

    def _eligible_prizes(self, db: Session, config_id: int, lock: bool = False) -> list[LotteryPrize]:
        prizes_stmt = select(LotteryPrize).where(LotteryPrize.config_id == config_id, LotteryPrize.is_active.is_(True))
        if lock and db.bind and db.bind.dialect.name != "sqlite":
            prizes_stmt = prizes_stmt.with_for_update()
        try:
            prizes = db.execute(prizes_stmt).scalars().all()
        except DBAPIError as exc:
            raise LockAcquisitionError("LOTTERY_LOCK_FAILED") from exc
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
        token_type = GameTokenType.LOTTERY_TICKET
        token_balance = self.wallet_service.get_balance(db, user_id, token_type)
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
            token_type=token_type.value,
            token_balance=token_balance,
            prize_preview=[LotteryPrizeSchema.from_orm(p) for p in prizes],
            feature_type=FeatureType.LOTTERY,
        )

    def play(self, db: Session, user_id: int, now: date | datetime) -> LotteryPlayResponse:
        today = now.date() if isinstance(now, datetime) else now
        self.feature_service.validate_feature_active(db, today, FeatureType.LOTTERY)
        config = self._get_today_config(db)
        token_type = GameTokenType.LOTTERY_TICKET
        prizes = None
        for attempt in range(3):
            try:
                prizes = self._eligible_prizes(db, config.id, lock=True)
                break
            except LockAcquisitionError:
                if attempt == 2:
                    raise
                time.sleep(0.05)
        assert prizes is not None

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

        self.wallet_service.require_and_consume_token(
            db,
            user_id,
            token_type,
            amount=1,
            reason="LOTTERY_PLAY",
            label=chosen.label,
            meta={"prize_id": chosen.id},
        )

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
        log_game_play(
            ctx,
            db,
            {
                "prize_id": chosen.id,
                "reward_type": chosen.reward_type,
                "reward_amount": chosen.reward_amount,
                "label": chosen.label,
                "xp_from_reward": chosen.reward_amount if chosen.reward_amount > 0 else 0,
            },
        )

        self.reward_service.deliver(
            db,
            user_id=user_id,
            reward_type=chosen.reward_type,
            reward_amount=chosen.reward_amount,
            meta={"reason": "lottery_play", "prize_id": chosen.id},
        )
        if chosen.reward_amount > 0:
            self.season_pass_service.maybe_add_internal_win_stamp(db, user_id=user_id, now=today)
        season_pass = None  # 게임 1회당 자동 스탬프 발급 제거

        return LotteryPlayResponse(
            result="OK",
            prize=LotteryPrizeSchema.from_orm(chosen),
            season_pass=season_pass,
        )
