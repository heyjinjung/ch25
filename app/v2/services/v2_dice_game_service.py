"""V2 dice gameplay service (router-independent).

This service intentionally does NOT get wired to any API router yet.
Dice outcome is decided by config probabilities (frontend uses a single die UI).
"""

from __future__ import annotations

import random
from datetime import date, datetime
from zoneinfo import ZoneInfo

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.exceptions import ForbiddenError, InvalidConfigError
from app.models.feature import FeatureType
from app.models.game_wallet import GameTokenType
from app.schemas.dice import DiceGameData, DicePlayResponse, DiceRewardConfig, DiceStatusResponse
from app.v2.services.feature_service import FeatureService
from app.v2.services.game_common import GamePlayContext, log_game_play
from app.v2.services.inventory_service import V2InventoryService
from app.v2.services.mission_service import V2MissionService
from app.v2.services.reward_service import V2RewardService
from app.v2.services.vault_service import V2VaultService
from app.v2.services.event_service import V2EventService
from app.v2.models.v2_dice import V2DiceLog
from app.v2.services.game_config_service import V2GameConfigService


_KST = ZoneInfo("Asia/Seoul")


class V2DiceGameService:
    def __init__(self) -> None:
        self.feature_service = FeatureService()
        self.reward_service = V2RewardService()
        self.vault_service = V2VaultService()

    @staticmethod
    def _operational_date_kst(now: datetime) -> date:
        settings = get_settings()
        reset_hour_raw = getattr(settings, "streak_day_reset_hour_kst", 9)
        reset_hour = int(reset_hour_raw) if reset_hour_raw is not None else 9

        now_kst = now.astimezone(_KST)
        if now_kst.hour < reset_hour:
            return (now_kst.date() - date.resolution)
        return now_kst.date()

    @staticmethod
    def _normalize_ticket_type(ticket_type: str) -> str:
        mapping = {
            "DICE_TOKEN": "DICE_TICKET",
            "TRIAL_TOKEN": "TRIAL_TICKET",
        }
        return mapping.get(ticket_type, ticket_type)

    @staticmethod
    def _ticket_type_aliases(ticket_type: str) -> list[str]:
        normalized = V2DiceGameService._normalize_ticket_type(ticket_type)
        aliases = [normalized]
        reverse = {
            "DICE_TICKET": "DICE_TOKEN",
            "TRIAL_TICKET": "TRIAL_TOKEN",
        }
        if normalized in reverse:
            aliases.append(reverse[normalized])
        return aliases

    @staticmethod
    def _choose_outcome(*, p_win: float, p_draw: float, p_lose: float) -> str:
        weights = [max(float(p_win), 0.0), max(float(p_draw), 0.0), max(float(p_lose), 0.0)]
        total = sum(weights)
        if total <= 0:
            return "LOSE"
        return random.choices(["WIN", "DRAW", "LOSE"], weights=weights, k=1)[0]

    @staticmethod
    def _generate_dice_for_outcome(outcome: str) -> tuple[list[int], list[int]]:
        # V2: Frontend shows only 1 die, so we MUST ensure user_dice[0] vs dealer_dice[0] 
        # matches the determined outcome (WIN/DRAW/LOSE).
        for _ in range(200):
            u1, u2 = random.randint(1, 6), random.randint(1, 6)
            d1, d2 = random.randint(1, 6), random.randint(1, 6)
            
            if outcome == "WIN" and u1 > d1:
                return [u1, u2], [d1, d2]
            if outcome == "DRAW" and u1 == d1:
                return [u1, u2], [d1, d2]
            if outcome == "LOSE" and u1 < d1:
                return [u1, u2], [d1, d2]
        # Fallback: deterministic shaping
        if outcome == "WIN":
            return [6, 6], [1, 1]
        if outcome == "DRAW":
            return [3, 3], [3, 3]
        return [1, 1], [6, 6]

    @staticmethod
    def _is_golden_hour_active(config, now: datetime) -> bool:
        """Check if golden hour is active based on v2_dice_config time settings."""
        if not bool(getattr(config, "enable_golden_hour", False)):
            return False
        
        start_time_str = getattr(config, "golden_hour_start_time", "21:30:00") or "21:30:00"
        end_time_str = getattr(config, "golden_hour_end_time", "22:30:00") or "22:30:00"
        
        now_kst = now.astimezone(_KST) if now.tzinfo else now.replace(tzinfo=_KST)
        current_time_str = now_kst.strftime("%H:%M:%S")
        
        # Handle overnight windows (e.g., 23:00 ~ 01:00)
        if start_time_str <= end_time_str:
            return start_time_str <= current_time_str <= end_time_str
        else:
            # Overnight: active if current >= start OR current <= end
            return current_time_str >= start_time_str or current_time_str <= end_time_str

    def get_status(
        self,
        db: Session,
        *,
        user_id: int,
        now: datetime | None = None,
    ) -> DiceStatusResponse:
        if now is None:
            now = datetime.now(tz=_KST)

        today = self._operational_date_kst(now)
        self.feature_service.validate_feature_active(db, today, FeatureType.DICE)

        try:
            config = V2GameConfigService.get_active_dice_config(db)
        except InvalidConfigError:
            token_balance = V2InventoryService.get_wallet_balance(
                db, user_id, GameTokenType.DICE_TICKET
            )
            reward_config = DiceRewardConfig(
                win_reward_type="POINT",
                win_reward_amount=0,
                draw_reward_type="POINT",
                draw_reward_amount=0,
                lose_reward_type="POINT",
                lose_reward_amount=0,
            )
            return DiceStatusResponse(
                config_id=0,
                name="UNCONFIGURED",
                max_daily_plays=0,
                today_plays=0,
                remaining_plays=0,
                token_type="DICE_TICKET",
                token_balance=int(token_balance or 0),
                feature_type=FeatureType.DICE,
                event_active=False,
                event_plays_done=None,
                event_plays_max=None,
                event_ineligible_reason=None,
                reward_config=reward_config,
            )
        normalized_ticket_type = self._normalize_ticket_type(getattr(config, "ticket_type", "DICE_TICKET"))

        token_type_for_balance = None
        token_balance = 0
        for candidate in self._ticket_type_aliases(normalized_ticket_type):
            try:
                token_type_for_balance = GameTokenType(candidate)
            except Exception:
                continue
            token_balance = V2InventoryService.get_wallet_balance(db, user_id, token_type_for_balance)
            if token_balance:
                break

        if token_type_for_balance is None:
            token_type_for_balance = GameTokenType.DICE_TICKET
            token_balance = V2InventoryService.get_wallet_balance(db, user_id, token_type_for_balance)

        today_plays = db.execute(
            select(func.count())
            .select_from(V2DiceLog)
            .where(
                V2DiceLog.user_id == user_id,
                V2DiceLog.config_id == config.id,
                func.date(V2DiceLog.created_at) == today,
            )
        ).scalar_one()

        unlimited = 0
        remaining = 0

        reward_config = DiceRewardConfig(
            win_reward_type=str(getattr(config, "win_reward_type", "POINT")),
            win_reward_amount=int(getattr(config, "win_reward_amount", 0) or 0),
            draw_reward_type=str(getattr(config, "draw_reward_type", "POINT")),
            draw_reward_amount=int(getattr(config, "draw_reward_amount", 0) or 0),
            lose_reward_type=str(getattr(config, "lose_reward_type", "POINT")),
            lose_reward_amount=int(getattr(config, "lose_reward_amount", 0) or 0),
        )

        return DiceStatusResponse(
            config_id=config.id,
            name=config.name,
            max_daily_plays=unlimited,
            today_plays=int(today_plays),
            remaining_plays=remaining,
            token_type=normalized_ticket_type,
            token_balance=int(token_balance or 0),
            feature_type=FeatureType.DICE,
            event_active=False,
            event_plays_done=None,
            event_plays_max=None,
            event_ineligible_reason=None,
            reward_config=reward_config,
            is_golden_hour=V2EventService().is_golden_hour(db=db, now=now),
        )


    def play(
        self,
        db: Session,
        *,
        user_id: int,
        bet_amount: int = 1,
        prediction: str | None = None,
        now: datetime | date | None = None,
    ) -> DicePlayResponse:
        if now is None:
            now_dt = datetime.now(tz=_KST)
        elif isinstance(now, date) and not isinstance(now, datetime):
            now_dt = datetime(now.year, now.month, now.day, tzinfo=_KST)
        else:
            now_dt = now  # type: ignore[assignment]

        today = self._operational_date_kst(now_dt)
        self.feature_service.validate_feature_active(db, today, FeatureType.DICE)

        # === Strict Vault Policy: benefits_suspended 체크 ===
        is_suspended, _ = V2VaultService.is_benefits_suspended(db, user_id)
        if is_suspended:
            raise ForbiddenError("BENEFITS_SUSPENDED")

        config = V2GameConfigService.get_active_dice_config(db)

        outcome = self._choose_outcome(
            p_win=float(getattr(config, "win_probability", 0.4) or 0.0),
            p_draw=float(getattr(config, "draw_probability", 0.1) or 0.0),
            p_lose=float(getattr(config, "lose_probability", 0.5) or 0.0),
        )

        if outcome == "WIN":
            reward_type = str(config.win_reward_type)
            reward_amount = int(config.win_reward_amount or 0)
        elif outcome == "DRAW":
            reward_type = str(config.draw_reward_type)
            reward_amount = int(config.draw_reward_amount or 0)
        else:
            reward_type = str(config.lose_reward_type)
            reward_amount = int(config.lose_reward_amount or 0)

        golden_active = False
        golden_multiplier = 1.0
        if bool(getattr(config, "enable_golden_hour", False)):
            golden_active = self._is_golden_hour_active(config, now_dt)
            if golden_active:
                golden_multiplier = float(getattr(config, "golden_hour_multiplier", 1.0) or 1.0)

        if reward_amount != 0 and golden_multiplier != 1.0:
            reward_amount = int(round(reward_amount * golden_multiplier))

        user_dice, dealer_dice = self._generate_dice_for_outcome(outcome)
        user_sum = sum(user_dice)
        dealer_sum = sum(dealer_dice)

        normalized_ticket_type = self._normalize_ticket_type(getattr(config, "ticket_type", "DICE_TICKET"))

        consumed = False
        last_token_type = None
        for candidate in self._ticket_type_aliases(normalized_ticket_type):
            try:
                token_type_enum = GameTokenType(candidate)
            except Exception:
                continue
            last_token_type = token_type_enum
            try:
                V2InventoryService.require_and_consume_wallet_token(
                    db,
                    user_id,
                    token_type_enum,
                    amount=1,
                    reason="V2_DICE_PLAY",
                    label=f"{config.name} - {outcome}",
                    meta={"outcome": outcome, "v2_config_id": config.id},
                    auto_commit=False,
                )
                consumed = True
                break
            except Exception:
                continue

        if not consumed:
            token_type_enum = GameTokenType.DICE_TICKET
            last_token_type = token_type_enum
            V2InventoryService.require_and_consume_wallet_token(
                db,
                user_id,
                token_type_enum,
                amount=1,
                reason="V2_DICE_PLAY",
                label=f"{config.name} - {outcome}",
                meta={"outcome": outcome, "v2_config_id": config.id},
                auto_commit=False,
            )

        log_entry = V2DiceLog(
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

        mission_service = V2MissionService(db)
        mission_service.update_progress(user_id, "PLAY_GAME")
        streak_info = mission_service.get_streak_info(user_id)

        vault_reward_amount = 0
        if reward_type in {"POINT", "CC_POINT", "NONE"} and reward_amount is not None:
            vault_reward_amount = int(reward_amount)

        total_earn = self.vault_service.record_game_play_earn_event(
            db,
            user_id=user_id,
            game_type=FeatureType.DICE.value,
            game_log_id=log_entry.id,
            token_type=(last_token_type.value if last_token_type else normalized_ticket_type),
            outcome=outcome,
            payout_raw={
                "result": outcome,
                "reward_type": reward_type,
                "reward_amount": vault_reward_amount,
                "mode": "PROBABILITY",
                "golden_hour": golden_active,
                "golden_multiplier": golden_multiplier,
            },
        )

        if reward_type not in {"POINT", "CC_POINT"}:
            self.reward_service.deliver(
                db,
                user_id=user_id,
                reward_type=reward_type,
                reward_amount=reward_amount,
                meta={"reason": "v2_dice_play", "outcome": outcome},
            )

        ctx = GamePlayContext(user_id=user_id, feature_type=FeatureType.DICE.value, today=today)
        log_game_play(
            ctx,
            db,
            {
                "result": outcome,
                "reward_type": reward_type,
                "reward_amount": reward_amount,
                "reward_label": f"{config.name} - {outcome}",
                "mode": "PROBABILITY",
                "golden_hour": golden_active,
                "golden_multiplier": golden_multiplier,
            },
        )

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
            game_data=game_data,
            game=game_data,
            season_pass=None,
            vault_earn=int(total_earn or 0),
            streak_info=(streak_info.model_dump() if streak_info else None),
            event_seeded=False,
            event_seed_amount=0,
            is_golden_hour=golden_active,
        )

