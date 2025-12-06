"""Feature scheduling service utilities."""
from datetime import date, datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.exceptions import FeatureNotActiveError, InvalidConfigError, NoFeatureTodayError
from app.models.feature import FeatureConfig, FeatureSchedule, FeatureType


class FeatureService:
    """Resolve today's active feature and validate feature access."""

    def get_today_feature(self, db: Session, now: date | datetime) -> FeatureType:
        today = now.date() if isinstance(now, datetime) else now
        rows = db.execute(select(FeatureSchedule).where(FeatureSchedule.date == today)).scalars().all()
        if not rows:
            raise NoFeatureTodayError()
        if len(rows) > 1:
            raise InvalidConfigError("INVALID_FEATURE_SCHEDULE")
        schedule = rows[0]
        if not schedule.is_active:
            raise FeatureNotActiveError("FEATURE_NOT_ACTIVE")
        return schedule.feature_type

    def validate_feature_active(self, db: Session, now: date | datetime, expected_type: FeatureType) -> FeatureConfig:
        today_feature = self.get_today_feature(db, now)
        if today_feature != expected_type:
            raise FeatureNotActiveError()

        config = db.execute(select(FeatureConfig).where(FeatureConfig.feature_type == expected_type)).scalar_one_or_none()
        if config is None:
            raise InvalidConfigError("FEATURE_CONFIG_MISSING")
        if not config.is_enabled:
            raise FeatureNotActiveError("FEATURE_DISABLED")
        return config
