"""V2 Mission & Streak Service.

Migrated from V1 MissionService with V2 patterns.
"""
from datetime import date, datetime, timedelta, timezone
from typing import List, Optional, Tuple, Dict, Any
from zoneinfo import ZoneInfo

from sqlalchemy import and_, func, select, or_
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models.mission import Mission, UserMissionProgress, MissionCategory, MissionRewardType
from app.models.user import User
from app.models.feature import UserEventLog
from app.services.reward_service import RewardService
from app.services.ui_config_service import UiConfigService
from app.v2.schemas.v2_mission import MissionSchema, MissionProgressSchema, MissionWithProgress, StreakInfoSchema


class V2MissionService:
    def __init__(self, db: Session):
        self.db = db
        self.settings = get_settings()

    def _now_tz(self) -> datetime:
        tz = ZoneInfo(self.settings.timezone or "Asia/Seoul")
        return datetime.now(tz)

    def _operational_play_date(self, now_tz: datetime) -> date:
        """Return the operational play date (KST day with reset at configured hour)."""
        reset_hour = int(getattr(self.settings, "streak_day_reset_hour_kst", 0) or 0)
        today = now_tz.date()
        if now_tz.hour < reset_hour:
            return today - timedelta(days=1)
        return today

    def get_user_missions(self, user_id: int) -> List[MissionWithProgress]:
        """Fetch active missions with user's current progress."""
        now_tz = self._now_tz()
        today = now_tz.date()
        
        # 1. Fetch all active missions
        missions = self.db.execute(
            select(Mission).where(
                Mission.is_active == True,
                and_(
                    or_(Mission.start_date == None, Mission.start_date <= datetime.combine(today, datetime.min.time())),
                    or_(Mission.end_date == None, Mission.end_date >= datetime.combine(today, datetime.max.time()))
                )
            )
        ).scalars().all()
        
        result = []
        for m in missions:
            reset_date = self._get_reset_date_str(m.category)
            progress = self.db.execute(
                select(UserMissionProgress).where(
                    UserMissionProgress.user_id == user_id,
                    UserMissionProgress.mission_id == m.id,
                    UserMissionProgress.reset_date == reset_date
                )
            ).scalar_one_or_none()
            
            p_schema = MissionProgressSchema(
                current_value=progress.current_value if progress else 0,
                is_completed=progress.is_completed if progress else False,
                is_claimed=progress.is_claimed if progress else False,
                approval_status=str(progress.approval_status.value if progress and hasattr(progress.approval_status, "value") else (progress.approval_status if progress else "NONE"))
            )
            
            result.append(MissionWithProgress(
                mission=MissionSchema.model_validate(m),
                progress=p_schema
            ))
            
        return result

    def _get_reset_date_str(self, category: MissionCategory) -> str:
        now_tz = self._now_tz()
        if category == MissionCategory.DAILY:
            return self._operational_play_date(now_tz).isoformat()
        if category == MissionCategory.WEEKLY:
            # ISO Year-Week
            return now_tz.strftime("%Y-W%V")
        return "NON_RESET"

    def get_streak_info(self, user_id: int) -> StreakInfoSchema:
        user = self.db.execute(select(User).where(User.id == user_id)).scalar_one_or_none()
        if not user:
            return StreakInfoSchema(
                streak_days=0,
                current_multiplier=1.0,
                is_hot=False,
                is_legend=False,
                next_milestone=3
            )

        streak_days = int(user.play_streak or 0)
        hot_threshold = int(getattr(self.settings, "streak_hot_threshold_days", 3) or 3)
        legend_threshold = int(getattr(self.settings, "streak_legend_threshold_days", 7) or 7)

        is_hot = streak_days >= hot_threshold
        is_legend = streak_days >= legend_threshold
        
        # Logic for next milestone
        if streak_days < hot_threshold:
            next_milestone = hot_threshold
        elif streak_days < legend_threshold:
            next_milestone = legend_threshold
        else:
            # Loop check or next 7?
            next_milestone = ((streak_days // 7) + 1) * 7

        claimable_day = self.get_pending_streak_milestone(user_id)

        return StreakInfoSchema(
            streak_days=streak_days,
            current_multiplier=self._get_streak_multiplier(streak_days),
            is_hot=is_hot,
            is_legend=is_legend,
            next_milestone=next_milestone,
            claimable_day=claimable_day
        )

    def _get_streak_multiplier(self, streak_days: int) -> float:
        if not self.settings.streak_multiplier_enabled:
            return 1.0
        if streak_days >= self.settings.streak_legend_threshold_days:
            return self.settings.streak_legend_multiplier
        if streak_days >= self.settings.streak_hot_threshold_days:
            return self.settings.streak_hot_multiplier
        return 1.0

    def get_pending_streak_milestone(self, user_id: int) -> Optional[int]:
        """Verify if the user has an unclaimed milestone reward for the current streak."""
        user = self.db.execute(select(User).where(User.id == user_id)).scalar_one_or_none()
        if not user or not user.play_streak:
            return None

        streak_days = int(user.play_streak)
        rules = self._get_streak_reward_rules()
        achieved_milestones = sorted([r["day"] for r in rules if streak_days >= r["day"]], reverse=True)

        for m_day in achieved_milestones:
             # Check if claimed for the current 'hit date'
             if not user.last_play_date:
                 continue
                 
             hit_date = user.last_play_date - timedelta(days=(streak_days - m_day))
             event_name = f"streak.reward_grant.{m_day}.{hit_date.isoformat()}"
             
             exists = self.db.execute(
                 select(UserEventLog).where(
                     UserEventLog.user_id == user_id,
                     UserEventLog.event_name == event_name
                 )
             ).first()
             
             if not exists:
                 return m_day
        return None

    def _get_streak_reward_rules(self) -> List[Dict[str, Any]]:
        row = UiConfigService.get(self.db, "streak_reward_rules")
        if row and row.value_json:
            return row.value_json.get("rules", [])
        # Defaults if config missing
        return [
            {
                "day": 3, "enabled": True, "grants": [
                    {"kind": "WALLET", "token_type": "ROULETTE_COIN", "amount": 1},
                    {"kind": "WALLET", "token_type": "DICE_TOKEN", "amount": 1},
                    {"kind": "WALLET", "token_type": "LOTTERY_TICKET", "amount": 1},
                ]
            },
            {
                "day": 7, "enabled": True, "grants": [
                    {"kind": "WALLET", "token_type": "DIAMOND", "amount": 1}
                ]
            }
        ]

    def claim_streak_reward(self, user_id: int) -> Dict[str, Any]:
        """Claim streak milestone reward."""
        target_day = self.get_pending_streak_milestone(user_id)
        if not target_day:
            return {"success": False, "message": "NO_CLAIMABLE_REWARD"}
            
        user = self.db.execute(select(User).where(User.id == user_id)).scalar_one_or_none()
        streak_days = int(user.play_streak)
        hit_date = user.last_play_date - timedelta(days=(streak_days - target_day))
        event_name = f"streak.reward_grant.{target_day}.{hit_date.isoformat()}"

        rules = self._get_streak_reward_rules()
        rule = next((r for r in rules if r["day"] == target_day), None)
        if not rule:
            return {"success": False, "message": "RULE_NOT_FOUND"}

        grants = rule.get("grants", [])
        results = []
        reward_service = RewardService()
        
        meta = {
            "reason": "STREAK_MILESTONE_REWARD",
            "milestone_day": target_day,
            "streak_days": streak_days,
            "hit_date": hit_date.isoformat()
        }

        for g in grants:
            kind = g.get("kind")
            amount = int(g.get("amount", 0))
            if kind == "WALLET":
                tt = g.get("token_type")
                reward_service.deliver(
                    self.db, user_id=user_id, reward_type=tt, reward_amount=amount,
                    meta=meta, commit=False
                )
                results.append({"type": tt, "amount": amount})
            elif kind == "INVENTORY":
                it = g.get("item_type")
                reward_service.deliver(
                    self.db, user_id=user_id, reward_type=it, reward_amount=amount,
                    meta=meta, commit=False
                )
                results.append({"type": it, "amount": amount})

        # Log completion
        self.db.add(UserEventLog(
            user_id=user_id, feature_type="STREAK", event_name=event_name,
            meta_json={**meta, "grants": results}
        ))
        
        self.db.commit()
        return {"success": True, "day": target_day, "grants": results}

    def claim_reward(self, user_id: int, mission_id: int) -> Tuple[bool, str, int]:
        """Legacy wrapper for mission reward claim, but uses V2 patterns."""
        # Note: In a full V2 migration, we would use local implementations if they differ.
        from app.services.mission_service import MissionService as V1MissionService
        v1 = V1MissionService(self.db)
        return v1.claim_reward(user_id, mission_id)

    def claim_daily_gift(self, user_id: int) -> Tuple[bool, str, int]:
        from app.services.mission_service import MissionService as V1MissionService
        v1 = V1MissionService(self.db)
        return v1.claim_daily_gift(user_id)
