"""Reward service for coupons, points, and game tickets."""
from typing import Any

from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models.game_wallet import GameTokenType
from app.services.game_wallet_service import GameWalletService


class RewardService:
    """Centralize reward delivery (points, coupons, game tickets)."""

    def __init__(self) -> None:
        self.wallet_service = GameWalletService()

    def grant_point(self, db: Session, user_id: int, amount: int, reason: str | None = None) -> None:
        """Grant points to a user (implementation deferred)."""

        # TODO: Integrate with actual point ledger.
        _ = (db, user_id, amount, reason)

    def grant_coupon(self, db: Session, user_id: int, coupon_type: str, meta: dict[str, Any] | None = None) -> None:
        """Grant a coupon to a user (implementation deferred)."""

        # TODO: Integrate with coupon provider.
        _ = (db, user_id, coupon_type, meta)

    def grant_ticket(self, db: Session, user_id: int, token_type: GameTokenType, amount: int, meta: dict[str, Any] | None = None) -> None:
        """Grant game tickets (roulette/dice/lottery) to the user wallet."""

        self.wallet_service.grant_tokens(
            db,
            user_id=user_id,
            token_type=token_type,
            amount=amount,
            reason=(meta or {}).get("reason") or "LEVEL_REWARD",
            label=(meta or {}).get("label") or "AUTO_GRANT",
            meta=meta,
        )

    def deliver(self, db: Session, user_id: int, reward_type: str, reward_amount: int, meta: dict[str, Any] | None = None) -> None:
        """Dispatch reward based on reward_type; no-op for NONE/zero."""

        if reward_amount == 0 or reward_type in {"NONE", "", None}:
            return
        settings = get_settings()
        xp_from_game_reward = settings.xp_from_game_reward
        season_pass = None
        if xp_from_game_reward:
            # Lazy import to avoid circular dependency with LevelXPService
            from app.services.season_pass_service import SeasonPassService  # pylint: disable=import-outside-toplevel

            season_pass = SeasonPassService()

        if reward_type == "POINT":
            self.grant_point(db, user_id=user_id, amount=reward_amount, reason=meta.get("reason") if meta else None)
            # 게임 보상 XP는 고정 상수로 부여 (기본 5, 메타에 game_xp가 있으면 우선)
            if xp_from_game_reward and season_pass:
                reason = (meta or {}).get("reason") if meta else None
                if reason in {"dice_play", "roulette_spin", "lottery_play"}:
                    xp_amount = (meta or {}).get("game_xp") or 5
                    season_pass.add_bonus_xp(db, user_id=user_id, xp_amount=xp_amount)
            return
        if reward_type == "COUPON":
            coupon_code = meta.get("coupon_type") if meta else "GENERIC"
            self.grant_coupon(db, user_id=user_id, coupon_type=coupon_code, meta=meta)
            return

        ticket_map = {
            "TICKET_ROULETTE": GameTokenType.ROULETTE_COIN,
            "TICKET_DICE": GameTokenType.DICE_TOKEN,
            "TICKET_LOTTERY": GameTokenType.LOTTERY_TICKET,
            "CC_COIN": GameTokenType.CC_COIN,
        }
        if reward_type in ticket_map:
            token_type = ticket_map[reward_type]
            self.grant_ticket(db, user_id=user_id, token_type=token_type, amount=reward_amount, meta=meta)
            return

        # Unknown reward types are ignored but should be monitored.
        _ = (db, user_id, reward_type, reward_amount, meta)
