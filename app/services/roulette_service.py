"""Roulette service implementing status and play flows."""
from datetime import date, datetime
import random
import time

from sqlalchemy import func, select
from sqlalchemy.exc import DBAPIError
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.exceptions import InvalidConfigError, LockAcquisitionError
from app.models.feature import FeatureType
from app.models.game_wallet import GameTokenType
from app.models.roulette import RouletteConfig, RouletteLog, RouletteSegment
from app.schemas.roulette import RoulettePlayResponse, RouletteStatusResponse
from app.services.feature_service import FeatureService
from app.services.game_common import GamePlayContext, log_game_play
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
            {"slot_index": 0, "label": "100 코인", "reward_type": "POINT", "reward_amount": 100, "weight": 30},
            {"slot_index": 1, "label": "200 코인", "reward_type": "POINT", "reward_amount": 200, "weight": 25},
            {"slot_index": 2, "label": "500 코인", "reward_type": "POINT", "reward_amount": 500, "weight": 20},
            {"slot_index": 3, "label": "꽝", "reward_type": "NONE", "reward_amount": 0, "weight": 15},
            {"slot_index": 4, "label": "1,000 코인", "reward_type": "POINT", "reward_amount": 1000, "weight": 8},
            {"slot_index": 5, "label": "잭팟 10,000", "reward_type": "POINT", "reward_amount": 10000, "weight": 2, "is_jackpot": True},
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

    def _get_today_config(self, db: Session, ticket_type: str = GameTokenType.ROULETTE_COIN.value) -> RouletteConfig:
        config = db.execute(
            select(RouletteConfig).where(
                RouletteConfig.is_active.is_(True),
                RouletteConfig.ticket_type == ticket_type
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
        config = self._get_today_config(db, ticket_type)

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
        config = self._get_today_config(db, ticket_type)
        token_type_enum = GameTokenType(ticket_type)

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

        weighted_segments = []
        for seg in segments:
            weighted_segments.extend([seg] * max(seg.weight, 0))
        chosen = random.choice(weighted_segments)

        _, consumed_trial = self.wallet_service.require_and_consume_token(
            db,
            user_id,
            token_type_enum,
            amount=1,
            reason="ROULETTE_PLAY",
            label=chosen.label,
            meta={"segment_id": getattr(chosen, "id", None)},
        )

        log_entry = RouletteLog(
            user_id=user_id,
            config_id=config.id,
            segment_id=chosen.id,
            reward_type=chosen.reward_type,
            reward_amount=chosen.reward_amount,
        )
        db.add(log_entry)
        db.commit()
        db.refresh(log_entry)

        # [Mission] Update progress (includes streak sync). Do this before Vault accrual so
        # streak-based vault bonuses apply immediately on the same play.
        from app.services.mission_service import MissionService
        mission_service = MissionService(db)
        mission_service.update_progress(user_id, "PLAY_GAME")
        streak_info = mission_service.get_streak_info(user_id)

        total_earn = 0
        # [REFACTORED V3] Unified Vault Accrual Strategy
        # 1. Base Accrual: Fixed small amount (+200/-50) for playing.
        # 2. Winning Reward: Huge points (e.g. 1000, 10000, 50000).
        # Policy: If Reward is POINT, it SUPERSEDES the base accrual (or base is implicitly part of it).
        # We invoke vault_service exactly once per play to ensuring atomicity.
        
        vault_accrual_amount = 0
        point_reward_amount = 0
        
        if chosen.reward_type in {"POINT", "CC_POINT"}:
            point_reward_amount = int(chosen.reward_amount)
        
        # Determine the effective vault accrual for this spin.
        # If the user won POINTs, that amount IS the accrual.
        # If the user hit NONE/Other, we rely on VaultService's default logic (-50 for loss, +200 default).
        
        # However, VaultService.record_game_play_earn_event logic currently looks at 'payout_raw.reward_amount'.
        # If reward_amount is present, it uses that. If 0, it treats as LOSE (-50).
        
        total_earn += self.vault_service.record_game_play_earn_event(
            db,
            user_id=user_id,
            game_type=FeatureType.ROULETTE.value,
            game_log_id=log_entry.id,
            token_type=token_type_enum.value,
            outcome=f"SEGMENT_{chosen.id}",
            payout_raw={
                "segment_id": chosen.id,
                "reward_type": chosen.reward_type,
                "reward_amount": point_reward_amount if chosen.reward_type in {"POINT", "CC_POINT"} else 0,
            },
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
        
        # Deliver NON-POINT rewards via RewardService
        # (POINT rewards are already accrued to Vault above)
        if chosen.reward_type not in {"POINT", "CC_POINT"}:
             # For Trial tokens, we might skip delivery if trial_payout_to_vault is ON and it was a monetary reward?
             # But here we only enter if NOT point. So Diamond/Ticket/Coupon/Gifticon.
             # These should always be delivered.
             
            self.reward_service.deliver(
                db,
                user_id=user_id,
                reward_type=chosen.reward_type,
                reward_amount=chosen.reward_amount,
                meta={"reason": "roulette_spin", "segment_id": chosen.id, "game_xp": xp_award},
            )
        if chosen.reward_amount > 0:
            self.season_pass_service.maybe_add_internal_win_stamp(db, user_id=user_id, now=today)
        season_pass = None  # 게임 1회당 자동 스탬프 발급을 중단하고, 조건 달성 시 별도 로직으로 처리

        return RoulettePlayResponse(
            result="OK",
            segment=chosen,
            season_pass=season_pass,
            vault_earn=total_earn,
            streak_info=streak_info,
        )
