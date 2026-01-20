from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.api.deps import get_current_admin_info, get_db
from app.models.game_wallet import UserGameWallet, GameTokenType
from app.models.inventory import UserInventoryItem, UserInventoryLedger
from app.models.user import User
from app.v2.schemas.v2_admin_user import TicketLogDto
from app.v2.schemas.v2_admin_economy import (
    TicketCreateRequest,
    TicketUpdateRequest,
    InventoryItemCreateRequest,
    InventoryItemUpdateRequest,
)
from app.services.inventory_service import InventoryService
from app.services.game_wallet_service import GameWalletService
from app.services.admin_audit_service import AdminAuditService

router = APIRouter()


def check_admin_permission(role: str):
    role_str = str(role or "").upper()
    if role_str == "SUPER_ADMIN":
        role_str = "ADMIN"
    if role_str not in ["ADMIN", "OPERATOR"]:
        raise HTTPException(status_code=403, detail="NOT_AUTHORIZED")


class TicketStatsDto(BaseModel):
    ticketType: str
    totalIssued: int
    totalUsed: int
    currentBalance: int


class UserTicketDto(BaseModel):
    userId: int
    nickname: str
    telegramUsername: str | None
    ticketType: str
    currentBalance: int
    totalUsed: int
    lastUsedAt: datetime | None
    rewardItems: list[str]


class InventoryStatsDto(BaseModel):
    itemType: str
    totalIssued: int
    totalUsed: int
    currentBalance: int


class UserInventoryDto(BaseModel):
    userId: int
    nickname: str
    telegramUsername: str | None
    itemType: str
    itemName: str
    currentQuantity: int
    totalUsed: int
    lastUsedAt: datetime | None
    expiresAt: datetime | None



@router.get("/inventory/logs", response_model=List[TicketLogDto])
def get_inventory_logs(
    userId: Optional[int] = None,
    startDate: Optional[str] = None,
    endDate: Optional[str] = None,
    limit: int = 200,
    db: Session = Depends(get_db),
    admin_info: tuple[int, str] = Depends(get_current_admin_info),
):
    _, admin_role = admin_info
    check_admin_permission(admin_role)

    def parse_iso_dt(value: str) -> datetime:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
        if parsed.tzinfo is not None:
            parsed = parsed.replace(tzinfo=None)
        return parsed

    query = db.query(UserInventoryLedger)
    if userId is not None:
        query = query.filter(UserInventoryLedger.user_id == userId)
    if startDate:
        query = query.filter(UserInventoryLedger.created_at >= parse_iso_dt(startDate))
    if endDate:
        query = query.filter(UserInventoryLedger.created_at <= parse_iso_dt(endDate))

    logs = (
        query.order_by(UserInventoryLedger.created_at.desc())
        .limit(max(1, min(limit, 1000)))
        .all()
    )

    return [
        TicketLogDto(
            id=log.id,
            userId=log.user_id,
            type="GRANT" if log.change_amount > 0 else "USE",
            itemType=log.item_type,
            amount=abs(log.change_amount),
            balanceAfter=log.balance_after,
            reason=log.reason,
            timestamp=log.created_at,
            adminId=log.related_id,
        )
        for log in logs
    ]



