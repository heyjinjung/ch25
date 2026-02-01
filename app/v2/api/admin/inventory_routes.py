from datetime import datetime
import logging
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.api.deps import get_current_admin_info, get_db
from app.v2.models import UserGameWallet, GameTokenType
from app.v2.models import UserGameWalletLedger
from app.v2.models import UserInventoryItem, UserInventoryLedger
from app.v2.models.user import V2User
from app.v2.schemas.v2_admin_user import TicketLogDto
from app.v2.schemas.v2_admin_economy import (
    TicketCreateRequest,
    TicketUpdateRequest,
    InventoryItemCreateRequest,
    InventoryItemUpdateRequest,
)
from app.v2.services import V2AdminAuditService, V2AdminInventoryService

router = APIRouter()
logger = logging.getLogger("uvicorn.error")


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
    user_id: Optional[int] = Query(None, alias="user_id"),
    start_date: Optional[str] = Query(None, alias="start_date"),
    end_date: Optional[str] = Query(None, alias="end_date"),
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

    clamped_limit = max(1, min(limit, 1000))

    wallet_query = db.query(UserGameWalletLedger, V2User).outerjoin(
        V2User, UserGameWalletLedger.user_id == V2User.id
    )
    if user_id is not None:
        wallet_query = wallet_query.filter(UserGameWalletLedger.user_id == user_id)
    if start_date:
        wallet_query = wallet_query.filter(UserGameWalletLedger.created_at >= parse_iso_dt(start_date))
    if end_date:
        wallet_query = wallet_query.filter(UserGameWalletLedger.created_at <= parse_iso_dt(end_date))

    wallet_results = (
        wallet_query.order_by(UserGameWalletLedger.created_at.desc())
        .limit(clamped_limit)
        .all()
    )

    inventory_query = db.query(UserInventoryLedger, V2User).outerjoin(
        V2User, UserInventoryLedger.user_id == V2User.id
    )
    if user_id is not None:
        inventory_query = inventory_query.filter(UserInventoryLedger.user_id == user_id)
    if start_date:
        inventory_query = inventory_query.filter(UserInventoryLedger.created_at >= parse_iso_dt(start_date))
    if end_date:
        inventory_query = inventory_query.filter(UserInventoryLedger.created_at <= parse_iso_dt(end_date))

    inventory_results = (
        inventory_query.order_by(UserInventoryLedger.created_at.desc())
        .limit(clamped_limit)
        .all()
    )

    logger.info(
        "admin.inventory_logs fetched user_id=%s start_date=%s end_date=%s wallet_count=%s inventory_count=%s",
        user_id,
        start_date,
        end_date,
        len(wallet_results),
        len(inventory_results),
    )

    combined = []
    for log, user in wallet_results:
        combined.append(
            TicketLogDto(
                id=log.id,
                userId=log.user_id,
                nickname=(user.nickname if user else "") or "",
                type="GRANT" if log.delta > 0 else "USE",
                itemType=log.token_type.value if hasattr(log.token_type, "value") else str(log.token_type),
                amount=abs(log.delta),
                balanceAfter=log.balance_after,
                reason=log.reason or "",
                timestamp=log.created_at,
                adminId=log.label,
            )
        )

    for log, user in inventory_results:
        combined.append(
            TicketLogDto(
                id=log.id,
                userId=log.user_id,
                nickname=(user.nickname if user else "") or "",
                type="GRANT" if log.change_amount > 0 else "USE",
                itemType=log.item_type,
                amount=abs(log.change_amount),
                balanceAfter=log.balance_after,
                reason=log.reason,
                timestamp=log.created_at,
                adminId=log.related_id,
            )
        )

    combined.sort(key=lambda item: item.timestamp, reverse=True)
    return combined[:clamped_limit]



