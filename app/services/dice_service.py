"""Dice service implementing status and play flows."""
from datetime import date, datetime
import random

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.exceptions import InvalidConfigError
from app.core.config import get_settings
from app.models.dice import DiceConfig, DiceLog
from app.models.feature import FeatureType
from app.models.game_wallet import GameTokenType
from app.schemas.dice import DicePlayResponse, DiceResult, DiceStatusResponse
from app.services.feature_service import FeatureService
from app.services.game_common import GamePlayContext, log_game_play
from app.services.game_wallet_service import GameWalletService
from app.services.reward_service import RewardService
from app.services.season_pass_service import SeasonPassService
from app.services.vault_service import VaultService


class DiceService:
    """Encapsulates dice gameplay."""

    BASE_GAME_XP = 0
    WIN_GAME_XP = 5

    def __init__(self) -> None:
        self.feature_service = FeatureService()
        self.reward_service = RewardService()
        self.wallet_service = GameWalletService()
        self.season_pass_service = SeasonPassService()
        self.vault_service = VaultService()

    def _get_today_config(self, db: Session) -> DiceConfig:
        config = db.execute(select(DiceConfig).where(DiceConfig.is_active.is_(True))).scalar_one_or_none()
        if config is None:
            raise InvalidConfigError("DICE_CONFIG_MISSING")
        return config

    @staticmethod
    def _validate_dice_values(values: list[int]) -> None:
        if any(v < 1 or v > 6 for v in values):
            raise InvalidConfigError("INVALID_DICE_RESULT")

    def _is_event_active(self, db: Session, user_id: int, today_plays: int) -> bool:
        """Check if Dice Event is active for the user."""
        from app.services.vault2_service import Vault2Service
        vault2_service = Vault2Service()
        
        # 1. Check Config
        game_earn_config = vault2_service.get_config_value(db, "game_earn_config", {})
        dice_event_probs = vault2_service.get_config_value(db, "probability", {}).get("DICE")
        is_active = bool(dice_event_probs and game_earn_config.get("DICE"))
        
        if not is_active:
            return False

        # 2. Check Config File Active Flag (if strictly required, but 'probability' existence implies active in current logic)
        # Note: Admin UI sets 'is_active' boolean at root of DiceEventParams? 
        # Actually in AdminDiceApi we have structure. 
        # But Vault2Service.get_config_value retrieves parts of config_json.
        # Let's assume presence of valid probability config implies active as per previous logic.
        
        # 3. Eligibility (Blacklist)
        eligibility = vault2_service.get_config_value(db, "eligibility", {})
        from app.models.admin_user_profile import AdminUserProfile
        profile = db.query(AdminUserProfile).filter(AdminUserProfile.user_id == user_id).first()
        if profile and profile.tags:
            blocklist = set(eligibility.get("tags", {}).get("blocklist", []))
            user_tags = set(profile.tags)
            if not user_tags.isdisjoint(blocklist):
                return False

        # 4. Caps (Daily Plays)
        event_caps = vault2_service.get_config_value(db, "caps", {}).get("DICE")
        if event_caps:
            daily_plays_cap = event_caps.get("daily_plays")
            if daily_plays_cap is not None:
                if today_plays >= int(daily_plays_cap):
                    return False
        
        return True

    def get_status(self, db: Session, user_id: int, today: date) -> DiceStatusResponse:
        self.feature_service.validate_feature_active(db, today, FeatureType.DICE)
        config = self._get_today_config(db)
        token_type = GameTokenType.DICE_TOKEN
        token_balance = self.wallet_service.get_balance(db, user_id, token_type)

        today_plays = db.execute(
            select(func.count()).select_from(DiceLog).where(
                DiceLog.user_id == user_id,
                DiceLog.config_id == config.id,
                func.date(DiceLog.created_at) == today,
            )
        ).scalar_one()
        
        # Check Event Status
        event_active = self._is_event_active(db, user_id, today_plays)

        # Daily cap removed: use 0 to denote unlimited.
        unlimited = 0
        remaining = 0

        return DiceStatusResponse(
            config_id=config.id,
            name=config.name,
            max_daily_plays=unlimited,
            today_plays=today_plays,
            remaining_plays=remaining,
            token_type=token_type.value,
            token_balance=token_balance,
            feature_type=FeatureType.DICE,
            event_active=event_active,
        )

    def play(self, db: Session, user_id: int, now: date | datetime) -> DicePlayResponse:
        today = now.date() if isinstance(now, datetime) else now
        self.feature_service.validate_feature_active(db, today, FeatureType.DICE)
        config = self._get_today_config(db)
        token_type = GameTokenType.DICE_TOKEN

        today_plays = db.execute(
            select(func.count()).select_from(DiceLog).where(
                DiceLog.user_id == user_id,
                DiceLog.config_id == config.id,
                func.date(DiceLog.created_at) == today,
            )
        ).scalar_one()

        # --- Event Mode Checking ---
        is_event_active = self._is_event_active(db, user_id, today_plays)
        
        print(f"DEBUG: is_event_active post-cap={is_event_active}")

        # 3. Decision Logic
        outcome = "LOSE" 
        reward_type = config.lose_reward_type
        reward_amount = config.lose_reward_amount
        mode = "NORMAL"

        if is_event_active:
            mode = "EVENT"
            # Event Mode: Weighted RNG
            p_win = dice_event_probs.get("p_win", 0.35)
            p_draw = dice_event_probs.get("p_draw", 0.10)
            p_lose = dice_event_probs.get("p_lose", 0.55)
            
            # Normalize just in case
            total_p = p_win + p_draw + p_lose
            if total_p <= 0:
                 # Fallback to normal if config error
                 mode = "NORMAL"
            else:
                 outcomes = ["WIN", "DRAW", "LOSE"]
                 weights = [p_win, p_draw, p_lose]
                 outcome = random.choices(outcomes, weights=weights, k=1)[0]
                 
                 # Set Rewards from Event Config
                 event_rewards = game_earn_config.get("DICE", {})
                 event_reward_amount = event_rewards.get(outcome)
                 if event_reward_amount is not None:
                     # For dice service response, we still report what the DiceConfig says for "visual" consistency?
                     # OR do we override the returned reward amount too?
                     # The Build Spec says: "VaultService... uses payout_raw.reward_amount... DiceService reports result+reward_amount"
                     # So we should probably override the reward_amount here for the API response too.
                     reward_amount = int(event_reward_amount)
                     reward_type = "NONE" # Usually event mode rewards are Vault accruals only
                 
        if mode == "NORMAL":
             # Standard Pure RNG
             user_dice = [random.randint(1, 6), random.randint(1, 6)]
             dealer_dice = [random.randint(1, 6), random.randint(1, 6)]
             user_sum = sum(user_dice)
             dealer_sum = sum(dealer_dice)
             
             if user_sum > dealer_sum:
                 outcome = "WIN"
                 reward_type = config.win_reward_type
                 reward_amount = config.win_reward_amount
             elif user_sum == dealer_sum:
                 outcome = "DRAW"
                 reward_type = config.draw_reward_type
                 reward_amount = config.draw_reward_amount
             else:
                 outcome = "LOSE"
                 reward_type = config.lose_reward_type
                 reward_amount = config.lose_reward_amount

        else:
             # Event Mode: Generate Dice to match Outcome
             if outcome == "WIN":
                 # Generate until User > Dealer
                 # Optimization: Generate Dealer first (low), then User (high)
                 while True:
                     d1, d2 = random.randint(1, 6), random.randint(1, 6)
                     u1, u2 = random.randint(1, 6), random.randint(1, 6)
                     if (u1+u2) > (d1+d2):
                         user_dice, dealer_dice = [u1, u2], [d1, d2]
                         break
             elif outcome == "DRAW":
                  while True:
                     d1, d2 = random.randint(1, 6), random.randint(1, 6)
                     u1, u2 = random.randint(1, 6), random.randint(1, 6)
                     if (u1+u2) == (d1+d2):
                         user_dice, dealer_dice = [u1, u2], [d1, d2]
                         break
             else: # LOSE
                  while True:
                     d1, d2 = random.randint(1, 6), random.randint(1, 6)
                     u1, u2 = random.randint(1, 6), random.randint(1, 6)
                     if (u1+u2) < (d1+d2):
                         user_dice, dealer_dice = [u1, u2], [d1, d2]
                         break
             
             user_sum = sum(user_dice)
             dealer_sum = sum(dealer_dice)


        # Guardrails: enforce dice value range in case of RNG/provider change.
        self._validate_dice_values(user_dice)
        self._validate_dice_values(dealer_dice)

        _, consumed_trial = self.wallet_service.require_and_consume_token(
            db,
            user_id,
            token_type,
            amount=1,
            reason="DICE_PLAY",
            label=f"{config.name} - {outcome}",
            meta={"result": outcome, "mode": mode},
        )

        log_entry = DiceLog(
            user_id=user_id,
            config_id=config.id,
            user_dice_1=user_dice[0],
            user_dice_2=user_dice[1],
            user_sum=user_sum,
            dealer_dice_1=dealer_dice[0],
            dealer_dice_2=dealer_dice[1],
            dealer_sum=dealer_sum,
            result=outcome,
            reward_type=reward_type,
            reward_amount=reward_amount,
        )
        db.add(log_entry)
        db.commit()
        db.refresh(log_entry)

        # [Mission] Update progress (includes streak sync). Do this before Vault accrual so
        # streak-based vault bonuses apply immediately on the same play.
        from app.services.mission_service import MissionService
        MissionService(db).update_progress(user_id, "PLAY_GAME")

        total_earn = 0
        # Vault Phase 1: idempotent game accrual (safe-guarded by feature flag).
        total_earn += self.vault_service.record_game_play_earn_event(
            db,
            user_id=user_id,
            game_type=FeatureType.DICE.value,
            game_log_id=log_entry.id,
            token_type=token_type.value,
            outcome=outcome,
            payout_raw={
                "result": outcome,
                "reward_type": reward_type,
                "reward_amount": reward_amount,
                "mode": mode,
            },
        )

        # Trial: optionally route reward into Vault instead of direct payout.
        settings = get_settings()
        if consumed_trial and bool(getattr(settings, "enable_trial_payout_to_vault", False)):
            total_earn += self.vault_service.record_trial_result_earn_event(
                db,
                user_id=user_id,
                game_type=FeatureType.DICE.value,
                game_log_id=log_entry.id,
                token_type=token_type.value,
                reward_type=reward_type,
                reward_amount=reward_amount,
                payout_raw={"result": outcome},
            )

        xp_award = self.WIN_GAME_XP if outcome == "WIN" else self.BASE_GAME_XP
        ctx = GamePlayContext(user_id=user_id, feature_type=FeatureType.DICE.value, today=today)
        log_game_play(
            ctx,
            db,
            {
                "result": outcome,
                "reward_type": reward_type,
                "reward_amount": reward_amount,
                "reward_label": f"{config.name} - {outcome}",
                "xp_from_reward": xp_award,
                "mode": mode,
            },
        )

        if not (consumed_trial and bool(getattr(settings, "enable_trial_payout_to_vault", False))):
            self.reward_service.deliver(
                db,
                user_id=user_id,
                reward_type=reward_type,
                reward_amount=reward_amount,
                meta={"reason": "dice_play", "outcome": outcome, "game_xp": xp_award},
            )
        if outcome == "WIN":
            self.season_pass_service.maybe_add_internal_win_stamp(db, user_id=user_id, now=today)

        # 게임 설정 포인트를 레벨 XP 보너스로 반영
        season_pass = None  # 게임 1회당 자동 스탬프 발급을 중단하고, 조건 달성 시 별도 로직으로 처리

        return DicePlayResponse(
            result="OK",
            game=DiceResult(
                user_dice=user_dice,
                dealer_dice=dealer_dice,
                user_sum=user_sum,
                dealer_sum=dealer_sum,
                outcome=outcome,
                reward_type=reward_type,
                reward_amount=reward_amount,
            ),
            season_pass=season_pass,
            vault_earn=total_earn,
        )
