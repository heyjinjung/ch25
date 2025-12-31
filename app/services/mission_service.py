from datetime import datetime, timedelta
from typing import List, Optional, Tuple

from sqlalchemy.orm import Session
from sqlalchemy import and_, or_

from app.models.mission import Mission, UserMissionProgress, MissionCategory, MissionRewardType
from app.models.user import User
from app.models.season_pass import SeasonPassProgress
from app.models.game_wallet import UserGameWallet, GameTokenType
from app.core.config import get_settings

class MissionService:
    def __init__(self, db: Session):
        self.db = db

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

        for mission in missions:
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
                    "is_claimed": False
                }
            else:
                progress_dict = {
                    "current_value": progress.current_value,
                    "is_completed": progress.is_completed,
                    "is_claimed": progress.is_claimed
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
                    "xp_reward": mission.xp_reward
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
        
        for mission in missions:
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
                
                # [Nudge] Intelligent Trigger: 1 step remaining
                elif progress.current_value == mission.target_value - 1 and mission.target_value >= 3:
                     # Check if user has telegram_id
                     if progress.user and progress.user.telegram_id:
                         from app.services.notification_service import NotificationService
                         NotificationService().send_nudge_sync(
                             chat_id=progress.user.telegram_id, 
                             mission_title=mission.title, 
                             remaining=1
                         )

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

        reset_date = self.get_reset_date_str(mission.category)
        progress = self.db.query(UserMissionProgress).filter(
            UserMissionProgress.user_id == user_id,
            UserMissionProgress.mission_id == mission_id,
            UserMissionProgress.reset_date == reset_date
        ).first()

        if not progress or not progress.is_completed:
            return False, "Mission not completed", 0
        
        if progress.is_claimed:
            return False, "Already claimed", 0

        # 1. Give Rewards (Assets)
        if mission.reward_type != MissionRewardType.NONE and mission.reward_amount > 0:
            # --- CASH_UNLOCK (New User Bonus) ---
            if mission.reward_type == MissionRewardType.CASH_UNLOCK:
                now = datetime.utcnow()
                # 1. Check Expiry
                if user.vault_locked_expires_at and user.vault_locked_expires_at < now:
                     # Expired! Cannot unlock.
                     # Still mark as claimed so they don't retry forever?
                     # Or let them claim but get 0? 
                     # Better to let them claim but reward is 0 with a message.
                     # But current return signature is (bool, type, amount).
                     pass 
                elif user.vault_locked_balance and user.vault_locked_balance > 0:
                     unlock_amount = min(user.vault_locked_balance, mission.reward_amount)
                     if unlock_amount > 0:
                         user.vault_locked_balance -= unlock_amount
                         user.cash_balance = (user.cash_balance or 0) + unlock_amount
                         
                         from app.models.user_cash_ledger import UserCashLedger
                         ledger = UserCashLedger(
                             user_id=user.id,
                             delta=unlock_amount,
                             balance_after=user.cash_balance,
                             reason="MISSION_UNLOCK",
                             label=mission.title,
                             meta_json={"mission_id": mission.id}
                         )
                         self.db.add(ledger)
            
            # --- STANDARD TOKENS ---
            else:
                from app.services.game_wallet_service import GameWalletService
                
                token_type_map = {
                    MissionRewardType.DIAMOND: GameTokenType.DIAMOND,
                    MissionRewardType.GOLD_KEY: GameTokenType.GOLD_KEY,
                    MissionRewardType.DIAMOND_KEY: GameTokenType.DIAMOND_KEY,
                    MissionRewardType.TICKET_BUNDLE: GameTokenType.LOTTERY_TICKET,
                }
                
                wallet_service = GameWalletService()
                target_token = token_type_map.get(mission.reward_type)
                
                if target_token:
                    wallet_service.grant_tokens(
                        self.db,
                        user_id=user_id,
                        token_type=target_token,
                        amount=mission.reward_amount,
                        reason="MISSION_REWARD",
                        label=mission.title
                    )

        # 2. Give XP (Season Pass) - OPTIONAL based on Master Design (Unified Economy v2.1)
        # Missions primarily reward DIAMONDS. XP is reserved for Deposits.
        # This logic is kept for "Special" missions if needed, but should default to 0.
        if mission.xp_reward > 0:
            from app.services.season_pass_service import SeasonPassService
            SeasonPassService().add_bonus_xp(
                self.db, 
                user_id=user_id, 
                xp_amount=mission.xp_reward
            )

        progress.is_claimed = True
        self.db.commit()
        
        return True, mission.reward_type, mission.reward_amount

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