@router.post("/inventory/tickets", response_model=TicketLogDto)
def create_ticket_log(
    payload: TicketCreateRequest,
    db: Session = Depends(get_db),
    admin_info: tuple[int, str] = Depends(get_current_admin_info),
):
    admin_id, admin_role = admin_info
    check_admin_permission(admin_role)

    # FK now references v2_user (migrated from legacy user)
    user = db.query(V2User).filter(V2User.id == payload.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="USER_NOT_FOUND")

    try:
        # 1. Ticket grants must be wallet tokens (V2 SoT)
        try:
            wallet_token = GameTokenType(payload.ticket_type)
        except ValueError as exc:
            raise HTTPException(status_code=400, detail="INVALID_TICKET_TYPE") from exc

        logger.warning(
            "admin.ticket_grant payload_type=%s wallet_token=%s user_id=%s amount=%s",
            payload.ticket_type,
            wallet_token.value,
            payload.user_id,
            payload.amount,
        )

        # Sync UserGameWallet
        balance_after = V2AdminInventoryService.grant_tokens(
            db,
            payload.user_id,
            wallet_token,
            payload.amount,
            reason=payload.reason,
            auto_commit=False,
        )

        # 2. Record in UserInventoryLedger (Source of Truth for the Admin UI Table)
        log = UserInventoryLedger(
            user_id=payload.user_id,
            item_type=wallet_token.value,
            change_amount=payload.amount,
            balance_after=balance_after,
            reason=payload.reason,
            related_id=f"admin_{admin_id}"
        )
        db.add(log)
        db.flush()

        # 3. Audit Log
        V2AdminAuditService.log(
            db, admin_id, "TICKET_GRANT", "ECONOMY", "TICKET",
            after={"user_id": payload.user_id, "type": payload.ticket_type, "amount": payload.amount, "reason": payload.reason}
        )

        db.commit()
        db.refresh(log)
        user = db.query(V2User).filter(V2User.id == log.user_id).first()
        return TicketLogDto(
            id=log.id,
            userId=log.user_id,
            nickname=(user.nickname if user else ""),
            type="GRANT" if log.change_amount > 0 else "USE",
            itemType=log.item_type,
            amount=abs(log.change_amount),
            balanceAfter=log.balance_after,
            reason=log.reason,
            timestamp=log.created_at
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

        # Sync Balance (wallet-only)
        try:
            wallet_token = GameTokenType(log.item_type)
        except ValueError as exc:
            raise HTTPException(status_code=400, detail="INVALID_TICKET_TYPE") from exc

        wallet = db.query(UserGameWallet).filter(
            UserGameWallet.user_id == log.user_id,
            UserGameWallet.token_type == wallet_token
        ).first()
        if wallet:
            wallet.balance += delta
            log.balance_after = wallet.balance

        V2AdminAuditService.log(
            db, admin_id, "TICKET_LOG_UPDATE", "ECONOMY", "TICKET",
            before=before,
            after={"amount": payload.amount, "reason": payload.reason}
        )

        db.commit()
        db.refresh(log)
        user = db.query(V2User).filter(V2User.id == log.user_id).first()
        return TicketLogDto(
            id=log.id,
            userId=log.user_id,
            nickname=(user.nickname if user else ""),
            type="GRANT" if log.change_amount > 0 else "USE",
            itemType=log.item_type,
            amount=abs(log.change_amount),
            balanceAfter=log.balance_after,
            reason=log.reason,
            timestamp=log.created_at
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
        # Revert Balance (wallet-only)
        try:
            wallet_token = GameTokenType(log.item_type)
        except ValueError as exc:
            raise HTTPException(status_code=400, detail="INVALID_TICKET_TYPE") from exc

        wallet = db.query(UserGameWallet).filter(
            UserGameWallet.user_id == log.user_id,
            UserGameWallet.token_type == wallet_token
        ).first()
        if wallet:
            wallet.balance -= log.change_amount

        V2AdminAuditService.log(
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

    # FK now references v2_user (migrated from legacy user)
    user = db.query(V2User).filter(V2User.id == payload.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="USER_NOT_FOUND")

    try:
        # Sync UserInventoryItem
        item = V2AdminInventoryService.grant_item(
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

        V2AdminAuditService.log(
            db, admin_id, "ITEM_LOG_CREATE", "ECONOMY", "INVENTORY",
            after={"user_id": payload.user_id, "type": payload.item_type, "amount": payload.quantity, "reason": payload.reason}
        )

        db.commit()
        db.refresh(log)
        user = db.query(V2User).filter(V2User.id == log.user_id).first()
        return TicketLogDto(
            id=log.id,
            userId=log.user_id,
            nickname=(user.nickname if user else ""),
            type="GRANT" if log.change_amount > 0 else "USE",
            itemType=log.item_type,
            amount=abs(log.change_amount),
            balanceAfter=log.balance_after,
            reason=log.reason,
            timestamp=log.created_at
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

        V2AdminAuditService.log(
            db, admin_id, "ITEM_LOG_UPDATE", "ECONOMY", "INVENTORY",
            before=before,
            after={"amount": payload.quantity, "reason": payload.reason}
        )

        db.commit()
        db.refresh(log)
        user = db.query(V2User).filter(V2User.id == log.user_id).first()
        return TicketLogDto(
            id=log.id,
            userId=log.user_id,
            nickname=(user.nickname if user else ""),
            type="GRANT" if log.change_amount > 0 else "USE",
            itemType=log.item_type,
            amount=abs(log.change_amount),
            balanceAfter=log.balance_after,
            reason=log.reason,
            timestamp=log.created_at
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

        V2AdminAuditService.log(
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
    query = db.query(UserGameWallet, V2User).join(V2User, UserGameWallet.user_id == V2User.id)

    if search:
        query = query.filter(
            (V2User.nickname.ilike(f"%{search}%")) | (V2User.telegram_username.ilike(f"%{search}%"))
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
    query = db.query(UserInventoryItem, V2User).join(V2User, UserInventoryItem.user_id == V2User.id)

    if search:
        query = query.filter(
            (V2User.nickname.ilike(f"%{search}%")) | (V2User.telegram_username.ilike(f"%{search}%"))
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


# ─────────────────────────────────────────────────────────────────
# 8.5 재고 조정, Gifticon 배송 추적, 재고 부족 알림
# ─────────────────────────────────────────────────────────────────

class StockAdjustRequest(BaseModel):
    """재고 수량 조정 요청"""
    user_id: int
    item_type: str
    delta: int  # 양수: 증가, 음수: 감소
    reason: str


class StockAdjustResponse(BaseModel):
    """재고 수량 조정 응답"""
    success: bool
    user_id: int
    item_type: str
    old_quantity: int
    new_quantity: int
    delta: int
    message: str


class GifticonDeliveryDto(BaseModel):
    """Gifticon 배송 상태"""
    id: int
    user_id: int
    nickname: str
    item_type: str
    item_name: str
    status: str  # PENDING, DELIVERED, FAILED
    created_at: datetime
    delivered_at: Optional[datetime] = None
    delivery_code: Optional[str] = None
    error_message: Optional[str] = None


class GifticonDeliveryListResponse(BaseModel):
    """Gifticon 배송 목록 응답"""
    total: int
    pending: int
    delivered: int
    failed: int
    items: List[GifticonDeliveryDto]


class StockAlertDto(BaseModel):
    """재고 부족 알림"""
    item_type: str
    current_stock: int
    threshold: int
    is_critical: bool
    last_updated: Optional[datetime] = None


class StockAlertListResponse(BaseModel):
    """재고 부족 알림 목록"""
    total_alerts: int
    critical_count: int
    alerts: List[StockAlertDto]


@router.post("/inventory/adjust-stock", response_model=StockAdjustResponse)
def adjust_stock(
    payload: StockAdjustRequest,
    db: Session = Depends(get_db),
    admin_info: tuple[int, str] = Depends(get_current_admin_info),
):
    """
    재고 수량 직접 조정 (관리자)

    - 양수 delta: 재고 증가
    - 음수 delta: 재고 감소
    - 감시 로그 기록
    """
    admin_id, admin_role = admin_info
    check_admin_permission(admin_role)

    if payload.delta == 0:
        raise HTTPException(status_code=400, detail="DELTA_CANNOT_BE_ZERO")

    # 유저 확인
    user = db.get(V2User, payload.user_id)
    if not user:
        raise HTTPException(status_code=404, detail="USER_NOT_FOUND")

    # 기존 인벤토리 아이템 조회
    item = db.query(UserInventoryItem).filter(
        UserInventoryItem.user_id == payload.user_id,
        UserInventoryItem.item_type == payload.item_type,
    ).first()

    old_quantity = 0
    if item:
        old_quantity = int(item.quantity or 0)
        new_quantity = max(0, old_quantity + payload.delta)
        item.quantity = new_quantity
    else:
        if payload.delta < 0:
            raise HTTPException(status_code=400, detail="CANNOT_REDUCE_NONEXISTENT_ITEM")
        # 새 아이템 생성
        new_quantity = payload.delta
        item = UserInventoryItem(
            user_id=payload.user_id,
            item_type=payload.item_type,
            quantity=new_quantity,
        )
        db.add(item)

    # 로그 기록
    log = UserInventoryLedger(
        user_id=payload.user_id,
        item_type=payload.item_type,
        change_amount=payload.delta,
        balance_after=new_quantity,
        reason=f"ADMIN_ADJUST: {payload.reason}",
        related_id=f"admin_{admin_id}",
    )
    db.add(log)

    # 감사 로그
    V2AdminAuditService.log(
        db, admin_id, "STOCK_ADJUST", "INVENTORY", f"{payload.user_id}:{payload.item_type}",
        before={"quantity": old_quantity},
        after={"quantity": new_quantity, "delta": payload.delta, "reason": payload.reason}
    )

    db.commit()

    logger.info(
        f"[ADMIN] Stock adjust: user_id={payload.user_id}, item={payload.item_type}, "
        f"old={old_quantity}, new={new_quantity}, delta={payload.delta}, admin_id={admin_id}"
    )

    return StockAdjustResponse(
        success=True,
        user_id=payload.user_id,
        item_type=payload.item_type,
        old_quantity=old_quantity,
        new_quantity=new_quantity,
        delta=payload.delta,
        message="재고가 조정되었습니다.",
    )


@router.get("/inventory/gifticon/deliveries", response_model=GifticonDeliveryListResponse)
def list_gifticon_deliveries(
    status: Optional[str] = Query(None, description="PENDING, DELIVERED, FAILED"),
    user_id: Optional[int] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    admin_info: tuple[int, str] = Depends(get_current_admin_info),
):
    """
    Gifticon 배송 목록 조회

    - status: PENDING(대기중), DELIVERED(배송됨), FAILED(실패)
    - 전체 / 상태별 통계 제공
    """
    # Gifticon 관련 아이템 타입 (예: GIFTICON_ prefix)
    gifticon_types = ["GIFTICON", "GIFTICON_STARBUCKS", "GIFTICON_CU", "GIFTICON_GS25"]

    query = db.query(UserInventoryLedger, V2User).outerjoin(
        V2User, UserInventoryLedger.user_id == V2User.id
    ).filter(
        UserInventoryLedger.item_type.in_(gifticon_types)
    )

    if user_id:
        query = query.filter(UserInventoryLedger.user_id == user_id)

    # 상태별 필터링 (reason 필드에서 상태 추출)
    if status:
        if status == "PENDING":
            query = query.filter(~UserInventoryLedger.reason.like("%DELIVERED%"))
            query = query.filter(~UserInventoryLedger.reason.like("%FAILED%"))
        elif status == "DELIVERED":
            query = query.filter(UserInventoryLedger.reason.like("%DELIVERED%"))
        elif status == "FAILED":
            query = query.filter(UserInventoryLedger.reason.like("%FAILED%"))

    logs = query.order_by(UserInventoryLedger.created_at.desc()).limit(limit).all()

    # 통계 계산
    all_logs = db.query(UserInventoryLedger).filter(
        UserInventoryLedger.item_type.in_(gifticon_types)
    ).all()

    total = len(all_logs)
    pending = sum(1 for l in all_logs if "DELIVERED" not in (l.reason or "") and "FAILED" not in (l.reason or ""))
    delivered = sum(1 for l in all_logs if "DELIVERED" in (l.reason or ""))
    failed = sum(1 for l in all_logs if "FAILED" in (l.reason or ""))

    items = []
    for log, user in logs:
        # 상태 추출
        reason = log.reason or ""
        if "DELIVERED" in reason:
            item_status = "DELIVERED"
        elif "FAILED" in reason:
            item_status = "FAILED"
        else:
            item_status = "PENDING"

        items.append(GifticonDeliveryDto(
            id=log.id,
            user_id=log.user_id,
            nickname=user.nickname if user else "(알 수 없음)",
            item_type=log.item_type,
            item_name=log.item_type,
            status=item_status,
            created_at=log.created_at,
            delivered_at=None,  # 실제 구현 시 별도 필드 필요
            delivery_code=None,
            error_message=reason if "FAILED" in reason else None,
        ))

    return GifticonDeliveryListResponse(
        total=total,
        pending=pending,
        delivered=delivered,
        failed=failed,
        items=items,
    )


@router.get("/inventory/stock-alerts", response_model=StockAlertListResponse)
def get_stock_alerts(
    threshold: int = Query(10, ge=0, description="부족 기준 수량"),
    db: Session = Depends(get_db),
    admin_info: tuple[int, str] = Depends(get_current_admin_info),
):
    """
    재고 부족 알림 조회

    - threshold 이하인 아이템 타입 목록
    - critical: threshold의 절반 이하
    """
    # 아이템 타입별 전체 재고 집계
    stock_stats = db.query(
        UserInventoryItem.item_type,
        func.sum(UserInventoryItem.quantity).label("total_stock"),
        func.max(UserInventoryItem.updated_at).label("last_updated"),
    ).group_by(UserInventoryItem.item_type).all()

    alerts = []
    critical_count = 0
    critical_threshold = threshold // 2

    for stat in stock_stats:
        total_stock = int(stat.total_stock or 0)

        if total_stock <= threshold:
            is_critical = total_stock <= critical_threshold
            if is_critical:
                critical_count += 1

            alerts.append(StockAlertDto(
                item_type=stat.item_type,
                current_stock=total_stock,
                threshold=threshold,
                is_critical=is_critical,
                last_updated=stat.last_updated,
            ))

    # 심각도 순 정렬
    alerts.sort(key=lambda x: (not x.is_critical, x.current_stock))

    return StockAlertListResponse(
        total_alerts=len(alerts),
        critical_count=critical_count,
        alerts=alerts,
    )
