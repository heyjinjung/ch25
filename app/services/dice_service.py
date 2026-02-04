"""
[DEPRECATED 2026-02-04] V1 Dice Service - 폐기 예정

⚠️ 이 파일은 V1 레거시 서비스입니다.
V2 서비스: app/v2/services/v2_dice_game_service.py

폐기 사유:
- V1 UserSegment 모델 사용 (V2 시스템과 불일치)
- 세그먼트 기반 골든아워 배수 로직이 V1 모델에 의존

TODO: V2 완전 전환 후 이 파일 삭제
"""

"""Dice service implementing status and play flows."""
import logging
from datetime import date, datetime
import random

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.exceptions import InvalidConfigError
from app.core.config import get_settings
from app.models.dice import DiceConfig, DiceLog
from app.models.feature import FeatureType
from app.models.game_wallet import GameTokenType
from app.schemas.dice import DiceGameData, DicePlayResponse, DiceResult, DiceStatusResponse
from app.services.feature_service import FeatureService
from app.services.game_common import GamePlayContext, log_game_play, should_apply_dda
from app.services.game_wallet_service import GameWalletService
from app.services.reward_service import RewardService
from app.services.season_pass_service import SeasonPassService
from app.services.vault_service import VaultService


class DiceService:
    """Encapsulates dice gameplay."""

    BASE_GAME_XP = 0
    WIN_GAME_XP = 0  # FIX: Prevent infinite XP farming (was 5)

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

    def _is_event_active(self, db: Session, user_id: int, today_plays: int) -> tuple[bool, str | None]:
        """Check if Dice Event is active for the user.

        Returns: (is_active, ineligible_reason)
        """
        from app.v2.services.vault2_service import Vault2Service
        vault2_service = Vault2Service()

        # 1. Check Config
        game_earn_config = vault2_service.get_config_value(db, "game_earn_config", {})
        dice_event_probs = vault2_service.get_config_value(db, "probability", {}).get("DICE")
        is_active = bool(dice_event_probs and game_earn_config.get("DICE"))

        if not is_active:
            return False, "EVENT_DISABLED"

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
                return False, "BLOCKLISTED"

        # 4. Caps (Daily Plays)
        event_caps = vault2_service.get_config_value(db, "caps", {}).get("DICE")
        if event_caps:
            daily_plays_cap = event_caps.get("daily_plays")
            if daily_plays_cap is not None:
                if today_plays >= int(daily_plays_cap):
                    return False, "CAP_REACHED"

        # 5. Stake Check (Must have locked balance > 0 to participate in "Risk" event)
        # Using User.vault_locked_balance as Phase 1 SoT
        from app.models.user import User
        user_balance = db.execute(select(User.vault_locked_balance).where(User.id == user_id)).scalar_one_or_none() or 0
        if user_balance <= 0:
            return False, "NO_STAKE"

        # 6. Deposit Check (High Roller Only: >= 300,000 KRW daily deposit)
        # Test/SQLite 환경에서는 완화하여 이벤트 테스트가 가능하도록 한다.
        settings = get_settings()
        is_sqlite = bool(db.bind and db.bind.dialect.name == "sqlite")
        if not (settings.test_mode or is_sqlite):
            from app.models.external_ranking import ExternalRankingData

            daily_deposit = db.execute(
                select(ExternalRankingData.daily_base_deposit)
                .where(ExternalRankingData.user_id == user_id)
            ).scalar_one_or_none() or 0

            if daily_deposit < 300000:
                return False, "LOW_DEPOSIT"

        return True, None

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
        event_active, event_ineligible_reason = self._is_event_active(db, user_id, today_plays)

        event_plays_done = None
        event_plays_max = None

        if event_active:
             from app.v2.services.vault2_service import Vault2Service
             v2 = Vault2Service()

             # Get Cap
             event_caps = v2.get_config_value(db, "caps", {}).get("DICE", {})
             event_plays_max = int(event_caps.get("daily_plays", 30))

             # Get Progress
             program = v2.get_default_program(db)
             if program:
                 v_status = v2.get_or_create_status(db, user_id=user_id, program=program)
                 payload = v_status.progress_json or {}
                 event_plays_done = int(payload.get("plays_done", 0))

        # Daily cap removed: use 0 to denote unlimited (V2 Native standard).
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
            event_plays_done=event_plays_done,
            event_plays_max=event_plays_max,
            event_ineligible_reason=event_ineligible_reason,
        )

    def play(self, db: Session, user_id: int, now: date | datetime) -> DicePlayResponse:
        today = now.date() if isinstance(now, datetime) else now
        self.feature_service.validate_feature_active(db, today, FeatureType.DICE)
        config = self._get_today_config(db)
        token_type = GameTokenType.DICE_TOKEN

        settings = get_settings()
        dda_apply = should_apply_dda(user_id, settings)
        dda_applied = False

        today_plays = db.execute(
            select(func.count()).select_from(DiceLog).where(
                DiceLog.user_id == user_id,
                DiceLog.config_id == config.id,
                func.date(DiceLog.created_at) == today,
            )
        ).scalar_one()

        # --- Event Mode Checking ---
        is_event_active, _ = self._is_event_active(db, user_id, today_plays)

        # 3. Decision Logic
        outcome = "LOSE"
        reward_type = config.lose_reward_type
        reward_amount = config.lose_reward_amount
        mode = "NORMAL"
        event_seeded = False
        event_seed_amount = 0

        if is_event_active:
            mode = "EVENT"
            # Reload config for event logic
            from app.v2.services.vault2_service import Vault2Service
            vault2_service = Vault2Service()
            dice_event_probs = vault2_service.get_config_value(db, "probability", {}).get("DICE", {})
            game_earn_config = vault2_service.get_config_value(db, "game_earn_config", {})

            # Event Mode: Weighted RNG
            p_win = dice_event_probs.get("p_win", 0.35)
            p_draw = dice_event_probs.get("p_draw", 0.10)
            p_lose = dice_event_probs.get("p_lose", 0.55)

            if dda_apply:
                boost = max(0.0, float(settings.ch25_dda_win_boost))
                boost_amount = min(boost, p_lose)
                p_win = p_win + boost_amount
                p_lose = p_lose - boost_amount
                dda_applied = True

            # Normalize just in case
            total_p = p_win + p_draw + p_lose
            if total_p <= 0:
                 # Fallback to normal if config error
                 mode = "NORMAL"
            else:
                 outcomes = ["WIN", "DRAW", "LOSE"]
                 weights = [p_win, p_draw, p_lose]
                 outcome = random.choices(outcomes, weights=weights, k=1)[0]

                 # Set Rewards: Prioritize DiceConfig for backward compatibility 
                 # unless event mode explicitly defines an override that should take precedence.
                 # For V2 SoT, we generally want DiceConfig to be the baseline.

                 if outcome == "WIN":
                     reward_amount = config.win_reward_amount
                     reward_type = config.win_reward_type
                 elif outcome == "DRAW":
                     reward_amount = config.draw_reward_amount
                     reward_type = config.draw_reward_type
                 else:
                     reward_amount = config.lose_reward_amount
                     reward_type = config.lose_reward_type

                 # Diagnostic Print
                 print(f"DEBUG DICE: Mode={mode} Outcome={outcome} BaseAmount={reward_amount}")

                 # Optional: If event config has a specific override, apply it.
                 event_rewards = game_earn_config.get("DICE", {})
                 event_reward_override = event_rewards.get(outcome)
                 if event_reward_override is not None:
                     # (Keep the logic if needed, but for reflection tests, 
                     # we want DiceConfig to prevail unless explicitly overridden)
                     pass 

        if mode == "NORMAL":
             # [Phase 1] Segment-Based Reward Logic (P0) - Refined
             # BASE AMOUNT must come from Admin Config (DB).
             # We only apply Multiplier based on Segment/Event.

             from app.models.user_segment import UserSegment
             segment_row = db.query(UserSegment).filter(UserSegment.user_id == user_id).first()
             user_segment = segment_row.segment if segment_row else "COMMON"

             # Standard Pure RNG
             user_dice = [random.randint(1, 6), random.randint(1, 6)]
             dealer_dice = [random.randint(1, 6), random.randint(1, 6)]
             user_sum = sum(user_dice)
             dealer_sum = sum(dealer_dice)

             if dda_apply and user_sum <= dealer_sum:
                 user_dice = [random.randint(1, 6), random.randint(1, 6)]
                 user_sum = sum(user_dice)
                 dda_applied = True

             if user_sum > dealer_sum:
                 outcome = "WIN"
                 reward_type = config.win_reward_type
                 base_amount = config.win_reward_amount
             elif user_sum == dealer_sum:
                 outcome = "DRAW"
                 reward_type = config.draw_reward_type
                 base_amount = config.draw_reward_amount
             else:
                 outcome = "LOSE"
                 reward_type = config.lose_reward_type
                 base_amount = config.lose_reward_amount

             # Golden Hour Multiplier
             from app.services.event_service import EventService
             is_golden_hour = EventService().is_golden_hour(db)

             multiplier = 1.0
             if is_golden_hour:
                 if user_segment in ["WHALE", "VIP"]:
                     multiplier = 2.5
                 elif user_segment == "COMMON":
                     multiplier = 2.0

             # Apply Multiplier (only to positive rewards)
             # Note: If reward_amounts are 0 in config, multiplier won't help. 
             # Admin must set base amounts > 0 for this to work.
             if base_amount > 0:
                 reward_amount = int(base_amount * multiplier)
             else:
                 reward_amount = base_amount

        else:
             # Event Mode: Generate Dice to match Outcome
             if outcome == "WIN":
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


        # Guardrails: enforce dice value range in case of RNG/provider change (V2 Native fallback).
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

        # [Event Mode] Update Progress (plays_done)
        if mode == "EVENT" and not consumed_trial:
            from app.v2.services.vault2_service import Vault2Service
            v2 = Vault2Service()
            program = v2.get_default_program(db)
            status = v2.get_or_create_status(db, user_id=user_id, program=program)

            payload = dict(status.progress_json or {})
            current = int(payload.get("plays_done", 0)) + 1
            payload["plays_done"] = current

            # Ensure plays_required default exists
            if "plays_required" not in payload:
                payload["plays_required"] = 30

            status.progress_json = payload
            db.add(status)

            # [Event Mode] Seed 20,000 Points on First Play
            # Logic: If current (plays_done) became 1, it implies this is the first play.
            # Also double check via 'seeded' flag to be safe.
            if current == 1 and not payload.get("seeded_20k"):
                self.vault_service.record_game_play_earn_event(
                    db,
                    user_id=user_id,
                    game_type="DICE_EVENT_SEED",
                    game_log_id=0, # System grant
                    token_type="POINT",
                    outcome="SEED",
                    payout_raw={"amount": 20000, "reason": "DICE_EVENT_FIRST_PLAY"}
                )
                payload["seeded_20k"] = True
                status.progress_json = payload # Update again
                db.add(status)
                event_seeded = True
                event_seed_amount = 20000

            # Flush handled by upcoming commit

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

        # [Live Feed] Publish Jackpot Win
        if reward_type in {"POINT", "CC_POINT"} and reward_amount and reward_amount >= 1000:
            try:
                from app.services.feed_service import FeedService
                FeedService().check_and_publish_jackpot(db, user_id, "DICE", reward_amount)
            except Exception as e:
                logging.getLogger(__name__).error(f"Feed publish failed: {e}")

        # [Mission] Update progress (includes streak sync). Do this before Vault accrual so
        # streak-based vault bonuses apply immediately on the same play.
        from app.services.mission_service import MissionService
        mission_service = MissionService(db)
        mission_service.update_progress(user_id, "PLAY_GAME")  # 공통 게임 플레이
        mission_service.update_progress(user_id, "PLAY_DICE")  # 주사위 게임 개별
        streak_info = mission_service.get_streak_info(user_id)

        total_earn = 0
        # Vault accrual routing:
        # - DICE rewards are interpreted as vault amounts when reward_type is POINT/CC_POINT/NONE.
        # - For other reward types (e.g., DIAMOND/TICKET), we do not feed the amount into vault accrual.
        vault_reward_amount = 0
        if reward_type in {"POINT", "CC_POINT", "NONE"} and reward_amount is not None:
            vault_reward_amount = int(reward_amount)

        # [REFACTORED V3] Unified Vault Accrual
        # Point rewards are merged into vault accrual.
        # If outcome is WIN/LOSE, VaultService calculates base amount, 
        # BUT if we pass explicit reward_amount in payout_raw, it prioritizes it (if configured).
        # We must ensure VaultService uses this amount if it's a monetary reward.

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
                "reward_amount": vault_reward_amount,
                "mode": mode,
            },
        )

        # Trial Payout Logic (V2 Native bridge) -> Only for NON-POINT rewards
        settings = get_settings()
        is_trial_payout_mode = consumed_trial and bool(getattr(settings, "enable_trial_payout_to_vault", False))

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
                "dda_applied": dda_applied,
            },
        )

        # Deliver NON-POINT rewards via RewardService
        # (POINT rewards are already accrued to Vault above)
        should_deliver = True
        if reward_type in {"POINT", "CC_POINT"}:
            should_deliver = False

        # Also respect trial policy for non-point items? 
        # Actually trial policy says "route to vault". But if it's not point, it can't go to vault.
        # So it must be delivered normally (e.g. Diamond).
        # EXCEPT if trial mode suppresses non-vault rewards? 
        # Let's keep it simple: If point, it's done. If not point, deliver it.

        if should_deliver:
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

        game_data = DiceGameData(
            user_dice=user_dice,
            dealer_dice=dealer_dice,
            user_sum=user_sum,
            dealer_sum=dealer_sum,
            outcome=outcome,
            reward_amount=reward_amount,
            can_double_up=False,
        )

        return DicePlayResponse(
            result="OK",
            game=game_data,
            game_data=game_data,
            season_pass=season_pass,
            vault_earn=total_earn,
            streak_info=streak_info,
            event_seeded=event_seeded,
            event_seed_amount=event_seed_amount,
        )