@router.post("/inventory/tickets", response_model=TicketLogDto)
def create_ticket_log(
    payload: TicketCreateRequest,
    db: Session = Depends(get_db),
    admin_info: tuple[int, str] = Depends(get_current_admin_info),
):
    admin_id, admin_role = admin_info
    check_admin_permission(admin_role)

    try:
        # 1. Determine if it's a Wallet token or an Inventory item
        # We'll treat common tokens (ROULETTE_COIN, etc.) as wallet tokens
        wallet_token = None
        try:
            wallet_token = GameTokenType(payload.ticket_type)
        except ValueError:
            pass

        balance_after = 0
        if wallet_token:
            # Sync UserGameWallet
            game_wallet_service = GameWalletService()
            balance_after = game_wallet_service.grant_tokens(
                db, 
                payload.user_id, 
                wallet_token, 
                payload.amount, 
                reason=payload.reason,
                auto_commit=False
            )
        else:
            # Sync UserInventoryItem
            item = InventoryService.grant_item(
                db, 
                payload.user_id, 
                payload.ticket_type, 
                payload.amount, 
                reason=payload.reason,
                auto_commit=False
            )
            balance_after = item.quantity

        # 2. Record in UserInventoryLedger (Source of Truth for the Admin UI Table)
        log = UserInventoryLedger(
            user_id=payload.user_id,
            item_type=payload.ticket_type,
            change_amount=payload.amount,
            balance_after=balance_after,
            reason=payload.reason,
            related_id=f"admin_{admin_id}"
        )
        db.add(log)
        db.flush()

        # 3. Audit Log
        AdminAuditService.log(
            db, admin_id, "TICKET_GRANT", "ECONOMY", "TICKET",
            after={"user_id": payload.user_id, "type": payload.ticket_type, "amount": payload.amount, "reason": payload.reason}
        )

        db.commit()
        db.refresh(log)
        return TicketLogDto(
            id=log.id,
            userId=log.user_id,
            itemType=log.item_type,
            changeAmount=log.change_amount,
            balanceAfter=log.balance_after,
            reason=log.reason,
            createdAt=log.created_at
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/inventory/tickets/{ticket_id}", response_model=TicketLogDto)
def update_ticket_log(
    ticket_id: int,
    payload: TicketUpdateRequest,
    db: Session = Depends(get_db),
    admin_info: tuple[int, str] = Depends(get_current_admin_info),
):
    admin_id, admin_role = admin_info
    check_admin_permission(admin_role)

    log = db.query(UserInventoryLedger).filter(UserInventoryLedger.id == ticket_id).first()
    if not log:
        raise HTTPException(status_code=404, detail="TICKET_LOG_NOT_FOUND")

    try:
        before = {"amount": log.change_amount, "reason": log.reason}
        delta = payload.amount - log.change_amount

        # Update log
        log.change_amount = payload.amount
        log.reason = payload.reason

        # Sync Balance
        wallet_token = None
        try:
            wallet_token = GameTokenType(log.item_type)
        except ValueError:
            pass

        if wallet_token:
            wallet = db.query(UserGameWallet).filter(
                UserGameWallet.user_id == log.user_id,
                UserGameWallet.token_type == wallet_token
            ).first()
            if wallet:
                wallet.balance += delta
                log.balance_after = wallet.balance
        else:
            item = db.query(UserInventoryItem).filter(
                UserInventoryItem.user_id == log.user_id,
                UserInventoryItem.item_type == log.item_type
            ).first()
            if item:
                item.quantity += delta
                log.balance_after = item.quantity

        AdminAuditService.log(
            db, admin_id, "TICKET_LOG_UPDATE", "ECONOMY", "TICKET",
            before=before,
            after={"amount": payload.amount, "reason": payload.reason}
        )

        db.commit()
        db.refresh(log)
        return TicketLogDto(
            id=log.id,
            userId=log.user_id,
            itemType=log.item_type,
            changeAmount=log.change_amount,
            balanceAfter=log.balance_after,
            reason=log.reason,
            createdAt=log.created_at
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/inventory/tickets/{ticket_id}")
def delete_ticket_log(
    ticket_id: int,
    db: Session = Depends(get_db),
    admin_info: tuple[int, str] = Depends(get_current_admin_info),
):
    admin_id, admin_role = admin_info
    check_admin_permission(admin_role)

    log = db.query(UserInventoryLedger).filter(UserInventoryLedger.id == ticket_id).first()
    if not log:
        raise HTTPException(status_code=404, detail="TICKET_LOG_NOT_FOUND")

    try:
        # Revert Balance
        wallet_token = None
        try:
            wallet_token = GameTokenType(log.item_type)
        except ValueError:
            pass

        if wallet_token:
            wallet = db.query(UserGameWallet).filter(
                UserGameWallet.user_id == log.user_id,
                UserGameWallet.token_type == wallet_token
            ).first()
            if wallet:
                wallet.balance -= log.change_amount
        else:
            item = db.query(UserInventoryItem).filter(
                UserInventoryItem.user_id == log.user_id,
                UserInventoryItem.item_type == log.item_type
            ).first()
            if item:
                item.quantity -= log.change_amount

        AdminAuditService.log(
            db, admin_id, "TICKET_LOG_DELETE", "ECONOMY", "TICKET",
            before={"user_id": log.user_id, "type": log.item_type, "amount": log.change_amount}
        )

        db.delete(log)
        db.commit()
        return {"success": True}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/inventory/items", response_model=TicketLogDto)
def create_inventory_item_log(
    payload: InventoryItemCreateRequest,
    db: Session = Depends(get_db),
    admin_info: tuple[int, str] = Depends(get_current_admin_info),
):
    admin_id, admin_role = admin_info
    check_admin_permission(admin_role)

    try:
        # Sync UserInventoryItem
        item = InventoryService.grant_item(
            db, 
            payload.user_id, 
            payload.item_type, 
            payload.quantity, 
            payload.reason,
            auto_commit=False
        )
        if payload.expires_at:
            item.expires_at = payload.expires_at

        # Record in UserInventoryLedger
        log = UserInventoryLedger(
            user_id=payload.user_id,
            item_type=payload.item_type,
            change_amount=payload.quantity,
            balance_after=item.quantity,
            reason=payload.reason,
            related_id=f"admin_{admin_id}"
        )
        db.add(log)
        db.flush()

        AdminAuditService.log(
            db, admin_id, "ITEM_LOG_CREATE", "ECONOMY", "INVENTORY",
            after={"user_id": payload.user_id, "type": payload.item_type, "amount": payload.quantity, "reason": payload.reason}
        )

        db.commit()
        db.refresh(log)
        return TicketLogDto(
            id=log.id,
            userId=log.user_id,
            itemType=log.item_type,
            changeAmount=log.change_amount,
            balanceAfter=log.balance_after,
            reason=log.reason,
            createdAt=log.created_at
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/inventory/items/{item_id}", response_model=TicketLogDto)
def update_inventory_item_log(
    item_id: int,
    payload: InventoryItemUpdateRequest,
    db: Session = Depends(get_db),
    admin_info: tuple[int, str] = Depends(get_current_admin_info),
):
    admin_id, admin_role = admin_info
    check_admin_permission(admin_role)

    log = db.query(UserInventoryLedger).filter(UserInventoryLedger.id == item_id).first()
    if not log:
        raise HTTPException(status_code=404, detail="ITEM_LOG_NOT_FOUND")

    try:
        before = {"amount": log.change_amount, "reason": log.reason}
        delta = payload.quantity - log.change_amount

        # Update log
        log.change_amount = payload.quantity
        log.reason = payload.reason

        # Sync Balance
        item = db.query(UserInventoryItem).filter(
            UserInventoryItem.user_id == log.user_id,
            UserInventoryItem.item_type == log.item_type
        ).first()
        if item:
            item.quantity += delta
            if payload.expires_at:
                item.expires_at = payload.expires_at
            log.balance_after = item.quantity

        AdminAuditService.log(
            db, admin_id, "ITEM_LOG_UPDATE", "ECONOMY", "INVENTORY",
            before=before,
            after={"amount": payload.quantity, "reason": payload.reason}
        )

        db.commit()
        db.refresh(log)
        return TicketLogDto(
            id=log.id,
            userId=log.user_id,
            itemType=log.item_type,
            changeAmount=log.change_amount,
            balanceAfter=log.balance_after,
            reason=log.reason,
            createdAt=log.created_at
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/inventory/items/{item_id}")
def delete_inventory_item_log(
    item_id: int,
    db: Session = Depends(get_db),
    admin_info: tuple[int, str] = Depends(get_current_admin_info),
):
    admin_id, admin_role = admin_info
    check_admin_permission(admin_role)

    log = db.query(UserInventoryLedger).filter(UserInventoryLedger.id == item_id).first()
    if not log:
        raise HTTPException(status_code=404, detail="ITEM_LOG_NOT_FOUND")

    try:
        # Revert balance
        item = db.query(UserInventoryItem).filter(
            UserInventoryItem.user_id == log.user_id,
            UserInventoryItem.item_type == log.item_type
        ).first()
        if item:
            item.quantity -= log.change_amount

        AdminAuditService.log(
            db, admin_id, "ITEM_LOG_DELETE", "ECONOMY", "INVENTORY",
            before={"user_id": log.user_id, "type": log.item_type, "amount": log.change_amount}
        )

        db.delete(log)
        db.commit()
        return {"success": True}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/inventory/tickets/stats", response_model=List[TicketStatsDto])
def get_ticket_stats(
    db: Session = Depends(get_db),
    admin_info: tuple[int, str] = Depends(get_current_admin_info),
):
    stats_query = (
        db.query(UserGameWallet.token_type, func.sum(UserGameWallet.balance).label("current_balance"))
        .group_by(UserGameWallet.token_type)
        .all()
    )

    ledger_stats = (
        db.query(
            UserInventoryLedger.item_type,
            func.sum(func.greatest(UserInventoryLedger.change_amount, 0)).label("total_issued"),
            func.sum(func.least(UserInventoryLedger.change_amount, 0)).label("total_used_neg"),
        )
        .group_by(UserInventoryLedger.item_type)
        .all()
    )

    ledger_map = {
        item.item_type: {"issued": int(item.total_issued or 0), "used": abs(int(item.total_used_neg or 0))}
        for item in ledger_stats
    }

    result = []
    for token_type, current_bal in stats_query:
        ledger_data = ledger_map.get(token_type, {"issued": 0, "used": 0})
        result.append(
            TicketStatsDto(
                ticketType=token_type,
                totalIssued=ledger_data["issued"],
                totalUsed=ledger_data["used"],
                currentBalance=int(current_bal or 0),
            )
        )

    return result


@router.get("/inventory/tickets/users", response_model=List[UserTicketDto])
def get_user_tickets(
    search: Optional[str] = None,
    ticket_type: Optional[str] = None,
    page: int = 1,
    limit: int = 20,
    db: Session = Depends(get_db),
    admin_info: tuple[int, str] = Depends(get_current_admin_info),
):
    query = db.query(UserGameWallet, User).join(User, UserGameWallet.user_id == User.id)

    if search:
        query = query.filter(
            (User.nickname.ilike(f"%{search}%")) | (User.telegram_username.ilike(f"%{search}%"))
        )

    if ticket_type:
        query = query.filter(UserGameWallet.token_type == ticket_type)

    offset_val = (page - 1) * limit
    wallets = query.offset(offset_val).limit(limit).all()

    result = []
    for wallet, user in wallets:
        total_used = (
            db.query(func.sum(func.least(UserInventoryLedger.change_amount, 0)))
            .filter(
                UserInventoryLedger.user_id == user.id,
                UserInventoryLedger.item_type == wallet.token_type,
            )
            .scalar()
            or 0
        )

        reward_items = []

        last_used_log = (
            db.query(UserInventoryLedger)
            .filter(
                UserInventoryLedger.user_id == user.id,
                UserInventoryLedger.item_type == wallet.token_type,
                UserInventoryLedger.change_amount < 0,
            )
            .order_by(UserInventoryLedger.created_at.desc())
            .first()
        )

        result.append(
            UserTicketDto(
                userId=user.id,
                nickname=user.nickname or "(미설정)",
                telegramUsername=user.telegram_username,
                ticketType=wallet.token_type,
                currentBalance=int(wallet.balance or 0),
                totalUsed=abs(int(total_used)),
                lastUsedAt=last_used_log.created_at if last_used_log else None,
                rewardItems=reward_items,
            )
        )

    return result


@router.get("/inventory/items/stats", response_model=List[InventoryStatsDto])
def get_inventory_stats(
    db: Session = Depends(get_db),
    admin_info: tuple[int, str] = Depends(get_current_admin_info),
):
    stats_query = (
        db.query(UserInventoryItem.item_type, func.sum(UserInventoryItem.quantity).label("current_balance"))
        .group_by(UserInventoryItem.item_type)
        .all()
    )

    ledger_stats = (
        db.query(
            UserInventoryLedger.item_type,
            func.sum(func.greatest(UserInventoryLedger.change_amount, 0)).label("total_issued"),
            func.sum(func.least(UserInventoryLedger.change_amount, 0)).label("total_used_neg"),
        )
        .group_by(UserInventoryLedger.item_type)
        .all()
    )

    ledger_map = {
        item.item_type: {"issued": int(item.total_issued or 0), "used": abs(int(item.total_used_neg or 0))}
        for item in ledger_stats
    }

    result = []
    for item_type, current_bal in stats_query:
        ledger_data = ledger_map.get(item_type, {"issued": 0, "used": 0})
        result.append(
            InventoryStatsDto(
                itemType=item_type,
                totalIssued=ledger_data["issued"],
                totalUsed=ledger_data["used"],
                currentBalance=int(current_bal or 0),
            )
        )

    return result


@router.get("/inventory/items/users", response_model=List[UserInventoryDto])
def get_user_inventory(
    search: Optional[str] = None,
    item_type: Optional[str] = None,
    page: int = 1,
    limit: int = 20,
    db: Session = Depends(get_db),
    admin_info: tuple[int, str] = Depends(get_current_admin_info),
):
    query = db.query(UserInventoryItem, User).join(User, UserInventoryItem.user_id == User.id)

    if search:
        query = query.filter(
            (User.nickname.ilike(f"%{search}%")) | (User.telegram_username.ilike(f"%{search}%"))
        )

    if item_type:
        query = query.filter(UserInventoryItem.item_type == item_type)

    offset_val = (page - 1) * limit
    items = query.offset(offset_val).limit(limit).all()

    result = []
    for item, user in items:
        total_used = (
            db.query(func.sum(func.least(UserInventoryLedger.change_amount, 0)))
            .filter(
                UserInventoryLedger.user_id == user.id,
                UserInventoryLedger.item_type == item.item_type,
            )
            .scalar()
            or 0
        )

        last_used_log = (
            db.query(UserInventoryLedger)
            .filter(
                UserInventoryLedger.user_id == user.id,
                UserInventoryLedger.item_type == item.item_type,
                UserInventoryLedger.change_amount < 0,
            )
            .order_by(UserInventoryLedger.created_at.desc())
            .first()
        )

        result.append(
            UserInventoryDto(
                userId=user.id,
                nickname=user.nickname or "(미설정)",
                telegramUsername=user.telegram_username,
                itemType=item.item_type,
                itemName=item.item_type,
                currentQuantity=int(item.quantity or 0),
                totalUsed=abs(int(total_used)),
                lastUsedAt=last_used_log.created_at if last_used_log else None,
                expiresAt=item.expires_at,
            )
        )

    return result
