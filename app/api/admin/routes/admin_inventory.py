"""Admin endpoints for inventory CS (items/ledgers/adjust).

Note: This is for stack-type inventory items (including vouchers and DIAMOND inventory SoT).
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import desc, select
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_current_admin_id
from app.models.inventory import UserInventoryItem, UserInventoryLedger
from app.models.user import User
from app.services.inventory_service import InventoryService
from app.services.audit_service import AuditService
from app.services.admin_user_identity_service import resolve_user_id_by_identifier
from app.services.admin_user_identity_service import build_admin_user_summary

router = APIRouter(prefix="/admin/api/inventory", tags=["admin-inventory"])


@router.get("/users/{user_id}")
def get_user_inventory(user_id: int, limit: int = 50, db: Session = Depends(get_db)):
    limit = min(max(limit, 1), 200)
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="USER_NOT_FOUND")

    items = db.scalars(select(UserInventoryItem).where(UserInventoryItem.user_id == user_id)).all()
    ledger = (
        db.scalars(
            select(UserInventoryLedger)
            .where(UserInventoryLedger.user_id == user_id)
            .order_by(desc(UserInventoryLedger.id))
            .limit(limit)
        )
        .all()
    )

    return {
        "user_summary": build_admin_user_summary(user),
        "user": {
            "id": user.id,
            "external_id": user.external_id,
            "telegram_id": user.telegram_id,
            "telegram_username": user.telegram_username,
            "nickname": user.nickname,
        },
        "items": [
            {
                "item_type": i.item_type,
                "quantity": int(i.quantity),
                "updated_at": i.updated_at,
            }
            for i in items
        ],
        "ledger": [
            {
                "id": l.id,
                "item_type": l.item_type,
                "change_amount": int(l.change_amount),
                "balance_after": int(l.balance_after),
                "reason": l.reason,
                "related_id": l.related_id,
                "created_at": l.created_at,
            }
            for l in ledger
        ],
    }


@router.get("/users/by-identifier/{identifier}")
def get_user_inventory_by_identifier(identifier: str, limit: int = 50, db: Session = Depends(get_db)):
    user_id = resolve_user_id_by_identifier(db, identifier)
    return get_user_inventory(user_id=user_id, limit=limit, db=db)


@router.get("/users/{user_id}/ledger")
def list_user_inventory_ledger(user_id: int, limit: int = 50, db: Session = Depends(get_db)):
    limit = min(max(limit, 1), 200)
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="USER_NOT_FOUND")

    ledger = (
        db.scalars(
            select(UserInventoryLedger)
            .where(UserInventoryLedger.user_id == user_id)
            .order_by(desc(UserInventoryLedger.id))
            .limit(limit)
        )
        .all()
    )

    return [
        {
            "id": l.id,
            "item_type": l.item_type,
            "change_amount": int(l.change_amount),
            "balance_after": int(l.balance_after),
            "reason": l.reason,
            "related_id": l.related_id,
            "created_at": l.created_at,
        }
        for l in ledger
    ]


@router.post("/users/{user_id}/adjust")
def adjust_user_inventory(
    user_id: int,
    payload: dict,
    db: Session = Depends(get_db),
    admin_id: int = Depends(get_current_admin_id),
):
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="USER_NOT_FOUND")

    item_type = payload.get("item_type")
    delta = payload.get("delta")
    note = payload.get("note")

    if not isinstance(item_type, str) or not item_type.strip():
        raise HTTPException(status_code=400, detail="MISSING_ITEM_TYPE")
    if not isinstance(delta, int) or delta == 0:
        raise HTTPException(status_code=400, detail="INVALID_DELTA")
    if note is not None and not isinstance(note, str):
        raise HTTPException(status_code=400, detail="INVALID_NOTE")

    clean_note = (note or "").strip()
    # Keep reason within 100 chars.
    reason = "ADMIN_ADJUST" if not clean_note else f"ADMIN_ADJUST:{clean_note[:70]}"
    related_id = f"admin:{admin_id}"

    before_item = db.scalar(
        select(UserInventoryItem).where(
            UserInventoryItem.user_id == user_id,
            UserInventoryItem.item_type == item_type.strip(),
        )
    )
    before_qty = int(getattr(before_item, "quantity", 0) or 0)

    if delta > 0:
        item = InventoryService.grant_item(
            db,
            user_id=user_id,
            item_type=item_type.strip(),
            amount=delta,
            reason=reason,
            related_id=related_id,
            auto_commit=False,
        )
    else:
        item = InventoryService.consume_item(
            db,
            user_id=user_id,
            item_type=item_type.strip(),
            amount=abs(delta),
            reason=reason,
            related_id=related_id,
            auto_commit=False,
        )

    AuditService.record_admin_audit(
        db,
        admin_id=admin_id,
        action="INVENTORY_ADMIN_ADJUST",
        target_type="User",
        target_id=str(user_id),
        before={
            "item_type": item_type.strip(),
            "quantity": before_qty,
        },
        after={
            "item_type": item.item_type,
            "delta": int(delta),
            "quantity": int(item.quantity),
            "reason": reason,
            "note": clean_note,
            "related_id": related_id,
        },
    )

    db.commit()
    db.refresh(item)

    return {
        "success": True,
        "user_id": user_id,
        "item_type": item.item_type,
        "quantity": int(item.quantity),
    }


@router.post("/users/by-identifier/{identifier}/adjust")
def adjust_user_inventory_by_identifier(
    identifier: str,
    payload: dict,
    db: Session = Depends(get_db),
    admin_id: int = Depends(get_current_admin_id),
):
    user_id = resolve_user_id_by_identifier(db, identifier)
    return adjust_user_inventory(user_id=user_id, payload=payload, db=db, admin_id=admin_id)

