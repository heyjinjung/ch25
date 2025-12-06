"""Reward service placeholder for granting points or coupons."""
from typing import Any

from sqlalchemy.orm import Session


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
