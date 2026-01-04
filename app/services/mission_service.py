from datetime import date, datetime, timedelta, timezone
import math
from typing import List, Optional, Tuple

from sqlalchemy.orm import Session
from sqlalchemy import and_, or_

from app.models.mission import Mission, UserMissionProgress, MissionCategory, MissionRewardType
from app.models.user import User
from app.models.season_pass import SeasonPassProgress
from app.models.game_wallet import UserGameWallet, GameTokenType
from app.core.config import get_settings
from zoneinfo import ZoneInfo

class MissionService:
    def __init__(self, db: Session):
        self.db = db
        self.settings = get_settings()

    def _is_golden_hour_mission(self, mission: Mission) -> bool:
        logic_key = (mission.logic_key or "").lower()
        return "golden_hour" in logic_key

    def _now_tz(self) -> datetime:
        tz = ZoneInfo(self.settings.timezone or "Asia/Seoul")
        return datetime.now(tz)

    def _within_time_window(self, mission: Mission, now_tz: datetime) -> bool:
        if mission.start_time and mission.end_time:
            current_time = now_tz.time()
            return mission.start_time <= current_time <= mission.end_time
        return True

    def _operational_play_date(self, now_tz: datetime) -> date:
        """Return the operational play date (KST day with reset at configured hour)."""
        reset_hour = int(getattr(self.settings, "streak_day_reset_hour_kst", 9) or 9)
        today = now_tz.date()
        if now_tz.hour < reset_hour:
            return today - timedelta(days=1)
        return today

    def sync_play_streak(self, user_id: int, now_tz: datetime) -> User:
        """Update user's play_streak/last_play_date with row-level lock; no commit here."""
        play_day = self._operational_play_date(now_tz)

        user = (
            self.db.query(User)
            .filter(User.id == user_id)
            .with_for_update()
            .one()
        )

        if user.last_play_date == play_day:
            return user

        if user.last_play_date == play_day - timedelta(days=1):
            user.play_streak = int(user.play_streak or 0) + 1
        else:
            user.play_streak = 1
        user.last_play_date = play_day
        self.db.add(user)

        # Day4~5 streak ticket bonus: grant once on the first play of the operational day.
        self._maybe_grant_streak_day_tickets(user=user, play_day=play_day)
        return user

    def _maybe_grant_streak_day_tickets(self, *, user: User, play_day: date) -> None:
        if not bool(getattr(self.settings, "streak_ticket_bonus_enabled", False)):
            return

        streak_days = int(getattr(user, "play_streak", 0) or 0)
        if streak_days not in (4, 5):
            return

        # Spec (fixed): Day4~5
        # - Lottery ticket: 1
        # - Roulette ticket (ROULETTE_COIN): 2
        from app.services.game_wallet_service import GameWalletService

        wallet_service = GameWalletService()
        meta = {
            "reason": "STREAK_TICKET_BONUS",
            "streak_days": streak_days,
            "play_day": play_day.isoformat(),
        }

        wallet_service.grant_tokens(
            self.db,
            user_id=int(user.id),
            token_type=GameTokenType.LOTTERY_TICKET,
            amount=1,
            reason="STREAK_TICKET_BONUS",
            label=f"STREAK_DAY_{streak_days}_TICKET_BONUS",
            meta=meta,
            auto_commit=False,
        )
        wallet_service.grant_tokens(
            self.db,
            user_id=int(user.id),
            token_type=GameTokenType.ROULETTE_COIN,
            amount=2,
            reason="STREAK_TICKET_BONUS",
            label=f"STREAK_DAY_{streak_days}_TICKET_BONUS",
            meta=meta,
            auto_commit=False,
        )

    def get_streak_info(self, user_id: int) -> dict:
        user = self.db.query(User).filter(User.id == user_id).first()
        if not user:
            return {
                "streak_days": 0,
                "current_multiplier": 1.0,
                "is_hot": False,
                "is_legend": False,
                "next_milestone": int(getattr(self.settings, "streak_hot_threshold_days", 3) or 3),
            }

        streak_days = int(user.play_streak or 0)
        hot_threshold = int(getattr(self.settings, "streak_hot_threshold_days", 3) or 3)
        legend_threshold = int(getattr(self.settings, "streak_legend_threshold_days", 7) or 7)

        is_hot = streak_days >= hot_threshold
        is_legend = streak_days >= legend_threshold
        current_multiplier = self._active_streak_vault_bonus_multiplier(user=user)

        if streak_days < hot_threshold:
            next_milestone = hot_threshold - streak_days
        elif streak_days < legend_threshold:
            next_milestone = legend_threshold - streak_days
        else:
            next_milestone = 0

        return {
            "streak_days": streak_days,
            "current_multiplier": current_multiplier,
            "is_hot": is_hot,
            "is_legend": is_legend,
            "next_milestone": next_milestone,
        }

    def _active_streak_vault_bonus_multiplier(self, *, user: User) -> float:
        """Return the currently-active streak vault bonus multiplier.

        For time-windowed bonuses (e.g., 1h/4h), the bonus becomes active starting from
        the first eligible base-game play of the operational day.
        """
        if not bool(getattr(self.settings, "streak_vault_bonus_enabled", False)):
            return 1.0

        streak_days = int(getattr(user, "play_streak", 0) or 0)
        if streak_days == 2:
            multiplier, duration_hours = 1.2, 1
        elif streak_days == 3:
            multiplier, duration_hours = 1.2, 4
        elif streak_days == 6:
            multiplier, duration_hours = 1.5, 1
        elif streak_days >= 7:
            return 2.0
        else:
            return 1.0

        # Time-windowed bonuses depend on whether the daily window has started.
        op_date = self._operational_play_date(self._now_tz())
        if getattr(user, "streak_vault_bonus_date", None) != op_date:
            return 1.0

        start_at = getattr(user, "streak_vault_bonus_started_at", None)
        if start_at is None:
            return 1.0

        # `streak_vault_bonus_started_at` is stored as naive UTC.
        start_utc = start_at.replace(tzinfo=timezone.utc)
        now_utc = self._now_tz().astimezone(timezone.utc)
        if now_utc <= start_utc + timedelta(hours=int(duration_hours)):
            return float(multiplier)
        return 1.0

    def _streak_multiplier(self, user: User) -> float:
        if not bool(getattr(self.settings, "streak_multiplier_enabled", False)):
            return 1.0

        streak_days = int(user.play_streak or 0)
        legend_threshold = int(getattr(self.settings, "streak_legend_threshold_days", 7) or 7)
        hot_threshold = int(getattr(self.settings, "streak_hot_threshold_days", 3) or 3)

        if streak_days >= legend_threshold:
            return float(getattr(self.settings, "streak_legend_multiplier", 1.5) or 1.5)
        if streak_days >= hot_threshold:
            return float(getattr(self.settings, "streak_hot_multiplier", 1.2) or 1.2)
        return 1.0

    def get_reset_date_str(self, category: MissionCategory) -> str:
        """Returns the reset key string based on category and current KST time."""
        # Enforce KST (UTC+9)
        from datetime import timezone
        
        kst_tz = timezone(timedelta(hours=9))
        now = datetime.now(kst_tz)
        
        if category == MissionCategory.DAILY:
            return now.strftime("%Y-%m-%d")
        elif category == MissionCategory.WEEKLY:
            # ISO Year + Week Number
            year, week, _ = now.isocalendar()
            return f"{year}-W{week:02d}"
        else:
            return "STATIC"

    def get_user_missions(self, user_id: int) -> List[dict]:
        """
        Returns a list of missions with the user's current progress.
        Ideally returns a Pydantic schema list, but for now returning dicts for flexibility.
        """
        missions = self.db.query(Mission).filter(Mission.is_active == True).all()
        result = []
        now_tz = self._now_tz()

        for mission in missions:
            if self._is_golden_hour_mission(mission) and not self.settings.golden_hour_enabled:
                continue
            if not self._within_time_window(mission, now_tz):
                # Hide out-of-window missions from list
                continue
            reset_date = self.get_reset_date_str(mission.category)
            
            progress = self.db.query(UserMissionProgress).filter(
                UserMissionProgress.user_id == user_id,
                UserMissionProgress.mission_id == mission.id,
                UserMissionProgress.reset_date == reset_date
            ).first()

            if not progress:
                # Init virtual progress object for frontend
                progress_dict = {
                    "current_value": 0,
                    "is_completed": False,
                    "is_claimed": False,
                    "approval_status": "NONE"
                }
            else:
                progress_dict = {
                    "current_value": progress.current_value,
                    "is_completed": progress.is_completed,
                    "is_claimed": progress.is_claimed,
                    "approval_status": progress.approval_status
                }

            result.append({
                "mission": {
                    "id": mission.id,
                    "title": mission.title,
                    "description": mission.description,
                    "category": mission.category,
                    "logic_key": mission.logic_key,
                    "action_type": mission.action_type,
                    "target_value": mission.target_value,
                    "reward_type": mission.reward_type,
                    "reward_amount": mission.reward_amount,
                    "xp_reward": mission.xp_reward,
                    "requires_approval": mission.requires_approval,
                    "start_time": mission.start_time.isoformat(timespec="minutes") if mission.start_time else None,
                    "end_time": mission.end_time.isoformat(timespec="minutes") if mission.end_time else None,
                    "auto_claim": mission.auto_claim,
                    "is_active": mission.is_active
                },
                "progress": progress_dict
            })
        
        return result

    def update_progress(self, user_id: int, action_type: str, delta: int = 1) -> List[UserMissionProgress]:
        """
        Updates progress for ALL active missions matching the action_type (e.g., 'PLAY_GAME').
        Also falls back to logic_key for legacy support.
        Returns list of updated progress objects.
        """
        missions = self.db.query(Mission).filter(
            or_(Mission.action_type == action_type, Mission.logic_key == action_type), 
            Mission.is_active == True
        ).all()

        updated_list = []
        
        now_tz = self._now_tz()

        # Play streak sync is tied to actual game play actions.
        if action_type == "PLAY_GAME" and delta > 0:
            try:
                self.sync_play_streak(user_id=user_id, now_tz=now_tz)
            except Exception:
                # Do not block mission progress updates if streak sync fails.
                pass

        for mission in missions:
            if self._is_golden_hour_mission(mission) and not self.settings.golden_hour_enabled:
                continue
            if not self._within_time_window(mission, now_tz):
                continue
            reset_date = self.get_reset_date_str(mission.category)
            
            progress = self.db.query(UserMissionProgress).filter(
                UserMissionProgress.user_id == user_id,
                UserMissionProgress.mission_id == mission.id,
                UserMissionProgress.reset_date == reset_date
            ).first()

            if not progress:
                progress = UserMissionProgress(
                    user_id=user_id,
                    mission_id=mission.id,
                    current_value=0,
                    reset_date=reset_date
                )
                self.db.add(progress)
            
            if not progress.is_completed:
                progress.current_value += delta
                
                # Check completion
                if progress.current_value >= mission.target_value:
                    progress.current_value = mission.target_value
                    progress.is_completed = True
                    progress.completed_at = datetime.utcnow()

                    # Auto-claim flow for eligible missions
                    if mission.auto_claim:
                        try:
                            self.claim_reward(user_id, mission.id)
                        except Exception:
                            # Do not block progress commit
                            pass
                
                # [Nudge] Intelligent Trigger: 1 step remaining
                elif progress.current_value == mission.target_value - 1 and mission.target_value >= 3:
                     # Check if user has telegram_id
                     if progress.user and progress.user.telegram_id:
                         try:
                             from app.services.notification_service import NotificationService
                             NotificationService().send_nudge_sync(
                                 chat_id=progress.user.telegram_id, 
                                 mission_title=mission.title, 
                                 remaining=1
                             )
                         except Exception as e:
                             # Fail silently for nudge; do not block game progress
                             pass

                updated_list.append(progress)
            
        self.db.commit()
        # Refresh all updated (optional, careful with performance if many)
        for p in updated_list:
            self.db.refresh(p)
            
        return updated_list

    def claim_reward(self, user_id: int, mission_id: int) -> Tuple[bool, str, int]:
        """
        Claim reward for a completed mission.
        Returns (Success, RewardType, Amount).
        """
        mission = self.db.query(Mission).filter(Mission.id == mission_id).first()
        if not mission:
            return False, "Mission not found", 0

        if self._is_golden_hour_mission(mission) and not self.settings.golden_hour_enabled:
            return False, "Mission disabled by feature flag", 0

        now_tz = self._now_tz()
        if not self._within_time_window(mission, now_tz):
            return False, "Mission not in active time window", 0

        reset_date = self.get_reset_date_str(mission.category)
        progress = self.db.query(UserMissionProgress).filter(
            UserMissionProgress.user_id == user_id,
            UserMissionProgress.mission_id == mission_id,
            UserMissionProgress.reset_date == reset_date
        ).with_for_update().first()

        if not progress or not progress.is_completed:
            return False, "Mission not completed", 0
        
        if progress.is_claimed:
            return False, "Already claimed", 0

        user = self.db.query(User).filter(User.id == user_id).first()
        if not user:
            return False, "User not found", 0

        # Reward amounts are currently not modified by play streak.
        # (Streak-based reward shaping is being redesigned.)
        reward_amount = mission.reward_amount
        xp_reward = mission.xp_reward

        # 1. Give Rewards (Assets)
        if mission.reward_type != MissionRewardType.NONE and reward_amount > 0:
            # --- CASH_UNLOCK (New User Bonus) ---
                # --- CASH_UNLOCK (Converted to Vault Accumulation) ---
            if mission.reward_type == MissionRewardType.CASH_UNLOCK:
                # REFACTOR: Instead of unlocking existing funds, we ACCRUE new funds.
                # This matches the "New User Welcome Mission" requirement (2500 KRW * 4 = 10000 KRW).
                try:
                    from app.services.vault_service import VaultService
                    VaultService().accrue_mission_reward(
                        self.db,
                        user_id=user.id,
                        mission_id=mission.id,
                        mission_title=mission.title,
                        amount=reward_amount
                    )
                except Exception as e:
                    # Log error but don't fail the claim entirely if possible, 
                    # or fail safe? Since money is involved, let's log.
                    print(f"Failed to accrue mission reward: {e}")
                    # Depending on policy, might want to return False here.
                    # For now, proceeding as if claimed (worst case user complains and we fix manual)
                    # But actually, let's allow retry if it fails.
                    pass
            
            # --- STANDARD TOKENS ---
            else:
                from app.services.game_wallet_service import GameWalletService
                from app.services.inventory_service import InventoryService
                
                token_type_map = {
                    MissionRewardType.DIAMOND: GameTokenType.DIAMOND,
                    MissionRewardType.GOLD_KEY: GameTokenType.GOLD_KEY,
                    MissionRewardType.DIAMOND_KEY: GameTokenType.DIAMOND_KEY,
                    MissionRewardType.TICKET_BUNDLE: GameTokenType.LOTTERY_TICKET,
                }
                
                wallet_service = GameWalletService()
                target_token = token_type_map.get(mission.reward_type)
                
                if target_token:
                    # Phase 2 rule: DIAMOND is Inventory SoT (not wallet).
                    if target_token == GameTokenType.DIAMOND:
                        InventoryService.grant_item(
                            self.db,
                            user_id=user_id,
                            item_type="DIAMOND",
                            amount=reward_amount,
                            reason="MISSION_REWARD",
                            related_id=str(mission.id),
                            auto_commit=False,
                        )
                    else:
                        wallet_service.grant_tokens(
                            self.db,
                            user_id=user_id,
                            token_type=target_token,
                            amount=reward_amount,
                            reason="MISSION_REWARD",
                            label=mission.title,
                            auto_commit=False,
                        )

        # 2. Give XP (Season Pass) - OPTIONAL based on Master Design (Unified Economy v2.1)
        # Missions primarily reward DIAMONDS. XP is reserved for Deposits.
        # This logic is kept for "Special" missions if needed, but should default to 0.
        if xp_reward > 0:
            from app.services.season_pass_service import SeasonPassService
            SeasonPassService().add_bonus_xp(
                self.db, 
                user_id=user_id, 
                xp_amount=xp_reward
            )

        progress.is_claimed = True
        self.db.commit()
        
        return True, mission.reward_type, reward_amount

    def claim_daily_gift(self, user_id: int) -> Tuple[bool, str, int]:
        """
        Special logic for 'Daily Login Gift'.
        Uses a virtual/hidden mission with logic_key='daily_gift'.
        """
        # 1. Fetch or create the daily_gift mission template if it doesn't exist
        # In production, this should be seeded, but here we'll be defensive
        mission = self.db.query(Mission).filter(Mission.logic_key == "daily_gift").first()
        if not mission:
            mission = Mission(
                title="일일 출석 선물",
                description="매일 접속 시 드리는 선물입니다.",
                category=MissionCategory.DAILY,
                logic_key="daily_gift",
                action_type="daily_gift", # Set explicit action_type
                target_value=1,
                reward_type=MissionRewardType.DIAMOND,
                reward_amount=500,
                is_active=True
            )
            self.db.add(mission)
            self.db.commit()
            self.db.refresh(mission)
        
        # Ensure older seeded daily_gift has action_type if missing?
        if not mission.action_type:
             mission.action_type = "daily_gift"
             self.db.commit()

        # 2. Update progress to 1 (since they are calling this, they are logged in)
        self.update_progress(user_id, "daily_gift", delta=1)

        # 3. Try to claim
        return self.claim_reward(user_id, mission.id)
