"""V2 roulette gameplay service (router-independent).

This service intentionally does NOT get wired to any API router yet.
It exists as a V2-native engine that uses V2 config/log tables.
"""

from __future__ import annotations

import random
from datetime import date, datetime
from typing import Iterable
from zoneinfo import ZoneInfo

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models.feature import FeatureType
from app.models.game_wallet import GameTokenType
from app.schemas.roulette import (
    RoulettePlayResponse,
    RouletteSegmentSchema,
    RouletteStatusResponse,
)
from app.services.feature_service import FeatureService
from app.services.game_wallet_service import GameWalletService
from app.services.reward_service import RewardService
from app.services.vault_service import VaultService
from app.services.game_common import GamePlayContext, log_game_play
from app.services.mission_service import MissionService
from app.v2.models.v2_roulette import V2RouletteLog, V2RouletteSegment
from app.v2.services.game_config_service import V2GameConfigService


_KST = ZoneInfo("Asia/Seoul")


class V2RouletteGameService:
    def __init__(self) -> None:
        self.feature_service = FeatureService()
        self.wallet_service = GameWalletService()
        self.reward_service = RewardService()
        self.vault_service = VaultService()

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
            "ROULETTE_COIN": "ROULETTE_TICKET",
            "GOLD_KEY": "GOLD_KEY_TICKET",
            "DIAMOND_KEY": "DIAMOND_TICKET",
            "TRIAL_TOKEN": "TRIAL_TICKET",
        }
        return mapping.get(ticket_type, ticket_type)

    @staticmethod
    def _ticket_type_aliases(ticket_type: str) -> list[str]:
        normalized = V2RouletteGameService._normalize_ticket_type(ticket_type)
        aliases = [normalized]
        reverse = {
            "ROULETTE_TICKET": "ROULETTE_COIN",
            "GOLD_KEY_TICKET": "GOLD_KEY",
            "DIAMOND_TICKET": "DIAMOND_KEY",
            "TRIAL_TICKET": "TRIAL_TOKEN",
        }
        if normalized in reverse:
            aliases.append(reverse[normalized])
        return aliases

    @staticmethod
    def _resolve_grade(db: Session, user_id: int) -> str:
        # V2 roulette grades: COMMON/VIP/WHALE/AT_RISK
        # If missing or unknown, safely fall back to COMMON.
        try:
            from app.models.user_segment import UserSegment

            row = db.query(UserSegment).filter(UserSegment.user_id == user_id).first()
            seg = (row.segment if row else "COMMON") or "COMMON"
            seg = str(seg).upper()
            if seg in {"COMMON", "VIP", "WHALE", "AT_RISK"}:
                return seg
            return "COMMON"
        except Exception:
            return "COMMON"

    @staticmethod
    def _pick_weighted_segment(segments: Iterable[V2RouletteSegment]) -> V2RouletteSegment:
        segment_list = list(segments)
        weights = [max(int(s.weight or 0), 0) for s in segment_list]
        if sum(weights) <= 0:
            return random.choice(segment_list)
        return random.choices(segment_list, weights=weights, k=1)[0]

    def get_status(
        self,
        db: Session,
        *,
        user_id: int,
        now: datetime | None = None,
        ticket_type: str = "ROULETTE_TICKET",
    ) -> RouletteStatusResponse:
        if now is None:
            now = datetime.now(tz=_KST)

        today = self._operational_date_kst(now)
        self.feature_service.validate_feature_active(db, today, FeatureType.ROULETTE)

        grade = self._resolve_grade(db, user_id)
        normalized_ticket_type = self._normalize_ticket_type(ticket_type)

        config, segments = V2GameConfigService.get_active_roulette_config(
            db,
            ticket_type=normalized_ticket_type,
            grade=grade,
        )

        token_type_for_balance = None
        token_balance = 0
        for candidate in self._ticket_type_aliases(normalized_ticket_type):
            try:
                token_type_for_balance = GameTokenType(candidate)
            except Exception:
                continue
            token_balance = self.wallet_service.get_balance(db, user_id, token_type_for_balance)
            if token_balance:
                break

        if token_type_for_balance is None:
            token_type_for_balance = GameTokenType.ROULETTE_TICKET
            token_balance = self.wallet_service.get_balance(db, user_id, token_type_for_balance)

        today_spins = db.execute(
            select(func.count())
            .select_from(V2RouletteLog)
            .where(
                V2RouletteLog.user_id == user_id,
                V2RouletteLog.config_id == config.id,
                func.date(V2RouletteLog.created_at) == today,
            )
        ).scalar_one()

        unlimited = 0
        remaining = 0

        return RouletteStatusResponse(
            config_id=config.id,
            name=config.name,
            max_daily_spins=unlimited,
            today_spins=int(today_spins),
            remaining_spins=remaining,
            token_type=self._normalize_ticket_type(ticket_type),
            token_balance=int(token_balance or 0),
            segments=[RouletteSegmentSchema.model_validate(s) for s in segments],
            feature_type=FeatureType.ROULETTE,
        )

    def play(
        self,
        db: Session,
        *,
        user_id: int,
        now: datetime | date | None = None,
        ticket_type: str = "ROULETTE_TICKET",
    ) -> RoulettePlayResponse:
        if now is None:
            now_dt = datetime.now(tz=_KST)
        elif isinstance(now, date) and not isinstance(now, datetime):
            now_dt = datetime(now.year, now.month, now.day, tzinfo=_KST)
        else:
            now_dt = now  # type: ignore[assignment]

        today = self._operational_date_kst(now_dt)
        self.feature_service.validate_feature_active(db, today, FeatureType.ROULETTE)

        grade = self._resolve_grade(db, user_id)
        normalized_ticket_type = self._normalize_ticket_type(ticket_type)
        config, segments = V2GameConfigService.get_active_roulette_config(
            db,
            ticket_type=normalized_ticket_type,
            grade=grade,
        )

        chosen = self._pick_weighted_segment(segments)
        reward_type = str(chosen.reward_type)
        reward_amount = int(chosen.reward_amount or 0)

        # Consume token (try v2 standard first, then legacy alias).
        consumed = False
        last_token_type = None
        for candidate in self._ticket_type_aliases(normalized_ticket_type):
            try:
                token_type_enum = GameTokenType(candidate)
            except Exception:
                continue
            last_token_type = token_type_enum
            try:
                self.wallet_service.require_and_consume_token(
                    db,
                    user_id,
                    token_type_enum,
                    amount=1,
                    reason="V2_ROULETTE_PLAY",
                    label=chosen.label,
                    meta={"v2_segment_id": chosen.id, "v2_config_id": config.id},
                    auto_commit=False,
                )
                consumed = True
                break
            except Exception:
                continue

        if not consumed:
            # Fall back to strict v2 standard.
            token_type_enum = GameTokenType.ROULETTE_TICKET
            last_token_type = token_type_enum
            self.wallet_service.require_and_consume_token(
                db,
                user_id,
                token_type_enum,
                amount=1,
                reason="V2_ROULETTE_PLAY",
                label=chosen.label,
                meta={"v2_segment_id": chosen.id, "v2_config_id": config.id},
                auto_commit=False,
            )

        log_entry = V2RouletteLog(
            user_id=user_id,
            config_id=config.id,
            segment_id=chosen.id,
            reward_type=reward_type,
            reward_amount=reward_amount,
        )
        db.add(log_entry)
        db.commit()
        db.refresh(log_entry)

        # [Mission] Keep the existing mission/streak flow for consistency.
        mission_service = MissionService(db)
        mission_service.update_progress(user_id, "PLAY_GAME")
        streak_info = mission_service.get_streak_info(user_id)

        total_earn = self.vault_service.record_game_play_earn_event(
            db,
            user_id=user_id,
            game_type=FeatureType.ROULETTE.value,
            game_log_id=log_entry.id,
            token_type=(last_token_type.value if last_token_type else normalized_ticket_type),
            outcome=f"SEGMENT_{chosen.id}",
            payout_raw={
                "segment_id": chosen.id,
                "reward_type": reward_type,
                "reward_amount": reward_amount,
            },
        )

        if reward_type not in {"POINT", "CC_POINT"}:
            self.reward_service.deliver(
                db,
                user_id=user_id,
                reward_type=reward_type,
                reward_amount=reward_amount,
                meta={"reason": "v2_roulette_spin", "segment_id": chosen.id},
            )

        ctx = GamePlayContext(user_id=user_id, feature_type=FeatureType.ROULETTE.value, today=today)
        log_game_play(
            ctx,
            db,
            {
                "segment_id": chosen.id,
                "reward_type": reward_type,
                "reward_amount": reward_amount,
                "reward_label": chosen.label,
            },
        )

        segment_payload = RouletteSegmentSchema.model_validate(chosen)

        return RoulettePlayResponse(
            result="OK",
            segment=segment_payload,
            season_pass=None,
            vault_earn=int(total_earn or 0),
            streak_info=streak_info,
        )
