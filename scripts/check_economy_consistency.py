import os
import sys
import argparse
from datetime import datetime

from sqlalchemy import func

# Add project root to sys.path
sys.path.append(os.getcwd())

from app.db.session import SessionLocal
from app.models.user import User
from app.models.vault_withdrawal_request import VaultWithdrawalRequest
from app.models.game_wallet import UserGameWallet
from app.models.inventory import UserInventoryItem


def main() -> int:
    parser = argparse.ArgumentParser(description="Check economy consistency (vault, wallets, inventory).")
    parser.add_argument("--limit-users", type=int, default=5000)
    parser.add_argument("--verbose", action="store_true")
    args = parser.parse_args()

    now = datetime.utcnow()
    issues: list[str] = []

    db = SessionLocal()
    try:
        # 1) Vault: reserved (sum PENDING) must not exceed total locked.
        user_ids = (
            db.query(User.id)
            .order_by(User.id.desc())
            .limit(max(int(args.limit_users), 1))
            .all()
        )
        user_ids = [uid for (uid,) in user_ids]

        for user_id in user_ids:
            user = db.get(User, user_id)
            if not user:
                continue

            total = int(getattr(user, "vault_locked_balance", 0) or 0)
            reserved = int(
                db.query(func.coalesce(func.sum(VaultWithdrawalRequest.amount), 0))
                .filter(VaultWithdrawalRequest.user_id == user_id, VaultWithdrawalRequest.status == "PENDING")
                .scalar()
                or 0
            )

            if reserved > total:
                issues.append(f"[VAULT] user_id={user_id} reserved({reserved}) > total({total})")

            expires_at = getattr(user, "vault_locked_expires_at", None)
            if expires_at is not None and expires_at <= now and total > 0:
                issues.append(f"[VAULT] user_id={user_id} expired_at({expires_at}) but total({total}) > 0")

            # Detect obviously invalid request amounts.
            bad_pending = (
                db.query(VaultWithdrawalRequest)
                .filter(
                    VaultWithdrawalRequest.user_id == user_id,
                    VaultWithdrawalRequest.status == "PENDING",
                    VaultWithdrawalRequest.amount < 10_000,
                )
                .count()
            )
            if bad_pending:
                issues.append(f"[VAULT] user_id={user_id} has {bad_pending} pending requests with amount < 10000")

        # 2) Game wallets: no negative balances.
        neg_wallets = (
            db.query(UserGameWallet)
            .filter(UserGameWallet.balance < 0)
            .order_by(UserGameWallet.user_id.asc())
            .limit(200)
            .all()
        )
        for w in neg_wallets:
            issues.append(f"[WALLET] user_id={w.user_id} token={w.token_type} balance={int(w.balance)}")

        # 3) Inventory items: no negative quantity.
        neg_items = (
            db.query(UserInventoryItem)
            .filter(UserInventoryItem.quantity < 0)
            .order_by(UserInventoryItem.user_id.asc())
            .limit(200)
            .all()
        )
        for it in neg_items:
            issues.append(f"[INVENTORY] user_id={it.user_id} item_type={it.item_type} quantity={int(it.quantity)}")

        if issues:
            print("[FAIL] Consistency issues detected:")
            for line in issues[:500]:
                print(" -", line)
            if len(issues) > 500:
                print(f" ... and {len(issues) - 500} more")
            return 1

        print("[OK] No obvious economy consistency issues detected.")
        return 0
    finally:
        db.close()


if __name__ == "__main__":
    raise SystemExit(main())
