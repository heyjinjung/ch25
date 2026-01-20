"""Roulette service implementing status and play flows."""
from datetime import date, datetime
import logging
import random
import time

from sqlalchemy import func, select
from sqlalchemy.exc import DBAPIError
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.exceptions import InvalidConfigError, LockAcquisitionError, ForbiddenError, TooManyRequestsError
from app.models.feature import FeatureType
from app.models.game_wallet import GameTokenType
from app.models.roulette import RouletteConfig, RouletteLog, RouletteSegment
from app.models.user_segment import UserSegment
from app.schemas.mission import StreakInfoSchema
from app.schemas.roulette import RoulettePlayResponse, RouletteSegmentSchema, RouletteStatusResponse
from app.services.feature_service import FeatureService
from app.services.game_common import GamePlayContext, log_game_play, should_apply_dda
from app.services.game_wallet_service import GameWalletService
from app.services.reward_service import RewardService
from app.services.season_pass_service import SeasonPassService
from app.services.vault_service import VaultService


class RouletteService:
    """Encapsulates roulette game operations."""

    BASE_GAME_XP = 0

    def __init__(self) -> None:
        self.feature_service = FeatureService()
        self.reward_service = RewardService()
        self.wallet_service = GameWalletService()
        self.season_pass_service = SeasonPassService()
        self.vault_service = VaultService()

    def _seed_default_segments(self, db: Session, config_id: int) -> list[RouletteSegment]:
        """Ensure six default segments exist for the given config (TEST_MODE bootstrap)."""

        default_segments = [
            {"slot_index": 0, "label": "100 P", "reward_type": "POINT", "reward_amount": 100, "weight": 30},
            {"slot_index": 1, "label": "200 P", "reward_type": "POINT", "reward_amount": 200, "weight": 25},
            {"slot_index": 2, "label": "500 P", "reward_type": "POINT", "reward_amount": 500, "weight": 20},
            {"slot_index": 3, "label": "꽝", "reward_type": "NONE", "reward_amount": 0, "weight": 15},
            {"slot_index": 4, "label": "200 XP", "reward_type": "GAME_XP", "reward_amount": 200, "weight": 8},
            {"slot_index": 5, "label": "잭팟 1만P", "reward_type": "POINT", "reward_amount": 10000, "weight": 2, "is_jackpot": True},
        ]

        db.query(RouletteSegment).filter(RouletteSegment.config_id == config_id).delete()
        db.add_all([RouletteSegment(config_id=config_id, **segment) for segment in default_segments])
        db.commit()
        return db.execute(select(RouletteSegment).where(RouletteSegment.config_id == config_id).order_by(RouletteSegment.slot_index)).scalars().all()

    def _seed_default_config(self, db: Session) -> RouletteConfig:
        """Create a minimal roulette config with default segments for TEST_MODE bootstrap."""

        config = RouletteConfig(
            name="Test Roulette",
            is_active=True,
            max_daily_spins=0,
            ticket_type=GameTokenType.ROULETTE_COIN.value,
        )
        db.add(config)
        db.flush()
        self._seed_default_segments(db, config.id)
        db.refresh(config)
        return config

    def _seed_trial_config(self, db: Session) -> RouletteConfig:
        """Create TRIAL roulette config."""
        config = RouletteConfig(
            name="체험 룰렛 (Practice)",
            is_active=True,
            max_daily_spins=0,
            ticket_type=GameTokenType.TRIAL_TOKEN.value,
        )
        db.add(config)
        db.flush()

        self._seed_trial_segments(db, config.id)
        db.refresh(config)
        return config

    def _seed_trial_segments(self, db: Session, config_id: int) -> list[RouletteSegment]:
        """Ensure six TRIAL segments exist for the given config.

        Trial roulette is a fixed product surface (not tuned via admin), so it's safe to
        auto-repair missing/invalid segments in production to prevent 500s.
        """

        segments = [
            {"slot_index": 0, "label": "1 다이아", "reward_type": "DIAMOND", "reward_amount": 1, "weight": 30},
            {"slot_index": 1, "label": "꽝", "reward_type": "NONE", "reward_amount": 0, "weight": 50},
            {"slot_index": 2, "label": "2 다이아", "reward_type": "DIAMOND", "reward_amount": 2, "weight": 15},
            {"slot_index": 3, "label": "꽝", "reward_type": "NONE", "reward_amount": 0, "weight": 4},
            {"slot_index": 4, "label": "5 다이아", "reward_type": "DIAMOND", "reward_amount": 5, "weight": 1},
            {"slot_index": 5, "label": "꽝", "reward_type": "NONE", "reward_amount": 0, "weight": 0},
        ]

        db.query(RouletteSegment).filter(RouletteSegment.config_id == config_id).delete()
        db.add_all([RouletteSegment(config_id=config_id, **segment) for segment in segments])
        db.commit()
        return (
            db.execute(
                select(RouletteSegment)
                .where(RouletteSegment.config_id == config_id)
                .order_by(RouletteSegment.slot_index)
            )
            .scalars()
            .all()
        )

    def _get_daily_ticket_play_count(self, db: Session, user_id: int, today: date, ticket_type: str) -> int:
        return db.execute(
            select(func.count())
            .select_from(RouletteLog)
            .join(RouletteConfig, RouletteLog.config_id == RouletteConfig.id)
            .where(
                RouletteLog.user_id == user_id,
                RouletteConfig.ticket_type == ticket_type,
                func.date(RouletteLog.created_at) == today,
            )
        ).scalar_one()

    def _resolve_user_grade(self, db: Session, user_id: int) -> str:
        """Determine roulette target grade: NEW, WHALE, or COMMON."""
        from app.models.user import User
        from app.models.external_ranking import ExternalRankingData

        # 1. NEW: Check if created < 7 days
        user = db.get(User, user_id)
        if user and (datetime.utcnow() - user.created_at).days < 7:
            return "NEW"

        # 2. WHALE: Check deposit > 5,000,000 (Dynamic Check)
        ranking = db.query(ExternalRankingData).filter(ExternalRankingData.user_id == user_id).first()
        deposit = ranking.deposit_amount if ranking else 0
        if deposit >= 5_000_000:
            return "WHALE"

        # 3. COMMON: Default
        return "COMMON"

    def _get_today_config(self, db: Session, ticket_type: str = GameTokenType.ROULETTE_COIN.value, user_id: int | None = None) -> RouletteConfig:
        target_grade = "COMMON"
        if user_id:
             target_grade = self._resolve_user_grade(db, user_id)

        # Build list of ticket types to query (V2 standard + legacy alias)
        # This ensures we find configs regardless of which naming convention was used
        ticket_types_to_query = [ticket_type]
        legacy_map = {
            "GOLD_KEY_TICKET": "GOLD_KEY",
            "DIAMOND_TICKET": "DIAMOND_KEY",
            "TRIAL_TICKET": "TRIAL_TOKEN",
            "ROULETTE_TICKET": "ROULETTE_COIN",
            "DICE_TICKET": "DICE_TOKEN",
        }
        reverse_legacy_map = {v: k for k, v in legacy_map.items()}

        if ticket_type in legacy_map:
            ticket_types_to_query.append(legacy_map[ticket_type])
        elif ticket_type in reverse_legacy_map:
            ticket_types_to_query.append(reverse_legacy_map[ticket_type])

        # Priority 1: Config matching Grade
        config = db.execute(
            select(RouletteConfig).where(
                RouletteConfig.is_active.is_(True),
                RouletteConfig.ticket_type.in_(ticket_types_to_query),
                RouletteConfig.grade == target_grade
            ).order_by(RouletteConfig.id.desc())
        ).scalars().first()

        # Priority 2: Fallback to COMMON (if specific grade config is missing)
        if config is None and target_grade != "COMMON":
            config = db.execute(
                select(RouletteConfig).where(
                    RouletteConfig.is_active.is_(True),
                    RouletteConfig.ticket_type.in_(ticket_types_to_query),
                    RouletteConfig.grade == "COMMON"
                ).order_by(RouletteConfig.id.desc())
            ).scalars().first()

        if config is None:
            settings = get_settings()
            is_sqlite = bool(db.bind and db.bind.dialect.name == "sqlite")
            if ticket_type == GameTokenType.ROULETTE_COIN.value and (settings.test_mode or is_sqlite):
                return self._seed_default_config(db)
            if ticket_type == GameTokenType.TRIAL_TOKEN.value:
                # Auto-seed trial config if missing
                return self._seed_trial_config(db)
            raise InvalidConfigError(f"ROULETTE_CONFIG_MISSING_{ticket_type}")
        return config

    def _get_segments(self, db: Session, config_id: int, lock: bool = False) -> list[RouletteSegment]:
        settings = get_settings()
        stmt = select(RouletteSegment).where(RouletteSegment.config_id == config_id).order_by(RouletteSegment.slot_index)
        if lock and db.bind and db.bind.dialect.name != "sqlite":
            stmt = stmt.with_for_update()
        try:
            segments = db.execute(stmt).scalars().all()
        except DBAPIError as exc:
            raise LockAcquisitionError("ROULETTE_LOCK_FAILED") from exc

        config = db.get(RouletteConfig, config_id)
        ticket_type = getattr(config, "ticket_type", None)

        # Auto-repair TRIAL roulette segments (production-safe fixed config).
        if ticket_type == GameTokenType.TRIAL_TOKEN.value and len(segments) != 6:
            return self._seed_trial_segments(db, config_id)

        # Only seed default for Coin roulette in test mode/local sqlite bootstrap.
        if ticket_type == GameTokenType.ROULETTE_COIN.value and len(segments) == 0 and settings.test_mode:
            return self._seed_default_segments(db, config_id)

        if len(segments) != 6:
            raise InvalidConfigError("INVALID_ROULETTE_CONFIG")
        for segment in segments:
            if segment.weight < 0:
                raise InvalidConfigError("INVALID_ROULETTE_CONFIG")
        total_weight = sum(segment.weight for segment in segments if segment.weight > 0)
        if total_weight <= 0:
            raise InvalidConfigError("INVALID_ROULETTE_CONFIG")
        return segments

    def get_status(self, db: Session, user_id: int, today: date, ticket_type: str = GameTokenType.ROULETTE_COIN.value) -> RouletteStatusResponse:
        self.feature_service.validate_feature_active(db, today, FeatureType.ROULETTE)
        config = self._get_today_config(db, ticket_type, user_id=user_id)

        # Premium roulette access control must be enforced at status-time as well,
        # so the frontend can block tab switching before a play attempt.
        # Support both V2 standard and legacy aliases
        is_premium = ticket_type in ("GOLD_KEY", "DIAMOND_KEY", "GOLD_KEY_TICKET", "DIAMOND_TICKET")
        if is_premium:
            segment_row = db.query(UserSegment).filter(UserSegment.user_id == user_id).first()
            user_segment = segment_row.segment if segment_row else "COMMON"
            if user_segment not in ["VIP", "WHALE"]:
                raise ForbiddenError("PREMIUM_ROULETTE_FORBIDDEN")

        # Map input string to Enum if possible, or just use string
        token_type_enum = GameTokenType(ticket_type)
        token_balance = self.wallet_service.get_balance(db, user_id, token_type_enum)
        segments = self._get_segments(db, config.id)

        today_spins = db.execute(
            select(func.count()).select_from(RouletteLog).where(
                RouletteLog.user_id == user_id,
                RouletteLog.config_id == config.id,
                func.date(RouletteLog.created_at) == today,
            )
        ).scalar_one()
        # Daily cap removed: use 0 to denote unlimited.
        unlimited = 0
        remaining = 0

        return RouletteStatusResponse(
            config_id=config.id,
            name=config.name,
            max_daily_spins=unlimited,
            today_spins=today_spins,
            remaining_spins=remaining,
            token_type=token_type_enum.value,
            token_balance=token_balance,
            segments=segments,
            feature_type=FeatureType.ROULETTE,
        )

    def play(self, db: Session, user_id: int, now: date | datetime, ticket_type: str = GameTokenType.ROULETTE_COIN.value) -> RoulettePlayResponse:
        today = now.date() if isinstance(now, datetime) else now
        self.feature_service.validate_feature_active(db, today, FeatureType.ROULETTE)
        config = self._get_today_config(db, ticket_type, user_id=user_id)
        token_type_enum = GameTokenType(ticket_type)

        # [Strict Vault Policy] Check Benefit Suspension
        from app.models.user import User
        from fastapi import HTTPException
        user = db.get(User, user_id)
        if user:
            chk_dt = now if isinstance(now, datetime) else datetime(now.year, now.month, now.day)
            policy = self.vault_service.get_user_vault_policy(db, user, chk_dt)
            if policy.get("benefits_suspended"):
                raise HTTPException(
                    status_code=403, 
                    detail="입금을 하셔야 경품 응모 및 상점 이용이 가능합니다", 
                    headers={"X-Reason": "DEPOSIT_REQUIRED"}
                )

        # [Phase 1] Segment Access Control (P0)
        # GOLD_KEY/GOLD_KEY_TICKET: WHALE/VIP Only (VIP limit 3)
        # DIAMOND_KEY/DIAMOND_TICKET: WHALE/VIP Only (VIP limit 1)

        # Support both V2 standard and legacy aliases
        is_gold = ticket_type in ("GOLD_KEY", "GOLD_KEY_TICKET")
        is_diamond = ticket_type in ("DIAMOND_KEY", "DIAMOND_TICKET")

        if is_gold or is_diamond:
            segment_row = db.query(UserSegment).filter(UserSegment.user_id == user_id).first()
            user_segment = segment_row.segment if segment_row else "COMMON"

            # 1. Allowlist: Only VIP and WHALE can access Premium Roulette
            if user_segment not in ["VIP", "WHALE"]:
                 raise ForbiddenError("Premium Roulette is restricted to VIP/WHALE users.")

            # 2. Daily Limits for VIP (WHALE is unlimited)
            if user_segment == "VIP":
                current_daily_plays = self._get_daily_ticket_play_count(db, user_id, today, ticket_type)

                if is_gold:
                    # Limit 3
                    if current_daily_plays >= 3:
                        raise TooManyRequestsError("VIP users are limited to 3 Gold Roulette spins per day.")
                elif is_diamond:
                    # Limit 1
                    if current_daily_plays >= 1:
                        raise TooManyRequestsError("VIP users are limited to 1 Diamond Roulette spin per day.")

        segments = None
        for attempt in range(3):
            try:
                segments = self._get_segments(db, config.id, lock=True)
                break
            except LockAcquisitionError:
                if attempt == 2:
                    raise
                time.sleep(0.05)
        assert segments is not None

        today_spins = db.execute(
            select(func.count()).select_from(RouletteLog).where(
                RouletteLog.user_id == user_id,
                RouletteLog.config_id == config.id,
                func.date(RouletteLog.created_at) == today,
            )
        ).scalar_one()

        settings = get_settings()
        dda_apply = should_apply_dda(user_id, settings)

        weighted_segments = []
        for seg in segments:
            weight = max(seg.weight, 0)
            if dda_apply and (seg.reward_amount or 0) > 0 and str(seg.reward_type).upper() != "NONE":
                weight = int(round(weight * (1 + float(settings.ch25_dda_win_boost))))
            weighted_segments.extend([seg] * max(weight, 0))
        chosen = random.choice(weighted_segments)

        reward_type = chosen.reward_type
        reward_amount = int(chosen.reward_amount or 0)
        payout_mode = None
        event_multiplier = 1.0
        if reward_type in {"POINT", "CC_POINT"} and reward_amount > 0 and not getattr(chosen, "is_jackpot", False):
            from app.services.event_service import EventService

            if EventService().is_golden_hour(db):
                segment_row = db.query(UserSegment).filter(UserSegment.user_id == user_id).first()
                user_segment = segment_row.segment if segment_row else "COMMON"

                if user_segment in {"VIP", "WHALE"}:
                    event_multiplier = 2.5
                elif user_segment == "COMMON":
                    event_multiplier = 2.0

                if event_multiplier > 1.0:
                    reward_amount = int(round(reward_amount * event_multiplier))
                    payout_mode = "EVENT"

        _, consumed_trial = self.wallet_service.require_and_consume_token(
            db,
            user_id,
            token_type_enum,
            amount=1,
            reason="ROULETTE_PLAY",
            label=chosen.label,
            meta={"segment_id": getattr(chosen, "id", None)},
            auto_commit=False,  # [Fix] Atomicity: Commit together with Log/Activity
        )

        # Track play count in user_activity (backend-side to avoid client misses)
        try:
            from app.models.user_activity import UserActivity
            # Use SAVEPOINT to avoid breaking the main transaction on error
            with db.begin_nested():
                activity = db.query(UserActivity).filter(UserActivity.user_id == user_id).first()
                if activity is None:
                    activity = UserActivity(user_id=user_id)
                    db.add(activity)
                activity.roulette_plays = int(activity.roulette_plays or 0) + 1
                activity.last_play_at = datetime.utcnow()
                db.flush()
        except Exception:
            # 실패하더라도 게임 진행은 계속
            logging.getLogger(__name__).warning("UserActivity update failed", exc_info=True)
            # No rollback needed for main transaction due to begin_nested()

        log_entry = RouletteLog(
            user_id=user_id,
            config_id=config.id,
            segment_id=chosen.id,
            reward_type=reward_type,
            reward_amount=reward_amount,
        )
        db.add(log_entry)
        db.commit()
        db.refresh(log_entry)

        # [Live Feed] Publish Jackpot Win
        if reward_type in {"POINT", "CC_POINT"} and reward_amount >= 1000:
            try:
                from app.services.feed_service import FeedService
                FeedService().check_and_publish_jackpot(db, user_id, "ROULETTE", reward_amount)
            except Exception as e:
                # Log but do not fail the request
                logging.getLogger(__name__).error(f"Feed publish failed: {e}")

        # [Mission] Update progress (includes streak sync). Do this before Vault accrual so
        # streak-based vault bonuses apply immediately on the same play.
        from app.services.mission_service import MissionService
        mission_service = MissionService(db)
        mission_service.update_progress(user_id, "PLAY_GAME")
        streak_info = mission_service.get_streak_info(user_id)

        total_earn = 0
        # [REFACTORED V3] Unified Vault Accrual Strategy
        # Vault accrual follows the segment payout payload (no implicit base/penalty).
        # We invoke vault_service exactly once per play to ensure atomicity.
        
        vault_accrual_amount = 0
        point_reward_amount = 0
        
        if reward_type in {"POINT", "CC_POINT"}:
            point_reward_amount = int(reward_amount)
        
        # Determine the effective vault accrual for this spin.
        # If the user won POINTs, that amount IS the accrual.
        # Non-point outcomes should not create a base accrual.

        payout_raw = {
            "segment_id": chosen.id,
            "reward_type": reward_type,
            "reward_amount": reward_amount,
        }
        if payout_mode:
            payout_raw["mode"] = payout_mode
            payout_raw["event_multiplier"] = event_multiplier

        total_earn += self.vault_service.record_game_play_earn_event(
            db,
            user_id=user_id,
            game_type=FeatureType.ROULETTE.value,
            game_log_id=log_entry.id,
            token_type=token_type_enum.value,
            outcome=f"SEGMENT_{chosen.id}",
            payout_raw=payout_raw,
        )

        settings = get_settings()
        trial_payout_enabled = bool(getattr(settings, "enable_trial_payout_to_vault", False))
        
        # Trial/Key Special Routing (Legacy cleanup: ensure no double counting)
        # The block above handles standard POINT accrual.
        # Trial enabled logic is handled via vault_service internal checks or skipped if not needed.
        
        # [KEY REWARD SPECIAL HANDLING]
        # If KEY spin resulted in POINT, logic above (record_game_play_earn_event) should have captured it 
        # because point_reward_amount would be > 0.
        # But we need to check if 'trial_result_earn_event' was duplicative.
        # We removed the separate "CASE B: KEY -> POINT" block to avoid double accrual.
        
        # Calculate XP award for meta logging
        xp_award = 0
        if reward_type == "GAME_XP":
            xp_award = reward_amount
        
        # Deliver NON-POINT rewards via RewardService
        # (POINT rewards are already accrued to Vault above)
        if reward_type not in {"POINT", "CC_POINT"}:
             # For Trial tokens, we might skip delivery if trial_payout_to_vault is ON and it was a monetary reward?
             # But here we only enter if NOT point. So Diamond/Ticket/Coupon/Gifticon.
             # These should always be delivered.
             
            self.reward_service.deliver(
                db,
                user_id=user_id,
                reward_type=reward_type,
                reward_amount=reward_amount,
                meta={"reason": "roulette_spin", "segment_id": chosen.id, "game_xp": xp_award},
            )
        if reward_amount > 0:
            self.season_pass_service.maybe_add_internal_win_stamp(db, user_id=user_id, now=today)
        season_pass = None  # 게임 1회당 자동 스탬프 발급을 중단하고, 조건 달성 시 별도 로직으로 처리

        # Record unified game log for mission/event tracking (adds UserEventLog)
        ctx = GamePlayContext(user_id=user_id, feature_type=FeatureType.ROULETTE.value, today=today)
        log_game_play(
            ctx,
            db,
            {
                "segment_id": chosen.id,
                "reward_type": reward_type,
                "reward_amount": reward_amount,
                "reward_label": chosen.label,
                "xp_from_reward": xp_award,
                "dda_applied": dda_apply,
            },
        )

        segment_payload = RouletteSegmentSchema.model_validate(chosen)
        if reward_amount != int(chosen.reward_amount or 0):
            segment_payload = segment_payload.model_copy(update={"reward_amount": reward_amount})

        if streak_info:
            streak_info_payload = StreakInfoSchema(**streak_info)
        else:
            streak_info_payload = None

        return RoulettePlayResponse(
            result="OK",
            segment=segment_payload,
            season_pass=season_pass,
            vault_earn=total_earn,
            streak_info=streak_info_payload,
        )
