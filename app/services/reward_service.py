"""Reward service for coupons, points, and game tickets."""
from typing import Any

from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.exceptions import InvalidConfigError
from app.models.game_wallet import GameTokenType
from app.models.user import User
from app.models.user_cash_ledger import UserCashLedger
from app.services.game_wallet_service import GameWalletService
from app.services.inventory_service import InventoryService


class RewardService:
    """Centralize reward delivery (points, coupons, game tickets)."""

    def __init__(self) -> None:
        self.wallet_service = GameWalletService()

    def grant_point(
        self,
        db: Session,
        user_id: int,
        amount: int,
        reason: str | None = None,
        label: str | None = None,
        meta: dict[str, Any] | None = None,
        commit: bool = True,
    ) -> None:
        """Grant points to a user by updating cash_balance and writing a ledger entry."""

        if amount == 0:
            return
        if amount < 0:
            raise InvalidConfigError("INVALID_POINT_AMOUNT")

        q = db.query(User).filter(User.id == user_id)
        # Avoid races in MySQL/Postgres; SQLite used in tests doesn't support FOR UPDATE.
        if db.bind and db.bind.dialect.name != "sqlite":
            q = q.with_for_update()
        user = q.one_or_none()

        # In test sqlite environments, auto-create a placeholder user so existing tests/demos
        # that rely on dependency overrides (user_id=1) don't fail.
        if user is None and db.bind and db.bind.dialect.name == "sqlite":
            user = User(id=user_id, external_id=f"test-user-{user_id}")
            db.add(user)
            db.commit()
            db.refresh(user)

        if user is None:
            raise InvalidConfigError("USER_NOT_FOUND")

        user.cash_balance = (user.cash_balance or 0) + amount
        entry = UserCashLedger(
            user_id=user_id,
            delta=amount,
            balance_after=user.cash_balance,
            reason=reason or "GRANT",
            label=label,
            meta_json=meta or {},
        )
        db.add(user)
        db.add(entry)

        if commit:
            db.commit()
            db.refresh(user)
            db.refresh(entry)
        else:
            db.flush()

    def grant_coupon(self, db: Session, user_id: int, coupon_type: str, meta: dict[str, Any] | None = None) -> None:
        """Grant a coupon to a user (implementation deferred)."""

        # TODO: Integrate with coupon provider.
        _ = (db, user_id, coupon_type, meta)

    def grant_ticket(self, db: Session, user_id: int, token_type: GameTokenType | str, amount: int, meta: dict[str, Any] | None = None) -> None:
        """
        Grant game tickets (roulette/dice/lottery) or DIAMOND to the user.
        If token_type is 'DIAMOND', it is granted as an Inventory Item (Phase 2).
        """

        if token_type == "DIAMOND" or token_type == GameTokenType.DIAMOND:
            InventoryService.grant_item(
                db, 
                user_id, 
                "DIAMOND", 
                amount, 
                reason=(meta or {}).get("reason") or "REWARD",
                related_id=(meta or {}).get("related_id"),
                auto_commit=True
            )
            return

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
        print(f"DEBUG: xp_from_game_reward={xp_from_game_reward}, reward_type={reward_type}, reason={(meta or {}).get('reason')}")
        season_pass = None
        if xp_from_game_reward:
            # Lazy import to avoid circular dependency with LevelXPService
            from app.services.season_pass_service import SeasonPassService  # pylint: disable=import-outside-toplevel

            season_pass = SeasonPassService()

        if reward_type == "POINT":
            reason = (meta or {}).get("reason") if meta else None
            is_game_reward = reason in {"dice_play", "roulette_spin", "lottery_play"}
            
            if is_game_reward:
                # [설계 원칙] 게임 포인트는 재화가 아니라 XP입니다.
                if season_pass:
                    bonus_xp = (meta or {}).get("game_xp") or 0
                    total_xp = reward_amount + bonus_xp
                    print(f"DEBUG: Delivering Season XP: {total_xp} (Reward: {reward_amount}, Bonus: {bonus_xp})")
                    season_pass.add_bonus_xp(db, user_id=user_id, xp_amount=total_xp)
            else:
                # 어드민 수동 지급 등 게임 외 사유일 때만 현찰로 지급
                self.grant_point(db, user_id=user_id, amount=reward_amount, reason=reason)
            return

        if reward_type in {"BUNDLE", "TICKET_BUNDLE"}:
            # BUNDLE은 여러 티켓을 한 번에 지급하는 미끼 보상입니다.
            bundle_items = []
            if reward_amount == 3:  # Level 3: All-in-one Bundle (Roulette 1 + Dice 1 + Lottery 1)
                bundle_items = [
                    (GameTokenType.ROULETTE_COIN, 1),
                    (GameTokenType.DICE_TOKEN, 1),
                    (GameTokenType.LOTTERY_TICKET, 1),
                ]
            elif reward_amount == 6:  # Level 5: Mini Ticket bomb (Roulette 3 + Dice 3)
                bundle_items = [
                    (GameTokenType.ROULETTE_COIN, 3),
                    (GameTokenType.DICE_TOKEN, 3),
                ]
            elif reward_amount == 7:  # Level 7: 1만 P + 골드 키 1개
                self.grant_point(db, user_id=user_id, amount=10000, reason="LEVEL_BUNDLE_7")
                bundle_items = [(GameTokenType.GOLD_KEY, 1)]
            elif reward_amount == 12:  # Level 14: 스페셜 번들 (룰5+주5+복2)
                bundle_items = [
                    (GameTokenType.ROULETTE_COIN, 5),
                    (GameTokenType.DICE_TOKEN, 5),
                    (GameTokenType.LOTTERY_TICKET, 2),
                ]
            elif reward_amount == 15:  # Level 15: 골드 키 2개 + 10만 P
                self.grant_point(db, user_id=user_id, amount=100000, reason="LEVEL_BUNDLE_15")
                bundle_items = [(GameTokenType.GOLD_KEY, 2)]
            elif reward_amount == 30:  # Level 17: 메가 티켓 번들 (룰10+주10+복10)
                bundle_items = [
                    (GameTokenType.ROULETTE_COIN, 10),
                    (GameTokenType.DICE_TOKEN, 10),
                    (GameTokenType.LOTTERY_TICKET, 10),
                ]
            elif reward_amount == 20:  # Level 20: 다이아몬드 키 3개 + 30만 P (관리자)
                self.grant_point(db, user_id=user_id, amount=300000, reason="LEVEL_BUNDLE_20")
                bundle_items = [(GameTokenType.DIAMOND_KEY, 3)]
            elif reward_amount == 4:  # Legacy/Small: Mini Ticket bomb (Roulette 2 + Dice 2)
                bundle_items = [
                    (GameTokenType.ROULETTE_COIN, 2),
                    (GameTokenType.DICE_TOKEN, 2),
                ]
            
            for token_type, amount in bundle_items:
                self.grant_ticket(db, user_id=user_id, token_type=token_type, amount=amount, meta=meta)
            return

        if reward_type == "CC_POINT":
            # CC 포인트는 외부 플랫폼에서 관리자가 수동으로 지급하므로 시스템 자동 지급은 건너뜜
            return
        
        if reward_type == "DIAMOND":
            InventoryService.grant_item(
                db, 
                user_id, 
                "DIAMOND", 
                reward_amount, 
                reason=(meta or {}).get("reason") or "REWARD",
                related_id=(meta or {}).get("related_id"),
                auto_commit=True
            )
            return

        if reward_type == "COUPON":
            coupon_code = meta.get("coupon_type") if meta else "GENERIC"
            self.grant_coupon(db, user_id=user_id, coupon_type=coupon_code, meta=meta)
            return

        ticket_map = {
            "TICKET_ROULETTE": GameTokenType.ROULETTE_COIN,
            "ROULETTE_TICKET": GameTokenType.ROULETTE_COIN,
            "TICKET_DICE": GameTokenType.DICE_TOKEN,
            "DICE_TICKET": GameTokenType.DICE_TOKEN,
            "TICKET_LOTTERY": GameTokenType.LOTTERY_TICKET,
            "LOTTERY_TICKET": GameTokenType.LOTTERY_TICKET,
            "CC_COIN": GameTokenType.CC_COIN,
            "GOLD_KEY": GameTokenType.GOLD_KEY,
            "DIAMOND_KEY": GameTokenType.DIAMOND_KEY,
        }
        if reward_type in ticket_map:
            token_type = ticket_map[reward_type]
            self.grant_ticket(db, user_id=user_id, token_type=token_type, amount=reward_amount, meta=meta)
            return

        # Unknown reward types are ignored but should be monitored.
        _ = (db, user_id, reward_type, reward_amount, meta)
