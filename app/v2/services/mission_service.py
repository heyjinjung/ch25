"""V2 Mission & Streak Service.

V2-only: remove V1 MissionService dependency and implement core logic locally.
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
from app.v2.services.reward_service import V2RewardService
from app.v2.services.ui_config_service import UiConfigService
from app.v2.schemas.v2_mission import MissionSchema, MissionProgressSchema, MissionWithProgress, StreakInfoSchema

# Action type aliases for backward compatibility
ACTION_TYPE_ALIASES = {
    "JOIN_CHANNEL": ["SUBSCRIBE_CHANNEL", "CHANNEL_JOIN"],
    "SHARE_STORY": ["SHARE", "STORY_SHARE"],
    "PLAY_GAME": ["PLAY"],
}


class V2MissionService:
    def __init__(self, db: Session):
        self.db = db
        self.settings = get_settings()

    def _now_tz(self) -> datetime:
        tz = ZoneInfo(self.settings.timezone or "Asia/Seoul")
        return datetime.now(tz)

    def _operational_play_date(self, now_tz: datetime) -> date:
        """Return the operational play date (KST day with reset at configured hour)."""
        reset_hour = int(getattr(self.settings, "streak_day_reset_hour_kst", 9) or 9)
        today = now_tz.date()
        if now_tz.hour < reset_hour:
            return today - timedelta(days=1)
        return today

    def _normalize_action_type(self, action: str) -> list[str]:
        if action in ACTION_TYPE_ALIASES:
            return [action] + ACTION_TYPE_ALIASES[action]
        for canonical, aliases in ACTION_TYPE_ALIASES.items():
            if action in aliases:
                return [canonical] + aliases
        return [action]

    def _is_golden_hour_mission(self, mission: Mission) -> bool:
        logic_key = (mission.logic_key or "").lower()
        return "golden_hour" in logic_key

    def _is_new_user(self, user_id: int) -> bool:
        """Check if user is considered 'New User' (within 7 days of creation)."""
        user = self.db.execute(select(User).where(User.id == user_id)).scalar_one_or_none()
        if not user:
            return False
        
        # If no created_at, assume not new (or handle as needed)
        if not user.created_at:
            return False

        now_tz = datetime.now(timezone.utc)
        # created_at is usually UTC naive or aware in DB. Ensure comparison works.
        created_at = user.created_at
        if created_at.tzinfo is None:
            created_at = created_at.replace(tzinfo=timezone.utc)
            
        diff = now_tz - created_at
        return diff.days < 7

    def _within_time_window(self, mission: Mission, now_tz: datetime) -> bool:
        if mission.start_time and mission.end_time:
            current_time = now_tz.time()
            return mission.start_time <= current_time <= mission.end_time
        return True

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
                    {"kind": "WALLET", "token_type": "ROULETTE_TICKET", "amount": 1},
                    {"kind": "WALLET", "token_type": "DICE_TICKET", "amount": 1},
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
        reward_service = V2RewardService()
        
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
        """Claim reward for a completed mission (V2-only)."""
        mission = self.db.query(Mission).filter(Mission.id == mission_id).first()
        if not mission:
            return False, "MISSION_NOT_FOUND", 0

        if self._is_golden_hour_mission(mission) and not bool(getattr(self.settings, "golden_hour_enabled", False)):
            return False, "MISSION_DISABLED", 0

        now_tz = self._now_tz()
        if not self._within_time_window(mission, now_tz):
            return False, "MISSION_NOT_ACTIVE", 0

        reset_date = self._get_reset_date_str(mission.category)
        progress = self.db.query(UserMissionProgress).filter(
            UserMissionProgress.user_id == user_id,
            UserMissionProgress.mission_id == mission_id,
            UserMissionProgress.reset_date == reset_date,
        ).with_for_update().first()

        if not progress or not progress.is_completed:
            return False, "NOT_ELIGIBLE", 0

        if mission.requires_approval and str(progress.approval_status) != "APPROVED":
            return False, "APPROVAL_PENDING", 0

        if progress.is_claimed:
            return False, "ALREADY_CLAIMED", 0

        user = self.db.query(User).filter(User.id == user_id).first()
        if not user:
            return False, "USER_NOT_FOUND", 0

        reward_service = V2RewardService()
        target_reward_type: str | None = None
        target_amount = int(mission.reward_amount or 0)

        if mission.reward_type == MissionRewardType.CASH_UNLOCK:
            target_reward_type = "POINT"
        elif mission.reward_type == MissionRewardType.DIAMOND:
            target_reward_type = "DIAMOND"
        elif mission.reward_type == MissionRewardType.GOLD_KEY:
            target_reward_type = "GOLD_KEY_TICKET"
        elif mission.reward_type == MissionRewardType.DIAMOND_KEY:
            target_reward_type = "DIAMOND_TICKET"
        elif mission.reward_type == MissionRewardType.TICKET_BUNDLE:
            target_reward_type = "TICKET_BUNDLE"
        elif mission.reward_type == MissionRewardType.TICKET_ROULETTE:
            target_reward_type = "ROULETTE_TICKET"
        elif mission.reward_type == MissionRewardType.TICKET_DICE:
            target_reward_type = "DICE_TICKET"
        elif mission.reward_type == MissionRewardType.TICKET_LOTTERY:
            target_reward_type = "LOTTERY_TICKET"
        elif mission.reward_type == MissionRewardType.POINT:
            target_reward_type = "POINT"
        elif mission.reward_type == MissionRewardType.CC_POINT:
            target_reward_type = "CC_POINT"
        elif mission.reward_type == MissionRewardType.GAME_XP:
            target_reward_type = "GAME_XP"
        elif mission.reward_type == MissionRewardType.TICKET:
            target_reward_type = "TICKET_BUNDLE"
        elif mission.reward_type == MissionRewardType.BUNDLE:
            target_reward_type = "BUNDLE"
        elif mission.reward_type == MissionRewardType.GIFTICON_BAEMIN:
            target_reward_type = "GIFTICON_BAEMIN"
        elif mission.reward_type == MissionRewardType.GIFTICON_COMPOSE:
            target_reward_type = "GIFTICON_COMPOSE"
        elif mission.reward_type in {
            MissionRewardType.CHICKEN_GIFTICON_5000,
            MissionRewardType.CHICKEN_GIFTICON_10000,
            MissionRewardType.STARBUCKS_GIFTICON_2000,
            MissionRewardType.STARBUCKS_GIFTICON_10000,
            MissionRewardType.PIZZA_GIFTICON_5000,
            MissionRewardType.PIZZA_GIFTICON_10000,
            MissionRewardType.GOOGLE_GIFTICON_5000,
            MissionRewardType.GOOGLE_GIFTICON_10000,
        }:
            target_reward_type = str(mission.reward_type)

        if target_reward_type and target_amount > 0:
            reward_service.deliver(
                self.db,
                user_id=user_id,
                reward_type=target_reward_type,
                reward_amount=target_amount,
                meta={
                    "reason": "MISSION_REWARD",
                    "mission_id": mission_id,
                    "mission_title": mission.title,
                },
                commit=False,
            )

        if int(mission.xp_reward or 0) > 0:
            reward_service.deliver(
                self.db,
                user_id=user_id,
                reward_type="GAME_XP",
                reward_amount=int(mission.xp_reward),
                meta={"reason": "MISSION_REWARD_XP", "mission_id": mission_id},
                commit=False,
            )

        progress.is_claimed = True
        self.db.commit()

        try:
            self.check_all_daily_completed(user_id)
        except Exception:
            pass

        return True, str(mission.reward_type), target_amount

    def claim_daily_gift(self, user_id: int) -> Tuple[bool, str, int]:
        from app.models.mission import MissionCategory

        mission = self.db.query(Mission).filter(Mission.logic_key == "daily_login_gift").first()
        if not mission:
            mission = self.db.query(Mission).filter(Mission.logic_key == "daily_gift").first()

        if not mission:
            mission = Mission(
                title="일일 출석 선물",
                description="매일 접속 시 드리는 선물입니다.",
                category=MissionCategory.DAILY,
                logic_key="daily_login_gift",
                action_type="LOGIN",
                target_value=1,
                reward_type=MissionRewardType.DIAMOND,
                reward_amount=1,
                is_active=True,
            )
            self.db.add(mission)
            self.db.commit()
            self.db.refresh(mission)

        self.update_progress(user_id, mission.logic_key, delta=1)
        return self.claim_reward(user_id, mission.id)

    def update_progress(self, user_id: int, action_type: str, delta: int = 1) -> List[UserMissionProgress]:
        query_action_types = self._normalize_action_type(action_type)

        missions = self.db.query(Mission).filter(
            or_(
                Mission.action_type.in_(query_action_types),
                Mission.logic_key == action_type
            ),
            Mission.is_active == True
        ).all()

        updated_list: list[UserMissionProgress] = []
        now_tz = self._now_tz()

        if action_type in ["PLAY_GAME", "PLAY"] and delta > 0:
            try:
                self.sync_play_streak(user_id=user_id, now_tz=now_tz)
            except Exception:
                pass

        for mission in missions:
            if self._is_golden_hour_mission(mission) and not bool(getattr(self.settings, "golden_hour_enabled", False)):
                continue
            
            # [New User Check] Centralized logic
            if mission.category == MissionCategory.NEW_USER:
                if not self._is_new_user(user_id):
                    continue

            if not self._within_time_window(mission, now_tz):
                continue

            reset_date = self._get_reset_date_str(mission.category)
            progress = self.db.query(UserMissionProgress).filter(
                UserMissionProgress.user_id == user_id,
                UserMissionProgress.mission_id == mission.id,
                UserMissionProgress.reset_date == reset_date,
            ).first()

            if not progress:
                progress = UserMissionProgress(
                    user_id=user_id,
                    mission_id=mission.id,
                    current_value=0,
                    reset_date=reset_date,
                )
                self.db.add(progress)

            if not progress.is_completed:
                progress.current_value += int(delta)
                if progress.current_value >= mission.target_value:
                    progress.current_value = mission.target_value
                    progress.is_completed = True
                    progress.completed_at = datetime.utcnow()

                    if mission.auto_claim and not mission.requires_approval:
                        try:
                            self.claim_reward(user_id, mission.id)
                        except Exception:
                            pass

            updated_list.append(progress)

        self.db.commit()
        for p in updated_list:
            try:
                self.db.refresh(p)
            except Exception:
                pass
        return updated_list

    def sync_play_streak(self, user_id: int, now_tz: datetime) -> User:
        play_day = self._operational_play_date(now_tz)

        user = (
            self.db.query(User)
            .filter(User.id == user_id)
            .with_for_update()
            .one()
        )

        if user.last_play_date == play_day:
            return user

        prev_streak_days = int(getattr(user, "play_streak", 0) or 0)
        prev_last_play_date = getattr(user, "last_play_date", None)

        hot_threshold = int(getattr(self.settings, "streak_hot_threshold_days", 3) or 3)
        legend_threshold = int(getattr(self.settings, "streak_legend_threshold_days", 7) or 7)

        if user.last_play_date == play_day - timedelta(days=1):
            user.play_streak = int(user.play_streak or 0) + 1
        else:
            user.play_streak = 1
            if prev_last_play_date is not None:
                self.db.add(
                    UserEventLog(
                        user_id=int(user.id),
                        feature_type="STREAK",
                        event_name="streak.reset",
                        meta_json={
                            "prev_streak_days": prev_streak_days,
                            "prev_last_play_date": prev_last_play_date.isoformat() if prev_last_play_date else None,
                            "play_day": play_day.isoformat(),
                        },
                    )
                )

        new_streak_days = int(getattr(user, "play_streak", 0) or 0)
        if prev_streak_days < hot_threshold <= new_streak_days:
            self.db.add(
                UserEventLog(
                    user_id=int(user.id),
                    feature_type="STREAK",
                    event_name="streak.promote",
                    meta_json={
                        "milestone": "HOT",
                        "from_days": prev_streak_days,
                        "to_days": new_streak_days,
                        "play_day": play_day.isoformat(),
                    },
                )
            )
        if prev_streak_days < legend_threshold <= new_streak_days:
            self.db.add(
                UserEventLog(
                    user_id=int(user.id),
                    feature_type="STREAK",
                    event_name="streak.promote",
                    meta_json={
                        "milestone": "LEGEND",
                        "from_days": prev_streak_days,
                        "to_days": new_streak_days,
                        "play_day": play_day.isoformat(),
                    },
                )
            )

        user.last_play_date = play_day
        self.db.add(user)

        self._maybe_grant_streak_day_tickets(user=user, play_day=play_day)
        self._maybe_grant_streak_milestone_rewards(
            user=user,
            play_day=play_day,
            prev_streak_days=prev_streak_days,
            new_streak_days=new_streak_days,
        )
        return user

    def _maybe_grant_streak_milestone_rewards(
        self,
        *,
        user: User,
        play_day: date,
        prev_streak_days: int,
        new_streak_days: int,
    ) -> None:
        return

    def _maybe_grant_streak_day_tickets(self, *, user: User, play_day: date) -> None:
        return
