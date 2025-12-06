"""Feature scheduling service utilities."""
from datetime import date, datetime
from zoneinfo import ZoneInfo

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.exceptions import FeatureNotActiveError, InvalidConfigError, NoFeatureTodayError
from app.models.feature import FeatureConfig, FeatureSchedule, FeatureType


class FeatureService:
    """Resolve today's active feature and validate feature access."""

    def get_today_feature(self, db: Session, now: date | datetime) -> FeatureType:
        """Get today's active feature. In TEST_MODE, returns a special 'ALL' indicator."""
        settings = get_settings()
        
        # TEST_MODE: Return None to indicate all features are accessible
        # This is handled specially by validate_feature_active
        if settings.test_mode:
            return None  # type: ignore  # Signal that all features are allowed
        
        # Normalize to KST to avoid date drift for schedules stored in Asia/Seoul.
        if isinstance(now, datetime):
            kst_now = now.astimezone(ZoneInfo("Asia/Seoul"))
            today = kst_now.date()
        else:
            # If a date is provided, treat it as already aligned to KST.
            today = now
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
        """Validate that the requested feature is active today.
        
        In TEST_MODE, skips the schedule check and only validates FeatureConfig.
        """
        settings = get_settings()
        
        # Skip schedule validation in TEST_MODE
        if not settings.test_mode:
            today_feature = self.get_today_feature(db, now)
            if today_feature != expected_type:
                raise FeatureNotActiveError()

        config = db.execute(select(FeatureConfig).where(FeatureConfig.feature_type == expected_type)).scalar_one_or_none()
        if config is None:
            raise InvalidConfigError("FEATURE_CONFIG_MISSING")
        if not config.is_enabled:
            raise FeatureNotActiveError("FEATURE_DISABLED")
        return config
