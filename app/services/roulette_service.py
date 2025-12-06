"""Roulette service implementing status and play flows."""
from datetime import date, datetime
import random

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.exceptions import InvalidConfigError
from app.models.feature import FeatureType
from app.models.roulette import RouletteConfig, RouletteLog, RouletteSegment
from app.schemas.roulette import RoulettePlayResponse, RouletteStatusResponse
from app.services.feature_service import FeatureService
from app.services.game_common import GamePlayContext, apply_season_pass_stamp, enforce_daily_limit, log_game_play
from app.services.reward_service import RewardService


class RouletteService:
    """Encapsulates roulette game operations."""

    def __init__(self) -> None:
        self.feature_service = FeatureService()
        self.reward_service = RewardService()

    def _get_today_config(self, db: Session) -> RouletteConfig:
        config = db.execute(select(RouletteConfig).where(RouletteConfig.is_active.is_(True))).scalar_one_or_none()
        if config is None:
            raise InvalidConfigError("ROULETTE_CONFIG_MISSING")
        return config

    def _get_segments(self, db: Session, config_id: int) -> list[RouletteSegment]:
        segments = (
            db.execute(
                select(RouletteSegment).where(RouletteSegment.config_id == config_id).order_by(RouletteSegment.slot_index)
            )
            .scalars()
            .all()
        )
        if len(segments) != 6:
            raise InvalidConfigError("INVALID_ROULETTE_CONFIG")
        total_weight = sum(segment.weight for segment in segments if segment.weight > 0)
        if total_weight <= 0:
            raise InvalidConfigError("INVALID_ROULETTE_CONFIG")
        return segments

    def get_status(self, db: Session, user_id: int, today: date) -> RouletteStatusResponse:
        self.feature_service.validate_feature_active(db, today, FeatureType.ROULETTE)
        config = self._get_today_config(db)
        segments = self._get_segments(db, config.id)

        today_spins = db.execute(
            select(func.count()).select_from(RouletteLog).where(
                RouletteLog.user_id == user_id,
                RouletteLog.config_id == config.id,
                func.date(RouletteLog.created_at) == today,
            )
        ).scalar_one()
        remaining = max(config.max_daily_spins - today_spins, 0)

        return RouletteStatusResponse(
            config_id=config.id,
            name=config.name,
            max_daily_spins=config.max_daily_spins,
            today_spins=today_spins,
            remaining_spins=remaining,
            segments=segments,
            feature_type=FeatureType.ROULETTE,
        )

    def play(self, db: Session, user_id: int, now: date | datetime) -> RoulettePlayResponse:
        today = now.date() if isinstance(now, datetime) else now
        self.feature_service.validate_feature_active(db, today, FeatureType.ROULETTE)
        config = self._get_today_config(db)
        segments = self._get_segments(db, config.id)

        today_spins = db.execute(
            select(func.count()).select_from(RouletteLog).where(
                RouletteLog.user_id == user_id,
                RouletteLog.config_id == config.id,
                func.date(RouletteLog.created_at) == today,
            )
        ).scalar_one()
        enforce_daily_limit(config.max_daily_spins, today_spins)

        weighted_segments = []
        for seg in segments:
            weighted_segments.extend([seg] * max(seg.weight, 0))
        chosen = random.choice(weighted_segments)

        log_entry = RouletteLog(
            user_id=user_id,
            config_id=config.id,
            segment_id=chosen.id,
            reward_type=chosen.reward_type,
            reward_amount=chosen.reward_amount,
        )
        db.add(log_entry)
        db.commit()
        db.refresh(log_entry)

        ctx = GamePlayContext(user_id=user_id, feature_type=FeatureType.ROULETTE.value, today=today)
        log_game_play(ctx, db, {"segment_id": chosen.id, "reward_type": chosen.reward_type})

        # TODO: integrate RewardService to actually deliver rewards.
        _ = self.reward_service
        season_pass = apply_season_pass_stamp(ctx, db)

        return RoulettePlayResponse(
            result="OK",
            segment=chosen,
            season_pass=season_pass,
        )
