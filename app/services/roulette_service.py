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
        
        # Seed segments: Reward DIAMOND only
        segments = [
            {"slot_index": 0, "label": "1 다이아", "reward_type": "DIAMOND", "reward_amount": 1, "weight": 30},
            {"slot_index": 1, "label": "꽝", "reward_type": "NONE", "reward_amount": 0, "weight": 50},
            {"slot_index": 2, "label": "2 다이아", "reward_type": "DIAMOND", "reward_amount": 2, "weight": 15},
            {"slot_index": 3, "label": "꽝", "reward_type": "NONE", "reward_amount": 0, "weight": 4},
            {"slot_index": 4, "label": "5 다이아", "reward_type": "DIAMOND", "reward_amount": 5, "weight": 1},
            {"slot_index": 5, "label": "꽝", "reward_type": "NONE", "reward_amount": 0, "weight": 0}, 
        ]
        # Note: 6 segments required by FE usually.
        
        db.add_all([RouletteSegment(config_id=config.id, **s) for s in segments])
        db.commit()
        db.refresh(config)
        return config

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
        
        # Only seed default for Coin roulette in test mode
        if len(segments) == 0 and settings.test_mode:
             # Look up config to check type if needed, but for now just skip or fail if not coin
             pass

        if len(segments) != 6:
            # If seed missing for keys, it's critical
            if settings.test_mode and len(segments) == 0:
                 return self._seed_default_segments(db, config_id)
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

        total_earn = 0
        # Vault Phase 1: idempotent game accrual (safe-guarded by feature flag).
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
                "reward_amount": chosen.reward_amount,
            },
        )

        settings = get_settings()
        if consumed_trial and bool(getattr(settings, "enable_trial_payout_to_vault", False)):
            total_earn += self.vault_service.record_trial_result_earn_event(
                db,
                user_id=user_id,
                game_type=FeatureType.ROULETTE.value,
                game_log_id=log_entry.id,
                token_type=token_type_enum.value,
                reward_type=chosen.reward_type,
                reward_amount=chosen.reward_amount,
                payout_raw={"segment_id": chosen.id},
                force_enable=False, # Respect global setting for trial payouts
            )


        # Special Handling for Keys: always accrue to Vault (masquerade as POINT for vault logic)
        # CASE A: The reward itself is a KEY (e.g. winning a key from a spin)
        if chosen.reward_type in {"GOLD_KEY", "DIAMOND_KEY"} and chosen.reward_amount > 0:
             total_earn += self.vault_service.record_trial_result_earn_event(
                db,
                user_id=user_id,
                game_type=FeatureType.ROULETTE.value,
                game_log_id=log_entry.id,
                token_type=token_type_enum.value,
                reward_type="POINT",  # Force POINT to ensure amount is used 1:1
                reward_amount=chosen.reward_amount,
                payout_raw={
                    "segment_id": chosen.id,
                    "original_reward_type": chosen.reward_type,
                    "is_key_reward": True
                },
                force_enable=True, # Always accrue KEY rewards
            )
        # CASE B: The ticket used was a KEY, and the reward is POINT (e.g. 50,000 P)
        elif token_type_enum in (GameTokenType.GOLD_KEY, GameTokenType.DIAMOND_KEY) and chosen.reward_type == "POINT" and chosen.reward_amount > 0:
             total_earn += self.vault_service.record_trial_result_earn_event(
                db,
                user_id=user_id,
                game_type=FeatureType.ROULETTE.value,
                game_log_id=log_entry.id,
                token_type=token_type_enum.value,
                reward_type="POINT",
                reward_amount=chosen.reward_amount,
                payout_raw={
                    "segment_id": chosen.id,
                    "original_reward_type": chosen.reward_type,
                    "is_key_spin_point": True
                },
                force_enable=True, # Always accrue KEY spin points
            )

        xp_award = self.BASE_GAME_XP
        ctx = GamePlayContext(user_id=user_id, feature_type=FeatureType.ROULETTE.value, today=today)
        log_game_play(
            ctx,
            db,
            {
                "segment_id": chosen.id,
                "reward_type": chosen.reward_type,
                "reward_amount": chosen.reward_amount,
                "label": chosen.label,
                "xp_from_reward": xp_award,
            },
        )

        # Deliver reward according to segment definition (unless trial routing is enabled).
        # Deliver reward according to segment definition (unless trial routing is enabled).
        if not (consumed_trial and bool(getattr(settings, "enable_trial_payout_to_vault", False))):
            # [KEY REWARD REDIRECTION FIX]
            # If the user used a GOLD_KEY or DIAMOND_KEY, and won POINTs, retrieve them as Vault Cash, NOT XP.
            if token_type_enum in (GameTokenType.GOLD_KEY, GameTokenType.DIAMOND_KEY) and chosen.reward_type == "POINT":
                 # Already accrued to vault via the special handling block added above? 
                 # Wait, the block above (lines 219-233) only handled chosen.reward_type IN {GOLD_KEY, DIAMOND_KEY}.
                 # This block handles chosen.reward_type == "POINT" when ticket is Key.
                 pass # Skip reward_service delivery for points, handled below explicitly if needed
            else:
                self.reward_service.deliver(
                    db,
                    user_id=user_id,
                    reward_type=chosen.reward_type,
                    reward_amount=chosen.reward_amount,
                    meta={"reason": "roulette_spin", "segment_id": chosen.id, "game_xp": xp_award},
                )
        if chosen.reward_amount > 0:
            self.season_pass_service.maybe_add_internal_win_stamp(db, user_id=user_id, now=today)

        # [Mission] Update progress
        from app.services.mission_service import MissionService
        MissionService(db).update_progress(user_id, "PLAY_GAME")
        season_pass = None  # 게임 1회당 자동 스탬프 발급을 중단하고, 조건 달성 시 별도 로직으로 처리

        return RoulettePlayResponse(
            result="OK",
            segment=chosen,
            season_pass=season_pass,
            vault_earn=total_earn,
        )
