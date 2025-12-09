"""Reward service placeholder for granting points or coupons."""
from typing import Any

from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.services.season_pass_service import SeasonPassService


class RewardService:
    """Centralize reward delivery (points, coupons, etc.)."""

    def grant_point(self, db: Session, user_id: int, amount: int, reason: str | None = None) -> None:
        """Grant points to a user (implementation deferred)."""

        # TODO: Integrate with actual point ledger.
        _ = (db, user_id, amount, reason)

    def grant_coupon(self, db: Session, user_id: int, coupon_type: str, meta: dict[str, Any] | None = None) -> None:
        """Grant a coupon to a user (implementation deferred)."""

        # TODO: Integrate with coupon provider.
        _ = (db, user_id, coupon_type, meta)

    def deliver(self, db: Session, user_id: int, reward_type: str, reward_amount: int, meta: dict[str, Any] | None = None) -> None:
        """Dispatch reward based on reward_type; no-op for NONE/zero."""

        if reward_amount == 0 or reward_type in {"NONE", "", None}:
            return
        settings = get_settings()
        xp_from_game_reward = settings.xp_from_game_reward
        season_pass = SeasonPassService() if xp_from_game_reward else None

        if reward_type == "POINT":
            self.grant_point(db, user_id=user_id, amount=reward_amount, reason=meta.get("reason") if meta else None)
            if xp_from_game_reward and season_pass:
                season_pass.add_bonus_xp(db, user_id=user_id, xp_amount=reward_amount)
            return
        if reward_type == "COUPON":
            coupon_code = meta.get("coupon_type") if meta else "GENERIC"
            self.grant_coupon(db, user_id=user_id, coupon_type=coupon_code, meta=meta)
            return
        # Unknown reward types are ignored but should be monitored.
        _ = (db, user_id, reward_type, reward_amount, meta)
