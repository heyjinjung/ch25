"""Season pass domain service implementation aligned with design docs."""
from __future__ import annotations

from datetime import date, datetime
from typing import Iterable

from fastapi import HTTPException, status
from sqlalchemy import and_, select
from sqlalchemy.orm import Session

from app.models.season_pass import (
    SeasonPassConfig,
    SeasonPassLevel,
    SeasonPassProgress,
    SeasonPassRewardLog,
    SeasonPassStampLog,
)


class SeasonPassService:
    """Encapsulates season pass workflows (status, stamp, claim)."""

    def _ensure_default_season(self, db: Session, today: date) -> SeasonPassConfig | None:
        """When TEST_MODE is on and no season exists, create a simple default season."""
        from datetime import timedelta
        from app.core.config import get_settings

        settings = get_settings()
        if not settings.test_mode:
            return None

        existing = db.execute(
            select(SeasonPassConfig).where(
                and_(SeasonPassConfig.start_date <= today, SeasonPassConfig.end_date >= today)
            )
        ).scalar_one_or_none()
        if existing:
            return existing

        season = SeasonPassConfig(
            season_name=f"DEFAULT-{today.isoformat()}",
            start_date=today,
            end_date=today + timedelta(days=6),
            max_level=5,
            base_xp_per_stamp=10,
            is_active=True,
        )
        levels = [
            SeasonPassLevel(level=i, required_xp=20 * i, reward_type="POINT", reward_amount=100 * i, auto_claim=True)
            for i in range(1, 6)
        ]
        season.levels = levels
        db.add(season)
        db.commit()
        db.refresh(season)
        return season

    def get_current_season(self, db: Session, now: date | datetime) -> SeasonPassConfig | None:
        """Return the active season for the given date or None if not found."""

        today = now.date() if isinstance(now, datetime) else now
        stmt = select(SeasonPassConfig).where(
            and_(SeasonPassConfig.start_date <= today, SeasonPassConfig.end_date >= today)
        )
        seasons = db.execute(stmt).scalars().all()
        if not seasons:
            # In TEST_MODE allow auto-creation so FE can proceed locally.
            auto_season = self._ensure_default_season(db, today)
            if auto_season:
                return auto_season
            return None
        if len(seasons) > 1:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="NO_ACTIVE_SEASON_CONFLICT",
            )
        return seasons[0]

    def get_or_create_progress(self, db: Session, user_id: int, season_id: int) -> SeasonPassProgress:
        """Fetch existing progress or create an initial record."""

        stmt = select(SeasonPassProgress).where(
            SeasonPassProgress.user_id == user_id, SeasonPassProgress.season_id == season_id
        )
        progress = db.execute(stmt).scalar_one_or_none()
        if progress:
            return progress

        progress = SeasonPassProgress(
            user_id=user_id,
            season_id=season_id,
            current_level=1,
            current_xp=0,
            total_stamps=0,
        )
        db.add(progress)
        db.commit()
        db.refresh(progress)
        return progress

    def get_status(self, db: Session, user_id: int, now: date | datetime) -> dict:
        """Return active season info, progress, levels, and today's stamp flag."""

        season = self.get_current_season(db, now)
        if season is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="NO_ACTIVE_SEASON")

        progress = self.get_or_create_progress(db, user_id=user_id, season_id=season.id)
        levels = db.execute(
            select(SeasonPassLevel).where(SeasonPassLevel.season_id == season.id).order_by(SeasonPassLevel.level)
        ).scalars().all()

        today = now.date() if isinstance(now, datetime) else now
        stamped_today = db.execute(
            select(SeasonPassStampLog).where(
                SeasonPassStampLog.user_id == user_id,
                SeasonPassStampLog.season_id == season.id,
                SeasonPassStampLog.date == today,
            )
        ).scalar_one_or_none()

        return {
            "season": {
                "id": season.id,
                "season_name": season.season_name,
                "start_date": season.start_date,
                "end_date": season.end_date,
                "max_level": season.max_level,
                "base_xp_per_stamp": season.base_xp_per_stamp,
            },
            "progress": {
                "current_level": progress.current_level,
                "current_xp": progress.current_xp,
                "total_stamps": progress.total_stamps,
                "last_stamp_date": progress.last_stamp_date,
            },
            "levels": [
                {
                    "level": level.level,
                    "required_xp": level.required_xp,
                    "reward_type": level.reward_type,
                    "reward_amount": level.reward_amount,
                    "auto_claim": level.auto_claim,
                }
                for level in levels
            ],
            "today": {"date": today, "stamped": stamped_today is not None},
        }

    def add_stamp(
        self,
        db: Session,
        user_id: int,
        source_feature_type: str,
        xp_bonus: int = 0,
        now: date | datetime | None = None,
    ) -> dict:
        """Apply one stamp: prevent duplicates, update XP, level-up, and log rewards."""

        today = (now or date.today())
        if isinstance(today, datetime):
            today = today.date()

        season = self.get_current_season(db, today)
        if season is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="NO_ACTIVE_SEASON")

        progress = self.get_or_create_progress(db, user_id=user_id, season_id=season.id)

        existing_stamp = db.execute(
            select(SeasonPassStampLog).where(
                SeasonPassStampLog.user_id == user_id,
                SeasonPassStampLog.season_id == season.id,
                SeasonPassStampLog.date == today,
            )
        ).scalar_one_or_none()
        if existing_stamp:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="ALREADY_STAMPED_TODAY")

        xp_to_add = season.base_xp_per_stamp + xp_bonus
        previous_level = progress.current_level
        progress.current_xp += xp_to_add
        progress.total_stamps += 1
        progress.last_stamp_date = today

        achieved_levels = self._eligible_levels(db, season.id, progress.current_xp)
        new_levels = [level for level in achieved_levels if level.level > previous_level]
        rewards: list[dict] = []

        for level in new_levels:
            reward_logged = db.execute(
                select(SeasonPassRewardLog).where(
                    SeasonPassRewardLog.user_id == user_id,
                    SeasonPassRewardLog.season_id == season.id,
                    SeasonPassRewardLog.level == level.level,
                )
            ).scalar_one_or_none()
            if reward_logged:
                continue

            if level.auto_claim:
                reward_log = SeasonPassRewardLog(
                    user_id=user_id,
                    season_id=season.id,
                    progress_id=progress.id,
                    level=level.level,
                    reward_type=level.reward_type,
                    reward_amount=level.reward_amount,
                    claimed_at=datetime.utcnow(),
                )
                db.add(reward_log)
                rewards.append(
                    {
                        "level": level.level,
                        "reward_type": level.reward_type,
                        "reward_amount": level.reward_amount,
                        "auto_claim": level.auto_claim,
                        "claimed_at": reward_log.claimed_at,
                    }
                )

        progress.current_level = max(progress.current_level, previous_level)
        if achieved_levels:
            progress.current_level = max(progress.current_level, max(level.level for level in achieved_levels))

        stamp_log = SeasonPassStampLog(
            user_id=user_id,
            season_id=season.id,
            progress_id=progress.id,
            date=today,
            stamp_count=1,
            source_feature_type=source_feature_type,
            xp_earned=xp_to_add,
        )
        db.add(stamp_log)

        db.commit()
        db.refresh(progress)

        leveled_up = progress.current_level > previous_level
        return {
            "added_stamp": 1,
            "xp_added": xp_to_add,
            "current_level": progress.current_level,
            "leveled_up": leveled_up,
            "rewards": rewards,
        }

    def claim_reward(self, db: Session, user_id: int, level: int, now: date | datetime | None = None) -> dict:
        """Manually claim a non-auto reward for a reached level."""

        today = now.date() if isinstance(now, datetime) else now or date.today()
        season = self.get_current_season(db, today)
        if season is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="NO_ACTIVE_SEASON")

        progress = self.get_or_create_progress(db, user_id=user_id, season_id=season.id)
        if progress.current_level < level:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="LEVEL_NOT_REACHED")

        level_row = db.execute(
            select(SeasonPassLevel).where(
                SeasonPassLevel.season_id == season.id, SeasonPassLevel.level == level
            )
        ).scalar_one_or_none()
        if level_row is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="LEVEL_NOT_FOUND")
        if level_row.auto_claim:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="AUTO_CLAIM_LEVEL")

        existing_log = db.execute(
            select(SeasonPassRewardLog).where(
                SeasonPassRewardLog.user_id == user_id,
                SeasonPassRewardLog.season_id == season.id,
                SeasonPassRewardLog.level == level,
            )
        ).scalar_one_or_none()
        if existing_log:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="REWARD_ALREADY_CLAIMED")

        reward_log = SeasonPassRewardLog(
            user_id=user_id,
            season_id=season.id,
            level=level,
            reward_type=level_row.reward_type,
            reward_amount=level_row.reward_amount,
            claimed_at=datetime.utcnow(),
            progress_id=progress.id,
        )
        db.add(reward_log)
        db.commit()
        db.refresh(reward_log)

        return {
            "level": reward_log.level,
            "reward_type": level_row.reward_type,
            "reward_amount": level_row.reward_amount,
            "claimed_at": reward_log.claimed_at,
        }

    def _eligible_levels(self, db: Session, season_id: int, current_xp: int) -> Iterable[SeasonPassLevel]:
        """Return levels whose required XP is met."""

        return db.execute(
            select(SeasonPassLevel)
            .where(SeasonPassLevel.season_id == season_id, SeasonPassLevel.required_xp <= current_xp)
            .order_by(SeasonPassLevel.level)
        ).scalars().all()
