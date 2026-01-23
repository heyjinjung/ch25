"""V2 lottery gameplay service (router-independent).

This service uses V2 config/log tables.
"""

from __future__ import annotations

import random
import time
from datetime import date, datetime
from zoneinfo import ZoneInfo

from sqlalchemy import func, select
from sqlalchemy.exc import DBAPIError
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.exceptions import LockAcquisitionError
from app.models.feature import FeatureType
from app.models.game_wallet import GameTokenType
from app.schemas.lottery import LotteryPlayResponse, LotteryPrizeSchema, LotteryStatusResponse
from app.services.feature_service import FeatureService
from app.services.game_common import GamePlayContext, log_game_play
from app.v2.services.inventory_service import V2InventoryService
from app.v2.services.mission_service import V2MissionService
from app.v2.services.reward_service import V2RewardService
from app.services.vault_service import VaultService
from app.v2.models.v2_lottery import V2LotteryLog, V2LotteryPrize
from app.v2.services.game_config_service import V2GameConfigService


_KST = ZoneInfo("Asia/Seoul")


class V2LotteryGameService:
    def __init__(self) -> None:
        self.feature_service = FeatureService()
        self.reward_service = V2RewardService()
        self.vault_service = VaultService()

    @staticmethod
    def _operational_date_kst(now: datetime) -> date:
        settings = get_settings()
        reset_hour_raw = getattr(settings, "streak_day_reset_hour_kst", 9)
        reset_hour = int(reset_hour_raw) if reset_hour_raw is not None else 9

        now_kst = now.astimezone(_KST)
        if now_kst.hour < reset_hour:
            return now_kst.date() - date.resolution
        return now_kst.date()

    @staticmethod
    def _eligible_prizes(db: Session, config_id: int, *, lock: bool = False) -> list[V2LotteryPrize]:
        prizes_stmt = select(V2LotteryPrize).where(
            V2LotteryPrize.config_id == config_id,
            V2LotteryPrize.is_active.is_(True),
        )
        if lock and db.bind and db.bind.dialect.name != "sqlite":
            prizes_stmt = prizes_stmt.with_for_update()
        try:
            prizes = db.execute(prizes_stmt).scalars().all()
        except DBAPIError as exc:
            raise LockAcquisitionError("V2_LOTTERY_LOCK_FAILED") from exc

        eligible = [p for p in prizes if (p.stock is None or int(p.stock) > 0)]
        total_weight = sum(max(int(p.weight or 0), 0) for p in eligible)
        if not eligible or total_weight <= 0:
            from app.core.exceptions import InvalidConfigError

            raise InvalidConfigError("INVALID_V2_LOTTERY_CONFIG")
        return eligible

    @staticmethod
    def _normalize_ticket_type(ticket_type: str) -> str:
        mapping = {
            "TRIAL_TOKEN": "TRIAL_TICKET",
        }
        return mapping.get(ticket_type, ticket_type)

    @staticmethod
    def _ticket_type_aliases(ticket_type: str) -> list[str]:
        normalized = V2LotteryGameService._normalize_ticket_type(ticket_type)
        aliases = [normalized]
        reverse = {
            "TRIAL_TICKET": "TRIAL_TOKEN",
        }
        if normalized in reverse:
            aliases.append(reverse[normalized])
        return aliases

    def get_status(
        self,
        db: Session,
        *,
        user_id: int,
        now: datetime | None = None,
    ) -> LotteryStatusResponse:
        if now is None:
            now = datetime.now(tz=_KST)

        today = self._operational_date_kst(now)
        self.feature_service.validate_feature_active(db, today, FeatureType.LOTTERY)

        config, _ = V2GameConfigService.get_active_lottery_config(db)
        normalized_ticket_type = self._normalize_ticket_type(getattr(config, "ticket_type", "LOTTERY_TICKET"))

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
            token_type_for_balance = GameTokenType.LOTTERY_TICKET
            token_balance = V2InventoryService.get_wallet_balance(db, user_id, token_type_for_balance)

        prizes = self._eligible_prizes(db, config.id)

        today_tickets = db.execute(
            select(func.count())
            .select_from(V2LotteryLog)
            .where(
                V2LotteryLog.user_id == user_id,
                V2LotteryLog.config_id == config.id,
                func.date(V2LotteryLog.created_at) == today,
            )
        ).scalar_one()

        unlimited = 0
        remaining = 0

        # Collection progress (kept compatible with v1 schema)
        c_total = V2InventoryService.get_wallet_balance(db, user_id, GameTokenType.PUZZLE_C)
        c1_count = 1 if int(c_total or 0) >= 1 else 0
        c2_count = 1 if int(c_total or 0) >= 2 else 0
        j_count = V2InventoryService.get_wallet_balance(db, user_id, GameTokenType.PUZZLE_J)
        m_count = V2InventoryService.get_wallet_balance(db, user_id, GameTokenType.PUZZLE_M)

        return LotteryStatusResponse(
            config_id=config.id,
            name=config.name,
            max_daily_tickets=unlimited,
            today_tickets=int(today_tickets),
            remaining_tickets=remaining,
            token_type=normalized_ticket_type,
            token_balance=int(token_balance or 0),
            prize_preview=[LotteryPrizeSchema.model_validate(p) for p in prizes],
            feature_type=FeatureType.LOTTERY,
            collection_progress={"C1": c1_count, "C2": c2_count, "J": int(j_count or 0), "M": int(m_count or 0)},
        )

    def play(
        self,
        db: Session,
        *,
        user_id: int,
        now: datetime | date | None = None,
    ) -> LotteryPlayResponse:
        if now is None:
            now_dt = datetime.now(tz=_KST)
        elif isinstance(now, date) and not isinstance(now, datetime):
            now_dt = datetime(now.year, now.month, now.day, tzinfo=_KST)
        else:
            now_dt = now  # type: ignore[assignment]

        today = self._operational_date_kst(now_dt)
        self.feature_service.validate_feature_active(db, today, FeatureType.LOTTERY)

        config, _ = V2GameConfigService.get_active_lottery_config(db)
        normalized_ticket_type = self._normalize_ticket_type(getattr(config, "ticket_type", "LOTTERY_TICKET"))

        prizes = None
        for attempt in range(3):
            try:
                prizes = self._eligible_prizes(db, config.id, lock=True)
                break
            except LockAcquisitionError:
                if attempt == 2:
                    raise
                time.sleep(0.05)
        assert prizes is not None

        # Weighted pick
        weights = [max(int(p.weight or 0), 0) for p in prizes]
        chosen = random.choices(prizes, weights=weights, k=1)[0]

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
                    reason="V2_LOTTERY_PLAY",
                    label=chosen.label,
                    meta={"v2_prize_id": chosen.id, "v2_config_id": config.id},
                    auto_commit=False,
                )
                consumed = True
                break
            except Exception:
                continue

        if not consumed:
            token_type_enum = GameTokenType.LOTTERY_TICKET
            last_token_type = token_type_enum
            V2InventoryService.require_and_consume_wallet_token(
                db,
                user_id,
                token_type_enum,
                amount=1,
                reason="V2_LOTTERY_PLAY",
                label=chosen.label,
                meta={"v2_prize_id": chosen.id, "v2_config_id": config.id},
                auto_commit=False,
            )

        if chosen.stock is not None:
            chosen.stock = int(chosen.stock) - 1
            db.add(chosen)

        log_entry = V2LotteryLog(
            user_id=user_id,
            config_id=config.id,
            prize_id=chosen.id,
            reward_type=str(chosen.reward_type),
            reward_amount=int(chosen.reward_amount or 0),
        )
        db.add(log_entry)
        db.commit()
        db.refresh(log_entry)

        mission_service = V2MissionService(db)
        mission_service.update_progress(user_id, "PLAY_GAME")
        streak_info = mission_service.get_streak_info(user_id)

        reward_type = str(chosen.reward_type)
        reward_amount = int(chosen.reward_amount or 0)

        vault_reward_amount = 0
        if reward_type in {"POINT", "CC_POINT", "NONE"} and reward_amount is not None:
            vault_reward_amount = int(reward_amount)

        total_earn = self.vault_service.record_game_play_earn_event(
            db,
            user_id=user_id,
            game_type=FeatureType.LOTTERY.value,
            game_log_id=log_entry.id,
            token_type=(last_token_type.value if last_token_type else normalized_ticket_type),
            outcome=f"PRIZE_{chosen.id}",
            payout_raw={
                "prize_id": chosen.id,
                "reward_type": reward_type,
                "reward_amount": vault_reward_amount,
            },
        )

        if reward_type not in {"POINT", "CC_POINT"}:
            self.reward_service.deliver(
                db,
                user_id=user_id,
                reward_type=reward_type,
                reward_amount=reward_amount,
                meta={"reason": "v2_lottery_play", "prize_id": chosen.id},
            )

        # Optional: puzzle-piece side drop (config-driven)
        collection_piece = None
        try:
            prob = float(getattr(config, "puzzle_piece_probability", 0.0) or 0.0)
            if prob > 0 and random.random() < prob:
                token = random.choice([GameTokenType.PUZZLE_C, GameTokenType.PUZZLE_J, GameTokenType.PUZZLE_M])
                V2InventoryService.grant_wallet_tokens(
                    db,
                    user_id,
                    token,
                    1,
                    reason="V2_LOTTERY_PUZZLE_DROP",
                    meta={"v2_config_id": config.id, "v2_log_id": log_entry.id},
                )
                collection_piece = token.value.replace("PUZZLE_", "")
        except Exception:
            collection_piece = None

        ctx = GamePlayContext(user_id=user_id, feature_type=FeatureType.LOTTERY.value, today=today)
        log_game_play(
            ctx,
            db,
            {
                "prize_id": chosen.id,
                "reward_type": reward_type,
                "reward_amount": reward_amount,
                "label": chosen.label,
                "collection_piece": collection_piece,
            },
        )

        return LotteryPlayResponse(
            result="OK",
            prize=LotteryPrizeSchema.model_validate(chosen),
            season_pass=None,
            vault_earn=int(total_earn or 0),
            streak_info=(streak_info.model_dump() if streak_info else None),
            game_data={"collection_piece": collection_piece},
        )
