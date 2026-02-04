"""V2 game config validation service."""
from __future__ import annotations

from typing import Iterable

from pydantic import ValidationError
from sqlalchemy.orm import Session

from app.core.exceptions import InvalidConfigError
from app.v2.models.v2_roulette import V2RouletteConfig, V2RouletteSegment
from app.v2.models.v2_dice import V2DiceConfig
from app.v2.models.v2_lottery import V2LotteryConfig, V2LotteryPrize
from app.v2.schemas.v2_admin_game_config import (
    AdminRouletteConfigV2,
    AdminDiceConfigV2,
    AdminLotteryConfigV2,
)


class V2GameConfigService:
    """Centralized config validation for V2 games."""

    @staticmethod
    def _normalize_ticket_type(value: object, *, default: str) -> str:
        raw = str(value or "").strip().upper()
        if not raw:
            raw = default
        mapping = {
            "ROULETTE_COIN": "ROULETTE_TICKET",
            "DICE_TOKEN": "DICE_TICKET",
            "GOLD_KEY": "GOLD_KEY_TICKET",
            "DIAMOND_KEY": "DIAMOND_TICKET",
            "TRIAL_TOKEN": "TRIAL_TICKET",
        }
        return mapping.get(raw, raw)

    @staticmethod
    def _normalize_reward_type(value: object) -> str:
        raw = str(value or "").strip().upper()
        mapping = {
            "VAULT": "POINT",
            "ROULETTE_COIN": "ROULETTE_TICKET",
            "DICE_TOKEN": "DICE_TICKET",
            "GOLD_KEY": "GOLD_KEY_TICKET",
            "DIAMOND_KEY": "DIAMOND_TICKET",
            "TRIAL_TOKEN": "TRIAL_TICKET",
        }
        return mapping.get(raw, raw)

    @staticmethod
    def _validate_roulette(config: V2RouletteConfig, segments: Iterable[V2RouletteSegment]) -> None:
        segment_list = list(segments)
        if len(segment_list) not in {6, 8}:
            raise InvalidConfigError("INVALID_ROULETTE_CONFIG")
        total_weight = sum(seg.weight for seg in segment_list if seg.weight > 0)
        if total_weight <= 0:
            raise InvalidConfigError("INVALID_ROULETTE_CONFIG")
        data = {
            "name": config.name,
            "ticket_type": V2GameConfigService._normalize_ticket_type(
                config.ticket_type, default="ROULETTE_TICKET"
            ),
            "is_active": config.is_active,
            "max_daily_spins": config.max_daily_spins,
            "grade": config.grade,
            "segments": [
                {
                    "slot_index": seg.slot_index,
                    "label": seg.label,
                    "weight": seg.weight,
                    "reward_type": V2GameConfigService._normalize_reward_type(seg.reward_type),
                    "reward_amount": seg.reward_amount,
                    "is_jackpot": seg.is_jackpot,
                }
                for seg in segment_list
            ],
        }
        try:
            AdminRouletteConfigV2.model_validate(data)
        except ValidationError as exc:
            raise InvalidConfigError("INVALID_ROULETTE_CONFIG") from exc

    @staticmethod
    def _validate_dice(config: V2DiceConfig) -> None:
        data = {
            "name": config.name,
            "ticket_type": V2GameConfigService._normalize_ticket_type(
                config.ticket_type, default="DICE_TICKET"
            ),
            "is_active": config.is_active,
            "max_daily_plays": config.max_daily_plays,
            "win_reward_type": V2GameConfigService._normalize_reward_type(config.win_reward_type),
            "win_reward_amount": config.win_reward_amount,
            "draw_reward_type": V2GameConfigService._normalize_reward_type(config.draw_reward_type),
            "draw_reward_amount": config.draw_reward_amount,
            "lose_reward_type": V2GameConfigService._normalize_reward_type(config.lose_reward_type),
            "lose_reward_amount": config.lose_reward_amount,
        }
        try:
            AdminDiceConfigV2.model_validate(data)
        except ValidationError as exc:
            raise InvalidConfigError("INVALID_DICE_CONFIG") from exc

    @staticmethod
    def _validate_lottery(config: V2LotteryConfig, prizes: Iterable[V2LotteryPrize]) -> None:
        prize_list = list(prizes)
        data = {
            "name": config.name,
            "ticket_type": V2GameConfigService._normalize_ticket_type(
                config.ticket_type, default="LOTTERY_TICKET"
            ),
            "is_active": config.is_active,
            "max_daily_plays": config.max_daily_tickets,
            "prizes": [
                {
                    "label": prize.label,
                    "weight": prize.weight,
                    "stock": prize.stock,
                    "reward_type": V2GameConfigService._normalize_reward_type(prize.reward_type),
                    "reward_amount": prize.reward_amount,
                    "is_active": prize.is_active,
                }
                for prize in prize_list
            ],
        }
        try:
            AdminLotteryConfigV2.model_validate(data)
        except ValidationError as exc:
            raise InvalidConfigError("INVALID_LOTTERY_CONFIG") from exc

    @classmethod
    def get_active_roulette_config(
        cls,
        db: Session,
        *,
        ticket_type: str = "ROULETTE_TICKET",
        grade: str = "COMMON",  # Deprecated: grade 개념 폐기됨, 호환성 유지용 파라미터
    ) -> tuple[V2RouletteConfig, list[V2RouletteSegment]]:
        """ticket_type 기준으로 활성 룰렛 config 조회.

        Note: grade 파라미터는 더 이상 사용되지 않음 (2026-01 폐기).
        ticket_type당 하나의 config만 존재해야 함.
        """
        ticket_aliases = {ticket_type}
        legacy_aliases = {
            "ROULETTE_TICKET": "ROULETTE_COIN",
            "GOLD_KEY_TICKET": "GOLD_KEY",
            "DIAMOND_TICKET": "DIAMOND_KEY",
            "TRIAL_TICKET": "TRIAL_TOKEN",
        }
        reverse_aliases = {v: k for k, v in legacy_aliases.items()}
        if ticket_type in legacy_aliases:
            ticket_aliases.add(legacy_aliases[ticket_type])
        if ticket_type in reverse_aliases:
            ticket_aliases.add(reverse_aliases[ticket_type])

        # grade 필터 제거 - ticket_type만으로 조회
        config = (
            db.query(V2RouletteConfig)
            .filter(
                V2RouletteConfig.is_active.is_(True),
                V2RouletteConfig.ticket_type.in_(ticket_aliases),
            )
            .order_by(V2RouletteConfig.id.desc())
            .first()
        )
        if config is None:
            raise InvalidConfigError("V2_ROULETTE_CONFIG_MISSING")

        segments = (
            db.query(V2RouletteSegment)
            .filter(V2RouletteSegment.config_id == config.id)
            .order_by(V2RouletteSegment.slot_index)
            .all()
        )
        cls._validate_roulette(config, segments)
        return config, segments

    @classmethod
    def get_active_dice_config(cls, db: Session) -> V2DiceConfig:
        config = (
            db.query(V2DiceConfig)
            .filter(V2DiceConfig.is_active.is_(True))
            .order_by(V2DiceConfig.id.desc())
            .first()
        )
        if config is None:
            raise InvalidConfigError("V2_DICE_CONFIG_MISSING")
        cls._validate_dice(config)
        return config

    @classmethod
    def get_active_lottery_config(
        cls, db: Session
    ) -> tuple[V2LotteryConfig, list[V2LotteryPrize]]:
        config = (
            db.query(V2LotteryConfig)
            .filter(V2LotteryConfig.is_active.is_(True))
            .order_by(V2LotteryConfig.id.desc())
            .first()
        )
        if config is None:
            raise InvalidConfigError("V2_LOTTERY_CONFIG_MISSING")
        prizes = (
            db.query(V2LotteryPrize)
            .filter(V2LotteryPrize.config_id == config.id)
            .order_by(V2LotteryPrize.id.asc())
            .all()
        )
        cls._validate_lottery(config, prizes)
        return config, prizes
