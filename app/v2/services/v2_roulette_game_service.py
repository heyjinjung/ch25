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
from app.core.exceptions import ForbiddenError, InvalidConfigError, DailyLimitReachedError
from app.v2.models import FeatureType
from app.v2.models import GameTokenType
from app.schemas.roulette import (
    RoulettePlayResponse,
    RouletteSegmentSchema,
    RouletteStatusResponse,
)
from app.v2.services.feature_service import FeatureService
from app.v2.services.inventory_service import V2InventoryService
from app.v2.services.reward_service import V2RewardService
from app.v2.services.vault_service import V2VaultService
from app.v2.services.user_service import V2UserService
from app.v2.services.game_common import GamePlayContext, log_game_play
from app.v2.services.mission_service import V2MissionService
from app.v2.models.v2_roulette import V2RouletteConfig, V2RouletteLog, V2RouletteSegment
from app.v2.services.game_config_service import V2GameConfigService
from app.v2.models.user import V2User


_KST = ZoneInfo("Asia/Seoul")


class V2RouletteGameService:
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
        raw = str(ticket_type or "").strip().upper()
        mapping = {
            "ROULETTE_COIN": "ROULETTE_TICKET",
            "GOLD_KEY": "GOLD_KEY_TICKET",
            "DIAMOND_KEY": "DIAMOND_TICKET",
            "TRIAL_TOKEN": "TRIAL_TICKET",
        }
        return mapping.get(raw, raw)

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
        """Deprecated: grade 개념 폐기됨 (2026-01).

        호환성을 위해 메서드는 유지하되 항상 COMMON 반환.
        ticket_type당 하나의 config만 존재하므로 grade 구분 불필요.
        """
        _ = db, user_id  # unused, kept for signature compatibility
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

        segments: list[V2RouletteSegment] = []
        config: V2RouletteConfig | None = None
        try:
            config, segments = V2GameConfigService.get_active_roulette_config(
                db,
                ticket_type=normalized_ticket_type,
                grade=grade,
            )
        except InvalidConfigError:
            config = (
                db.query(V2RouletteConfig)
                .filter(
                    V2RouletteConfig.is_active.is_(True),
                    V2RouletteConfig.ticket_type.in_(
                        self._ticket_type_aliases(normalized_ticket_type)
                    ),
                )
                .order_by(V2RouletteConfig.id.desc())
                .first()
            )
            if config is None and normalized_ticket_type != "ROULETTE_TICKET":
                config = (
                    db.query(V2RouletteConfig)
                    .filter(
                        V2RouletteConfig.is_active.is_(True),
                        V2RouletteConfig.ticket_type.in_(
                            self._ticket_type_aliases("ROULETTE_TICKET")
                        ),
                    )
                    .order_by(V2RouletteConfig.id.desc())
                    .first()
                )
            if config is not None:
                segments = (
                    db.query(V2RouletteSegment)
                    .filter(V2RouletteSegment.config_id == config.id)
                    .order_by(V2RouletteSegment.slot_index)
                    .all()
                )

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
            token_type_for_balance = GameTokenType.ROULETTE_TICKET
            token_balance = V2InventoryService.get_wallet_balance(db, user_id, token_type_for_balance)

        today_spins = 0
        if config is not None:
            today_spins = db.execute(
                select(func.count())
                .select_from(V2RouletteLog)
                .where(
                    V2RouletteLog.user_id == user_id,
                    V2RouletteLog.config_id == config.id,
                    func.date(V2RouletteLog.created_at) == today,
                )
            ).scalar_one()

        max_daily = config.max_daily_spins if config else 0
        remaining = max(0, max_daily - today_spins) if max_daily > 0 else 0

        return RouletteStatusResponse(
            config_id=config.id if config else 0,
            name=config.name if config else "UNCONFIGURED",
            max_daily_spins=max_daily,
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

        # === Strict Vault Policy: benefits_suspended 체크 ===
        is_suspended, _ = V2VaultService.is_benefits_suspended(db, user_id)
        if is_suspended:
            raise ForbiddenError("BENEFITS_SUSPENDED")

        grade = self._resolve_grade(db, user_id)
        normalized_ticket_type = self._normalize_ticket_type(ticket_type)
        try:
            config, segments = V2GameConfigService.get_active_roulette_config(
                db,
                ticket_type=normalized_ticket_type,
                grade=grade,
            )
        except InvalidConfigError:
            config = (
                db.query(V2RouletteConfig)
                .filter(
                    V2RouletteConfig.is_active.is_(True),
                    V2RouletteConfig.ticket_type.in_(
                        self._ticket_type_aliases(normalized_ticket_type)
                    ),
                )
                .order_by(V2RouletteConfig.id.desc())
                .first()
            )
            if config is None and normalized_ticket_type != "ROULETTE_TICKET":
                config = (
                    db.query(V2RouletteConfig)
                    .filter(
                        V2RouletteConfig.is_active.is_(True),
                        V2RouletteConfig.ticket_type.in_(
                            self._ticket_type_aliases("ROULETTE_TICKET")
                        ),
                    )
                    .order_by(V2RouletteConfig.id.desc())
                    .first()
                )
            if config is None:
                raise
            segments = (
                db.query(V2RouletteSegment)
                .filter(V2RouletteSegment.config_id == config.id)
                .order_by(V2RouletteSegment.slot_index)
                .all()
            )

        # === 일일 제한 체크 (KST 09:00 리셋) ===
        if config.max_daily_spins > 0:
            today_spins = db.execute(
                select(func.count())
                .select_from(V2RouletteLog)
                .where(
                    V2RouletteLog.user_id == user_id,
                    V2RouletteLog.config_id == config.id,
                    func.date(V2RouletteLog.created_at) == today,
                )
            ).scalar_one()
            if today_spins >= config.max_daily_spins:
                raise DailyLimitReachedError("오늘 룰렛 횟수를 모두 사용했습니다.")

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
                V2InventoryService.require_and_consume_wallet_token(
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
            V2InventoryService.require_and_consume_wallet_token(
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
        mission_service = V2MissionService(db)
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

        # === 🔴 Real-time Reward Notification (Jackpot) ===
        try:
            is_jackpot = (reward_type in ["DIAMOND_KEY", "GOLD_KEY"]) or (
                reward_type in ["POINT", "CC_POINT"] and reward_amount >= 10000
            )
            
            if is_jackpot:
                # 텔레그램 ID 조회를 위해 유저 로드
                user = db.get(V2User, user_id)
                if user and user.telegram_id:
                    msg = (
                        f"🎰 **JACKPOT!!**\n\n"
                        f"축하합니다! [{chosen.label}]에 당첨되셨습니다!\n"
                        f"지금 바로 인벤토리를 확인해보세요. ✨"
                    )
                    # Sync Wrapper를 사용하여 즉시 발송
                    from app.core.notifications import send_telegram_user_message_sync
                    send_telegram_user_message_sync(user.telegram_id, msg)
        except Exception:
            pass

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
            streak_info=(streak_info.model_dump() if streak_info else None),
        )
