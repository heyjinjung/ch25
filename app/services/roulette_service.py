"""Roulette service implementing status and play flows."""
from datetime import date, datetime
import random
import time

from sqlalchemy import func, select
from sqlalchemy.exc import DBAPIError
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.exceptions import InvalidConfigError, LockAcquisitionError
from app.models.feature import FeatureType
from app.models.roulette import RouletteConfig, RouletteLog, RouletteSegment
from app.schemas.roulette import RoulettePlayResponse, RouletteStatusResponse
from app.services.feature_service import FeatureService
from app.services.game_common import GamePlayContext, apply_season_pass_stamp, log_game_play
from app.services.reward_service import RewardService


class RouletteService:
    """Encapsulates roulette game operations."""

    def __init__(self) -> None:
        self.feature_service = FeatureService()
        self.reward_service = RewardService()

    def _seed_default_segments(self, db: Session, config_id: int) -> list[RouletteSegment]:
        """Ensure six default segments exist for the given config (TEST_MODE bootstrap)."""

        default_segments = [
            {"slot_index": 0, "label": "100 코인", "reward_type": "POINT", "reward_amount": 100, "weight": 30},
            {"slot_index": 1, "label": "200 코인", "reward_type": "POINT", "reward_amount": 200, "weight": 25},
            {"slot_index": 2, "label": "500 코인", "reward_type": "POINT", "reward_amount": 500, "weight": 20},
            {"slot_index": 3, "label": "꽝", "reward_type": "NONE", "reward_amount": 0, "weight": 15},
            {"slot_index": 4, "label": "1,000 코인", "reward_type": "POINT", "reward_amount": 1000, "weight": 8},
            {"slot_index": 5, "label": "잭팟 10,000", "reward_type": "POINT", "reward_amount": 10000, "weight": 2, "is_jackpot": True},
        ]

        db.query(RouletteSegment).filter(RouletteSegment.config_id == config_id).delete()
        db.add_all([RouletteSegment(config_id=config_id, **segment) for segment in default_segments])
        db.commit()
        return db.execute(select(RouletteSegment).where(RouletteSegment.config_id == config_id).order_by(RouletteSegment.slot_index)).scalars().all()

    def _seed_default_config(self, db: Session) -> RouletteConfig:
        """Create a minimal roulette config with default segments for TEST_MODE bootstrap."""

        config = RouletteConfig(name="Test Roulette", is_active=True, max_daily_spins=0)
        db.add(config)
        db.flush()
        self._seed_default_segments(db, config.id)
        db.refresh(config)
        return config

    def _get_today_config(self, db: Session) -> RouletteConfig:
        config = db.execute(select(RouletteConfig).where(RouletteConfig.is_active.is_(True))).scalar_one_or_none()
        if config is None:
            settings = get_settings()
            if settings.test_mode:
                return self._seed_default_config(db)
            raise InvalidConfigError("ROULETTE_CONFIG_MISSING")
        return config

    def _get_segments(self, db: Session, config_id: int, lock: bool = False) -> list[RouletteSegment]:
        settings = get_settings()
        stmt = select(RouletteSegment).where(RouletteSegment.config_id == config_id).order_by(RouletteSegment.slot_index)
        if lock and db.bind and db.bind.dialect.name != "sqlite":
            stmt = stmt.with_for_update()
        try:
            segments = db.execute(stmt).scalars().all()
        except DBAPIError as exc:
            raise LockAcquisitionError("ROULETTE_LOCK_FAILED") from exc
        if len(segments) == 0 and settings.test_mode:
            return self._seed_default_segments(db, config_id)
        if len(segments) != 6:
            raise InvalidConfigError("INVALID_ROULETTE_CONFIG")
        for segment in segments:
            if segment.weight < 0:
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
        # Daily cap removed: use 0 to denote unlimited.
        unlimited = 0
        remaining = 0

        return RouletteStatusResponse(
            config_id=config.id,
            name=config.name,
            max_daily_spins=unlimited,
            today_spins=today_spins,
            remaining_spins=remaining,
            segments=segments,
            feature_type=FeatureType.ROULETTE,
        )

    def play(self, db: Session, user_id: int, now: date | datetime) -> RoulettePlayResponse:
        today = now.date() if isinstance(now, datetime) else now
        self.feature_service.validate_feature_active(db, today, FeatureType.ROULETTE)
        config = self._get_today_config(db)
        segments = None
        for attempt in range(3):
            try:
                segments = self._get_segments(db, config.id, lock=True)
                break
            except LockAcquisitionError:
                if attempt == 2:
                    raise
                time.sleep(0.05)
        assert segments is not None

        today_spins = db.execute(
            select(func.count()).select_from(RouletteLog).where(
                RouletteLog.user_id == user_id,
                RouletteLog.config_id == config.id,
                func.date(RouletteLog.created_at) == today,
            )
        ).scalar_one()

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

        # Deliver reward according to segment definition.
        self.reward_service.deliver(
            db,
            user_id=user_id,
            reward_type=chosen.reward_type,
            reward_amount=chosen.reward_amount,
            meta={"reason": "roulette_spin", "segment_id": chosen.id},
        )
        season_pass = apply_season_pass_stamp(ctx, db)

        return RoulettePlayResponse(
            result="OK",
            segment=chosen,
            season_pass=season_pass,
        )
