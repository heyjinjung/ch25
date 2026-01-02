"""Admin endpoints for lightweight economy stats (shop/voucher/idempotency).

This intentionally stays minimal and uses existing ledgers/tables.
"""

from fastapi import APIRouter, Depends
from sqlalchemy import case, func, select
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.models.idempotency import UserIdempotencyKey
from app.models.inventory import UserInventoryLedger

router = APIRouter(prefix="/admin/api/economy", tags=["admin-economy"])


@router.get("/stats")
def get_stats(db: Session = Depends(get_db)):
    # Shop purchases (voucher grant side) are recorded in inventory ledger as reason: SHOP_PURCHASE:<sku>
    shop_purchase_counts = db.execute(
        select(
            UserInventoryLedger.reason,
            func.count(UserInventoryLedger.id).label("count"),
            func.sum(UserInventoryLedger.change_amount).label("sum_delta"),
        )
        .where(UserInventoryLedger.reason.like("SHOP_PURCHASE:%"))
        .group_by(UserInventoryLedger.reason)
        .order_by(func.count(UserInventoryLedger.id).desc())
    ).all()

    voucher_use_counts = db.execute(
        select(
            UserInventoryLedger.item_type,
            func.count(UserInventoryLedger.id).label("count"),
            func.sum(func.abs(UserInventoryLedger.change_amount)).label("sum_abs_delta"),
        )
        .where(UserInventoryLedger.reason == "USE_VOUCHER")
        .group_by(UserInventoryLedger.item_type)
        .order_by(func.count(UserInventoryLedger.id).desc())
    ).all()

    idempotency_by_scope = db.execute(
        select(
            UserIdempotencyKey.scope,
            func.count(UserIdempotencyKey.id).label("count"),
            func.sum(case((UserIdempotencyKey.status == "COMPLETED", 1), else_=0)).label("completed"),
            func.sum(case((UserIdempotencyKey.status == "IN_PROGRESS", 1), else_=0)).label("in_progress"),
            func.sum(case((UserIdempotencyKey.status == "FAILED", 1), else_=0)).label("failed"),
        )
        .group_by(UserIdempotencyKey.scope)
        .order_by(func.count(UserIdempotencyKey.id).desc())
    ).all()

    return {
        "shop_purchases": [
            {
                "reason": r.reason,
                "count": int(r.count or 0),
                "sum_delta": int(r.sum_delta or 0),
            }
            for r in shop_purchase_counts
        ],
        "voucher_uses": [
            {
                "item_type": r.item_type,
                "count": int(r.count or 0),
                "sum_abs_delta": int(r.sum_abs_delta or 0),
            }
            for r in voucher_use_counts
        ],
        "idempotency": [
            {
                "scope": r.scope,
                "count": int(r.count or 0),
                "completed": int(r.completed or 0),
                "in_progress": int(r.in_progress or 0),
                "failed": int(r.failed or 0),
            }
            for r in idempotency_by_scope
        ],
    }
