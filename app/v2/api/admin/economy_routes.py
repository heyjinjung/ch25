from datetime import datetime
import logging
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import func, case
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.deps import get_current_admin_info, get_db
from app.models.external_ranking_daily_deposit_delta import ExternalRankingDailyDepositDelta
from app.models.user import User
from app.models.vault_withdrawal_request import VaultWithdrawalRequest
from app.v2.services import V2AdminAuditService, V2AdminEconomyService, V2AdminInventoryService
from app.v2.schemas.v2_admin_economy import (
    AdminDepositCreateRequest,
    AdminDepositDto,
    AdminDepositLogDto,
    AdminDepositUpdateRequest,
    AdminProductDto,
    AdminProductCreateRequest,
    AdminProductUpdateRequest,
    AdminWithdrawalDto,
    AdminWithdrawalRejectRequest,
    TicketStatDto,
    UserTicketDto,
    InventoryStatDto,
    UserInventoryItemDto,
    TicketCreateRequest,
    TicketUpdateRequest,
    InventoryItemCreateRequest,
    InventoryItemUpdateRequest,
    TicketLogDto,
)
from app.models.game_wallet import UserGameWallet, GameTokenType
from app.models.game_wallet_ledger import UserGameWalletLedger
from app.models.inventory import UserInventoryItem, UserInventoryLedger
from sqlalchemy import desc, text

router = APIRouter()
logger = logging.getLogger("uvicorn.error")


def _product_id_from_sku(sku: str) -> int:
    import zlib

    return int(zlib.crc32(str(sku or "").encode("utf-8")) & 0x7FFFFFFF)


def _classify_product_category(reward_type: str) -> str:
    rt = str(reward_type or "").upper()
    if rt in {"ROULETTE_TICKET", "DICE_TICKET", "LOTTERY_TICKET"}:
        return "GAME_TICKET"
    if rt == "VAULT" or rt in {"POINT", "CC_POINT"}:
        return "VAULT"
    if rt in {"GOLD_KEY_TICKET", "DIAMOND_TICKET"}:
        return "PREMIUM"
    if rt in {"GOLD_KEY_FRAGMENT", "DIAMOND_FRAGMENT"}:
        return "FRAGMENT"
    if rt in {"PUZZLE_C1", "PUZZLE_C2", "PUZZLE_J", "PUZZLE_M"}:
        return "PUZZLE"
    if rt == "DIAMOND":
        return "DIAMOND"
    if "GIFTICON" in rt:
        return "GIFTICON"
    if rt == "NONE":
        return "SPECIAL"
    return "OTHER"


def _build_sot_shop_catalog_defaults() -> list[dict]:
    """SoT 전체 상품을 최소 기본값으로 생성한다.

    Storage: UiConfig key `v2_shop_products` -> {"products": [..]}
    
    교환 비율 기준:
    - VAULT: 기본 화폐 (1P = 1원 개념)
    - 게임 티켓: 100P (룰렛/다이스/복권)
    - 프리미엄 티켓: 1000P (골드/다이아)
    - 조각: 500P
    - 퍼즐: 300P
    - 다이아몬드: 2000P
    - 기프티콘: 실제 가치 기준 (5000원권 = 5000P)
    """

    # Format: (reward_type, label, reward_amount, cost_amount, cost_type)
    defaults: list[tuple[str, str, int, int, str]] = [
        # 게임 티켓 (100P)
        ("ROULETTE_TICKET", "룰렛 티켓", 1, 100, "VAULT"),
        ("DICE_TICKET", "다이스 티켓", 1, 100, "VAULT"),
        ("LOTTERY_TICKET", "복권 티켓", 1, 100, "VAULT"),
        
        # 금고 포인트 (직접 교환)
        ("VAULT", "금고 포인트", 100, 100, "VAULT"),
        
        # 프리미엄 티켓 (1000P)
        ("GOLD_KEY_TICKET", "골드 열쇠 티켓", 1, 1000, "VAULT"),
        ("DIAMOND_TICKET", "다이아몬드 티켓", 1, 1000, "VAULT"),
        
        # 조각 (500P)
        ("GOLD_KEY_FRAGMENT", "골드 열쇠 조각", 1, 500, "VAULT"),
        ("DIAMOND_FRAGMENT", "다이아몬드 조각", 1, 500, "VAULT"),
        
        # 퍼즐 (300P)
        ("PUZZLE_C1", "퍼즐 조각 C1", 1, 300, "VAULT"),
        ("PUZZLE_C2", "퍼즐 조각 C2", 1, 300, "VAULT"),
        ("PUZZLE_J", "퍼즐 조각 J", 1, 300, "VAULT"),
        ("PUZZLE_M", "퍼즐 조각 M", 1, 300, "VAULT"),
        
        # 다이아몬드 (2000P)
        ("DIAMOND", "다이아몬드", 1, 2000, "VAULT"),
        
        # 기프티콘 (실제 가치 기준)
        ("CHICKEN_GIFTICON_5000", "치킨 기프티콘 5천원", 1, 5000, "VAULT"),
        ("CHICKEN_GIFTICON_10000", "치킨 기프티콘 1만원", 1, 10000, "VAULT"),
        ("STARBUCKS_GIFTICON_2000", "스타벅스 기프티콘 2천원", 1, 2000, "VAULT"),
        ("STARBUCKS_GIFTICON_10000", "스타벅스 기프티콘 1만원", 1, 10000, "VAULT"),
        ("PIZZA_GIFTICON_5000", "피자 기프티콘 5천원", 1, 5000, "VAULT"),
        ("PIZZA_GIFTICON_10000", "피자 기프티콘 1만원", 1, 10000, "VAULT"),
        ("GOOGLE_GIFTICON_5000", "구글 기프트카드 5천원", 1, 5000, "VAULT"),
        ("GOOGLE_GIFTICON_10000", "구글 기프트카드 1만원", 1, 10000, "VAULT"),
        
        # 특수 (교환 불가)
        ("NONE", "없음(특수)", 1, 999999, "VAULT"),
    ]

    products: list[dict] = []
    for reward_type, label, reward_amount, cost_amount, cost_type in defaults:
        products.append(
            {
                "sku": f"SOT_{reward_type}",
                "name": label,
                "cost_type": cost_type,
                "cost_amount": cost_amount,
                "reward_type": reward_type,
                "reward_amount": reward_amount,
                "is_visible": True,
            }
        )
    return products


def _load_v2_shop_products(db: Session) -> list[dict]:
    return V2AdminEconomyService.load_shop_products(db)


def _save_v2_shop_products(db: Session, products: list[dict], *, admin_id: int) -> None:
    V2AdminEconomyService.save_shop_products(db, products, admin_id=admin_id)


class _AdminProductStatusPayload(BaseModel):
    is_visible: bool = Field(..., validation_alias="isVisible", serialization_alias="isVisible")

    model_config = ConfigDict(populate_by_name=True)


class _AdminProductPricePayload(BaseModel):
    price: int



@router.get("/economy/transaction-types")
def get_wallet_transaction_types(
    admin_info: tuple[int, str] = Depends(get_current_admin_info),
):
    return [
        {"value": "ROULETTE_TICKET", "label": "룰렛 티켓", "group": "wallet"},
        {"value": "DICE_TICKET", "label": "다이스 티켓", "group": "wallet"},
        {"value": "LOTTERY_TICKET", "label": "복권 티켓", "group": "wallet"},
        {"value": "GOLD_KEY_TICKET", "label": "골드 열쇠 티켓", "group": "wallet"},
        {"value": "DIAMOND_TICKET", "label": "다이아몬드 티켓", "group": "wallet"},
        {"value": "GOLD_KEY_FRAGMENT", "label": "골드 열쇠 조각", "group": "wallet"},
        {"value": "DIAMOND_FRAGMENT", "label": "다이아몬드 조각", "group": "wallet"},
        {"value": "PUZZLE_C1", "label": "퍼즐 조각 C1", "group": "wallet"},
        {"value": "PUZZLE_C2", "label": "퍼즐 조각 C2", "group": "wallet"},
        {"value": "PUZZLE_J", "label": "퍼즐 조각 J", "group": "wallet"},
        {"value": "PUZZLE_M", "label": "퍼즐 조각 M", "group": "wallet"},
        {"value": "DIAMOND", "label": "다이아몬드", "group": "wallet"},
        {"value": "VAULT", "label": "금고 포인트 (P)", "group": "vault"},
        {"value": "CHICKEN_GIFTICON_5000", "label": "치킨 기프티콘 5천원", "group": "inventory"},
        {"value": "CHICKEN_GIFTICON_10000", "label": "치킨 기프티콘 1만원", "group": "inventory"},
        {"value": "STARBUCKS_GIFTICON_2000", "label": "스타벅스 기프티콘 2천원", "group": "inventory"},
        {"value": "STARBUCKS_GIFTICON_10000", "label": "스타벅스 기프티콘 1만원", "group": "inventory"},
        {"value": "PIZZA_GIFTICON_5000", "label": "피자 기프티콘 5천원", "group": "inventory"},
        {"value": "PIZZA_GIFTICON_10000", "label": "피자 기프티콘 1만원", "group": "inventory"},
        {"value": "GOOGLE_GIFTICON_5000", "label": "구글 기프트카드 5천원", "group": "inventory"},
        {"value": "GOOGLE_GIFTICON_10000", "label": "구글 기프트카드 1만원", "group": "inventory"},
        {"value": "NONE", "label": "없음", "group": "special"},
    ]


@router.get("/withdrawals", response_model=List[AdminWithdrawalDto])
def list_admin_withdrawals(
    status: str = "PENDING",
    db: Session = Depends(get_db),
    admin_info: tuple[int, str] = Depends(get_current_admin_info),
):
    """List withdrawal requests.
    
    DEPRECATED: Use /api/v2/admin/vault/withdrawals/{status} instead.
    This endpoint will be removed in a future release.
    """
    admin_id, admin_role = admin_info

    status = (status or "").strip().upper()

    query = db.query(VaultWithdrawalRequest)
    if status:
        query = query.filter(VaultWithdrawalRequest.status == status)

    rows = query.order_by(VaultWithdrawalRequest.created_at.desc()).limit(100).all()

    result = []
    for r in rows:
        risk = "LOW"
        if r.amount >= 1000000:
            risk = "HIGH"
        elif r.amount >= 300000:
            risk = "MEDIUM"

        safe_nickname = "Unknown"
        if r.user and (r.user.nickname is not None):
            safe_nickname = r.user.nickname or "(미설정)"

        safe_status = str(r.status or "").strip().upper()
        if safe_status not in {"PENDING", "APPROVED", "REJECTED"}:
            # Legacy/unknown statuses (e.g., CANCELLED) should not crash response validation
            safe_status = "REJECTED"

        result.append(
            AdminWithdrawalDto(
                id=r.id,
                userId=r.user_id,
                nickname=safe_nickname,
                amount=int(r.amount or 0),
                requestTime=r.created_at,
                riskLevel=risk,
                status=safe_status,
            )
        )
    return result


@router.get("/economy/deposits", response_model=List[AdminDepositLogDto])
def list_deposit_logs(
    search: Optional[str] = None,
    page: int = 1,
    limit: int = 50,
    db: Session = Depends(get_db),
    admin_info: tuple[int, str] = Depends(get_current_admin_info),
):
    query = db.query(ExternalRankingDailyDepositDelta, User).join(
        User, ExternalRankingDailyDepositDelta.user_id == User.id
    )

    if search:
        query = query.filter(
            (User.nickname.ilike(f"%{search}%"))
            | (User.telegram_username.ilike(f"%{search}%"))
        )

    offset_val = (page - 1) * limit
    rows = (
        query.order_by(ExternalRankingDailyDepositDelta.kst_date.desc())
        .offset(offset_val)
        .limit(limit)
        .all()
    )

    return [
        AdminDepositLogDto(
            id=r.ExternalRankingDailyDepositDelta.id,
            userId=r.ExternalRankingDailyDepositDelta.user_id,
            nickname=r.User.nickname,
            amount=r.ExternalRankingDailyDepositDelta.deposit_delta,
            kstDate=r.ExternalRankingDailyDepositDelta.kst_date.isoformat(),
            createdAt=r.ExternalRankingDailyDepositDelta.created_at,
        )
        for r in rows
    ]


@router.post("/economy/deposits", response_model=AdminDepositLogDto)
def create_deposit_log(
    payload: AdminDepositCreateRequest,
    db: Session = Depends(get_db),
    admin_info: tuple[int, str] = Depends(get_current_admin_info),
):
    admin_id, _ = admin_info

    kst_date = payload.kst_date
    if not kst_date:
        from zoneinfo import ZoneInfo

        kst_date = datetime.now(ZoneInfo("Asia/Seoul")).date().isoformat()

    from datetime import date

    target_date = date.fromisoformat(kst_date)

    row = (
        db.query(ExternalRankingDailyDepositDelta)
        .filter(
            ExternalRankingDailyDepositDelta.user_id == payload.user_id,
            ExternalRankingDailyDepositDelta.kst_date == target_date,
        )
        .first()
    )

    if row:
        row.deposit_delta += payload.amount
    else:
        row = ExternalRankingDailyDepositDelta(
            user_id=payload.user_id, kst_date=target_date, deposit_delta=payload.amount
        )
        db.add(row)

    db.commit()
    db.refresh(row)

    _sync_cumulative_deposit(db, payload.user_id)

    user = db.query(User).filter(User.id == payload.user_id).first()

    V2AdminAuditService.log(
        db,
        admin_id,
        "CC_DEPOSIT_CREATE",
        "ECONOMY",
        "DEPOSIT",
        after={"user_id": payload.user_id, "amount": payload.amount, "date": kst_date},
    )

    return AdminDepositLogDto(
        id=row.id,
        userId=row.user_id,
        nickname=user.nickname if user else None,
        amount=row.deposit_delta,
        kstDate=row.kst_date.isoformat(),
        createdAt=row.created_at,
    )


@router.put("/economy/deposits/{log_id}", response_model=AdminDepositLogDto)
def update_deposit_log(
    log_id: int,
    payload: AdminDepositUpdateRequest,
    db: Session = Depends(get_db),
    admin_info: tuple[int, str] = Depends(get_current_admin_info),
):
    admin_id, _ = admin_info
    row = (
        db.query(ExternalRankingDailyDepositDelta)
        .filter(ExternalRankingDailyDepositDelta.id == log_id)
        .first()
    )
    if not row:
        raise HTTPException(status_code=404, detail="DEPOSIT_LOG_NOT_FOUND")

    user_id = row.user_id
    before = {"amount": row.deposit_delta, "date": row.kst_date.isoformat()}

    if payload.amount is not None:
        row.deposit_delta = payload.amount

    if payload.kst_date:
        from datetime import date

        row.kst_date = date.fromisoformat(payload.kst_date)

    db.commit()
    db.refresh(row)

    _sync_cumulative_deposit(db, user_id)

    V2AdminAuditService.log(
        db,
        admin_id,
        "CC_DEPOSIT_UPDATE",
        "ECONOMY",
        "DEPOSIT",
        before=before,
        after={"amount": row.deposit_delta, "date": row.kst_date.isoformat()},
    )

    user = db.query(User).filter(User.id == user_id).first()
    return AdminDepositLogDto(
        id=row.id,
        userId=row.user_id,
        nickname=user.nickname if user else None,
        amount=row.deposit_delta,
        kstDate=row.kst_date.isoformat(),
        createdAt=row.created_at,
    )


@router.delete("/economy/deposits/{log_id}")
def delete_deposit_log(
    log_id: int,
    db: Session = Depends(get_db),
    admin_info: tuple[int, str] = Depends(get_current_admin_info),
):
    admin_id, _ = admin_info
    row = (
        db.query(ExternalRankingDailyDepositDelta)
        .filter(ExternalRankingDailyDepositDelta.id == log_id)
        .first()
    )
    if not row:
        raise HTTPException(status_code=404, detail="DEPOSIT_LOG_NOT_FOUND")

    user_id = row.user_id
    before = {"amount": row.deposit_delta, "date": row.kst_date.isoformat()}

    db.delete(row)
    db.commit()

    _sync_cumulative_deposit(db, user_id)

    V2AdminAuditService.log(
        db,
        admin_id,
        "CC_DEPOSIT_DELETE",
        "ECONOMY",
        "DEPOSIT",
        before=before,
    )

    return {"success": True}


def _sync_cumulative_deposit(db: Session, user_id: int):
    total = (
        db.query(func.sum(ExternalRankingDailyDepositDelta.deposit_delta))
        .filter(ExternalRankingDailyDepositDelta.user_id == user_id)
        .scalar()
        or 0
    )

    from app.models.external_ranking import ExternalRankingData

    rank_row = db.query(ExternalRankingData).filter(ExternalRankingData.user_id == user_id).first()
    if not rank_row:
        rank_row = ExternalRankingData(user_id=user_id, deposit_amount=int(total))
        db.add(rank_row)
    else:
        rank_row.deposit_amount = int(total)

    db.commit()


@router.get("/economy/deposits/pending", response_model=List[AdminDepositDto])
def list_pending_deposits(
    db: Session = Depends(get_db),
    admin_info: tuple[int, str] = Depends(get_current_admin_info),
):
    admin_id, admin_role = admin_info
    from app.v2.services.admin_cc_deposit_service import V2AdminCCDepositService
    rows = V2AdminCCDepositService.list_all(db)

    user_ids = [r.user_id for r in rows]
    user_map = {}
    deposit_count_map = {}

    if user_ids:
        users = db.query(User).filter(User.id.in_(user_ids)).all()
        user_map = {u.id: u.nickname for u in users}

        raw_counts = (
            db.query(ExternalRankingDailyDepositDelta.user_id, func.count(ExternalRankingDailyDepositDelta.id))
            .filter(ExternalRankingDailyDepositDelta.user_id.in_(user_ids))
            .filter(ExternalRankingDailyDepositDelta.deposit_delta > 0)
            .group_by(ExternalRankingDailyDepositDelta.user_id)
            .all()
        )
        deposit_count_map = {uid: cnt for uid, cnt in raw_counts}

    result = []
    for r in rows:
        result.append(
            AdminDepositDto(
                id=r.id,
                user_id=r.user_id,
                nickname=user_map.get(r.user_id),
                amount=int(r.deposit_amount or 0),
                deposit_count=int(deposit_count_map.get(r.user_id, 0)),
                bank_owner="Manual Entry",
                status="PENDING",
                requested_at=r.created_at,
                is_new=True,
            )
        )
    return result


@router.get("/shop/products", response_model=List[AdminProductDto])
def list_admin_shop_products(
    db: Session = Depends(get_db),
    admin_info: tuple[int, str] = Depends(get_current_admin_info),
):
    admin_id, admin_role = admin_info

    products = _load_v2_shop_products(db)

    result = []
    for p in products:
        if not isinstance(p, dict):
            continue
        result.append(
            AdminProductDto(
                id=_product_id_from_sku(str(p.get("sku") or "")),
                sku=str(p.get("sku") or ""),
                name=str(p.get("name") or ""),
                price=int(p.get("cost_amount", 0) or 0),
                cost_type=str(p.get("cost_type") or "VAULT"),
                cost_amount=int(p.get("cost_amount", 0) or 0),
                reward_type=str(p.get("reward_type") or ""),
                reward_amount=int(p.get("reward_amount", 0) or 0),
                is_visible=bool(p.get("is_visible", True)),
                category=_classify_product_category(str(p.get("reward_type") or "")),
                sort_order=int(p.get("sort_order", 0) or 0),
                daily_limit=p.get("daily_limit"),
                description=p.get("description"),
            )
        )
    return result


@router.post("/shop/products/sync", response_model=List[AdminProductDto])
def sync_admin_shop_products(
    db: Session = Depends(get_db),
    admin_info: tuple[int, str] = Depends(get_current_admin_info),
):
    admin_id, _ = admin_info

    current = _load_v2_shop_products(db)
    current_by_sku = {
        str(p.get("sku") or ""): p for p in current if isinstance(p, dict) and str(p.get("sku") or "")
    }

    defaults = _build_sot_shop_catalog_defaults()
    for p in defaults:
        sku = str(p.get("sku") or "")
        if not sku:
            continue
        if sku not in current_by_sku:
            current_by_sku[sku] = p
        else:
            # Fill only missing required keys without overwriting operator edits.
            existing = current_by_sku[sku]
            for key in ["name", "cost_type", "cost_amount", "reward_type", "reward_amount", "is_visible"]:
                if key not in existing or existing.get(key) is None:
                    existing[key] = p.get(key)

    merged = list(current_by_sku.values())
    _save_v2_shop_products(db, merged, admin_id=admin_id)

    return list_admin_shop_products(db=db, admin_info=admin_info)


@router.put("/shop/products/{product_id}/status")
def update_admin_shop_product_status(
    product_id: int,
    payload: _AdminProductStatusPayload,
    db: Session = Depends(get_db),
    admin_info: tuple[int, str] = Depends(get_current_admin_info),
):
    admin_id, _ = admin_info
    products = _load_v2_shop_products(db)
    updated = False
    for p in products:
        sku = str(p.get("sku") or "")
        if not sku:
            continue
        if _product_id_from_sku(sku) == int(product_id):
            p["is_visible"] = bool(payload.is_visible)
            updated = True
            break
    if not updated:
        raise HTTPException(status_code=404, detail="PRODUCT_NOT_FOUND")
    _save_v2_shop_products(db, products, admin_id=admin_id)
    return {"success": True}


@router.put("/shop/products/{product_id}/price")
def update_admin_shop_product_price(
    product_id: int,
    payload: _AdminProductPricePayload,
    db: Session = Depends(get_db),
    admin_info: tuple[int, str] = Depends(get_current_admin_info),
):
    admin_id, _ = admin_info
    if int(payload.price) < 0:
        raise HTTPException(status_code=400, detail="INVALID_PRICE")
    products = _load_v2_shop_products(db)
    updated = False
    for p in products:
        sku = str(p.get("sku") or "")
        if not sku:
            continue
        if _product_id_from_sku(sku) == int(product_id):
            p["cost_amount"] = int(payload.price)
            updated = True
            break
    if not updated:
        raise HTTPException(status_code=404, detail="PRODUCT_NOT_FOUND")
    _save_v2_shop_products(db, products, admin_id=admin_id)
    return {"success": True}


# ============================================================================
# Shop Product CRUD (Exchange Model)
# ============================================================================

@router.post("/shop/products", response_model=AdminProductDto)
def create_admin_shop_product(
    payload: AdminProductCreateRequest,
    db: Session = Depends(get_db),
    admin_info: tuple[int, str] = Depends(get_current_admin_info),
):
    """새 상점 상품 생성 (교환소 모델)"""
    admin_id, _ = admin_info

    products = _load_v2_shop_products(db)

    # SKU 중복 체크
    existing_skus = {str(p.get("sku") or "") for p in products if isinstance(p, dict)}
    if payload.sku in existing_skus:
        raise HTTPException(status_code=400, detail="DUPLICATE_SKU")

    new_product = {
        "sku": payload.sku,
        "name": payload.name,
        "cost_type": payload.cost_type,
        "cost_amount": payload.cost_amount,
        "reward_type": payload.reward_type,
        "reward_amount": payload.reward_amount,
        "is_visible": payload.is_visible,
        "sort_order": payload.sort_order,
        "daily_limit": payload.daily_limit,
        "description": payload.description,
    }
    products.append(new_product)
    _save_v2_shop_products(db, products, admin_id=admin_id)

    V2AdminAuditService.log(
        db,
        admin_id,
        "SHOP_PRODUCT_CREATE",
        "SHOP",
        payload.sku,
        after=new_product,
    )

    return AdminProductDto(
        id=_product_id_from_sku(payload.sku),
        sku=payload.sku,
        name=payload.name,
        price=payload.cost_amount,
        cost_type=payload.cost_type,
        cost_amount=payload.cost_amount,
        reward_type=payload.reward_type,
        reward_amount=payload.reward_amount,
        is_visible=payload.is_visible,
        category=_classify_product_category(payload.reward_type),
        sort_order=payload.sort_order,
        daily_limit=payload.daily_limit,
        description=payload.description,
    )


@router.put("/shop/products/{product_id}")
def update_admin_shop_product(
    product_id: int,
    payload: AdminProductUpdateRequest,
    db: Session = Depends(get_db),
    admin_info: tuple[int, str] = Depends(get_current_admin_info),
):
    """상점 상품 전체 수정 (교환소 모델)"""
    admin_id, _ = admin_info

    products = _load_v2_shop_products(db)
    updated = False
    for p in products:
        sku = str(p.get("sku") or "")
        if not sku:
            continue
        if _product_id_from_sku(sku) == int(product_id):
            before = dict(p)
            if payload.name is not None:
                p["name"] = payload.name
            if payload.cost_type is not None:
                p["cost_type"] = payload.cost_type
            if payload.cost_amount is not None:
                p["cost_amount"] = payload.cost_amount
            if payload.reward_type is not None:
                p["reward_type"] = payload.reward_type
            if payload.reward_amount is not None:
                p["reward_amount"] = payload.reward_amount
            if payload.is_visible is not None:
                p["is_visible"] = payload.is_visible
            if payload.sort_order is not None:
                p["sort_order"] = payload.sort_order
            if payload.daily_limit is not None:
                p["daily_limit"] = payload.daily_limit
            if payload.description is not None:
                p["description"] = payload.description
            updated = True

            V2AdminAuditService.log(
                db,
                admin_id,
                "SHOP_PRODUCT_UPDATE",
                "SHOP",
                sku,
                before=before,
                after=dict(p),
            )
            break

    if not updated:
        raise HTTPException(status_code=404, detail="PRODUCT_NOT_FOUND")

    _save_v2_shop_products(db, products, admin_id=admin_id)
    return {"success": True}


@router.delete("/shop/products/{product_id}")
def delete_admin_shop_product(
    product_id: int,
    db: Session = Depends(get_db),
    admin_info: tuple[int, str] = Depends(get_current_admin_info),
):
    """상점 상품 삭제"""
    admin_id, _ = admin_info
    
    import logging
    logger = logging.getLogger(__name__)

    products = _load_v2_shop_products(db)
    original_len = len(products)
    deleted_product = None
    
    logger.info(f"[DELETE] Attempting to delete product_id={product_id}")
    logger.info(f"[DELETE] Total products in DB: {len(products)}")

    new_products = []
    for p in products:
        sku = str(p.get("sku") or "")
        if not sku:
            new_products.append(p)
            continue
        # ID 비교를 명시적으로 처리
        product_hash_id = _product_id_from_sku(sku)
        logger.info(f"[DELETE] Checking SKU={sku}, hash_id={product_hash_id}, target={product_id}, match={product_hash_id == product_id}")
        if product_hash_id == product_id:
            deleted_product = p
            logger.info(f"[DELETE] Found matching product: {sku}")
            continue
        new_products.append(p)

    if len(new_products) == original_len:
        logger.error(f"[DELETE] PRODUCT_NOT_FOUND for product_id={product_id}")
        raise HTTPException(status_code=404, detail="PRODUCT_NOT_FOUND")

    _save_v2_shop_products(db, new_products, admin_id=admin_id)
    logger.info(f"[DELETE] Successfully deleted product with SKU={deleted_product.get('sku')}")

    if deleted_product:
        V2AdminAuditService.log(
            db,
            admin_id,
            "SHOP_PRODUCT_DELETE",
            "SHOP",
            str(deleted_product.get("sku") or ""),
            before=deleted_product,
        )

    return {"success": True}


@router.post("/withdrawals/{withdrawal_id}/approve")
def approve_withdrawal(
    withdrawal_id: int,
    db: Session = Depends(get_db),
    admin_info: tuple[int, str] = Depends(get_current_admin_info),
):
    """Approve a withdrawal request.
    
    DEPRECATED: Use /api/v2/admin/vault/withdrawals/{id}/approve instead.
    This endpoint will be removed in a future release.
    """
    admin_id, admin_role = admin_info
    
    withdrawal = db.query(VaultWithdrawalRequest).filter(
        VaultWithdrawalRequest.id == withdrawal_id
    ).first()
    
    if not withdrawal:
        raise HTTPException(status_code=404, detail="WITHDRAWAL_NOT_FOUND")
    
    if withdrawal.status != "PENDING":
        raise HTTPException(status_code=400, detail="WITHDRAWAL_ALREADY_PROCESSED")
    
    withdrawal = V2AdminEconomyService.approve_withdrawal(db, withdrawal_id, admin_id)
    
    V2AdminAuditService.log(
        db,
        admin_id,
        "WITHDRAWAL_APPROVE",
        "WITHDRAWAL",
        str(withdrawal_id),
        before={"status": "PENDING"},
        after={"status": "APPROVED", "amount": withdrawal.amount},
    )
    
    db.commit()
    return {"success": True, "id": withdrawal_id}


@router.post("/withdrawals/{withdrawal_id}/reject")
def reject_withdrawal(
    withdrawal_id: int,
    payload: AdminWithdrawalRejectRequest,
    db: Session = Depends(get_db),
    admin_info: tuple[int, str] = Depends(get_current_admin_info),
):
    """Reject a withdrawal request.
    
    DEPRECATED: Use /api/v2/admin/vault/withdrawals/{id}/reject instead.
    This endpoint will be removed in a future release.
    """
    admin_id, admin_role = admin_info
    
    withdrawal = db.query(VaultWithdrawalRequest).filter(
        VaultWithdrawalRequest.id == withdrawal_id
    ).first()
    
    if not withdrawal:
        raise HTTPException(status_code=404, detail="WITHDRAWAL_NOT_FOUND")
    
    if withdrawal.status != "PENDING":
        raise HTTPException(status_code=400, detail="WITHDRAWAL_ALREADY_PROCESSED")
    
    V2AdminEconomyService.reject_withdrawal(db, withdrawal_id, admin_id, payload.reason)
    
    V2AdminAuditService.log(
        db,
        admin_id,
        "WITHDRAWAL_REJECT",
        "WITHDRAWAL",
        str(withdrawal_id),
        before={"status": "PENDING"},
        after={"status": "REJECTED", "amount": withdrawal.amount, "reason": payload.reason},
    )
    
    db.commit()
    return {"success": True, "id": withdrawal_id}


# ============================================================================
# Ticket Controls (GameWallet)
# ============================================================================

@router.get("/inventory/tickets/stats", response_model=List[TicketStatDto])
def get_ticket_stats(db: Session = Depends(get_db)):
    stats = db.query(
        UserGameWallet.token_type,
        func.sum(UserGameWallet.balance).label("current_balance")
    ).group_by(UserGameWallet.token_type).all()
    
    # Ledger stats
    ledger_stats = db.query(
        UserGameWalletLedger.token_type,
        func.sum(case((UserGameWalletLedger.delta > 0, UserGameWalletLedger.delta), else_=0)).label("total_issued"),
        func.sum(case((UserGameWalletLedger.delta < 0, func.abs(UserGameWalletLedger.delta)), else_=0)).label("total_used")
    ).group_by(UserGameWalletLedger.token_type).all()
    
    ledger_map = {s.token_type: s for s in ledger_stats}
    
    result = []
    # Use known types or DB results. Using DB results for dynamic support.
    for s in stats:
        l_stat = ledger_map.get(s.token_type)
        total_issued = int(l_stat.total_issued) if l_stat and l_stat.total_issued else 0
        total_used = int(l_stat.total_used) if l_stat and l_stat.total_used else 0
        
        result.append(TicketStatDto(
            ticketType=s.token_type.value,
            currentBalance=int(s.current_balance or 0),
            totalIssued=total_issued,
            totalUsed=total_used
        ))
        
    return result

@router.get("/inventory/tickets/users", response_model=List[UserTicketDto])
def get_user_tickets(search: str | None = None, db: Session = Depends(get_db)):
    query = db.query(UserGameWallet).join(User)
    
    if search:
        if search.isdigit():
            query = query.filter(User.id == int(search))
        else:
            query = query.filter(
                (User.nickname.ilike(f"%{search}%")) | 
                (User.telegram_username.ilike(f"%{search}%"))
            )
            
    wallets = query.limit(100).all()
    
    result = []
    for w in wallets:
        usage = db.query(
            func.sum(func.abs(UserGameWalletLedger.delta)).label("total_used"),
            func.max(UserGameWalletLedger.created_at).label("last_used_at")
        ).filter(
            UserGameWalletLedger.user_id == w.user_id,
            UserGameWalletLedger.token_type == w.token_type,
            UserGameWalletLedger.delta < 0
        ).first()
        
        result.append(UserTicketDto(
            userId=w.user_id,
            nickname=w.user.nickname or "Unknown",
            telegramUsername=w.user.telegram_username,
            ticketType=w.token_type.value,
            currentBalance=w.balance,
            totalUsed=int(usage.total_used or 0) if usage else 0,
            lastUsedAt=usage.last_used_at if usage else None
        ))
        
    return result

@router.post("/inventory/tickets")
def create_ticket(
    payload: TicketCreateRequest, 
    db: Session = Depends(get_db),
    admin_info: tuple[int, str] = Depends(get_current_admin_info)
):
    admin_id, _ = admin_info
    V2AdminInventoryService.grant_tokens(
        db, 
        user_id=payload.user_id, 
        token_type=payload.ticket_type, 
        amount=payload.amount, 
        reason=payload.reason,
        label=f"ADMIN:{admin_id}"
    )
    return {"success": True}

@router.put("/inventory/tickets/{id}")
def update_ticket(
    id: int, 
    payload: TicketUpdateRequest, 
    db: Session = Depends(get_db),
    admin_info: tuple[int, str] = Depends(get_current_admin_info)
):
    ledger = db.query(UserGameWalletLedger).filter(UserGameWalletLedger.id == id).first()
    if not ledger:
        raise HTTPException(status_code=404, detail="LOG_NOT_FOUND")
        
    if payload.reason:
        ledger.reason = payload.reason
    if payload.amount is not None:
        ledger.delta = payload.amount
        
    db.commit()
    return {"success": True}
    
@router.delete("/inventory/tickets/{id}")
def delete_ticket(id: int, db: Session = Depends(get_db), admin_info: tuple[int, str] = Depends(get_current_admin_info)):
    ledger = db.query(UserGameWalletLedger).filter(UserGameWalletLedger.id == id).first()
    if not ledger:
        raise HTTPException(status_code=404, detail="LOG_NOT_FOUND")
    db.delete(ledger)
    db.commit()
    return {"success": True}


# ============================================================================
# Item Controls (Inventory)
# ============================================================================

@router.get("/inventory/items/stats", response_model=List[InventoryStatDto])
def get_inventory_stats(db: Session = Depends(get_db)):
    stats = db.query(
        UserInventoryItem.item_type,
        func.sum(UserInventoryItem.quantity).label("current_balance")
    ).group_by(UserInventoryItem.item_type).all()
    
    ledger_stats = db.query(
        UserInventoryLedger.item_type,
        func.sum(case((UserInventoryLedger.change_amount > 0, UserInventoryLedger.change_amount), else_=0)).label("total_issued"),
        func.sum(case((UserInventoryLedger.change_amount < 0, func.abs(UserInventoryLedger.change_amount)), else_=0)).label("total_used")
    ).group_by(UserInventoryLedger.item_type).all()
    
    ledger_map = {s.item_type: s for s in ledger_stats}
    
    result = []
    for s in stats:
        l_stat = ledger_map.get(s.item_type)
        total_issued = int(l_stat.total_issued) if l_stat and l_stat.total_issued else 0
        total_used = int(l_stat.total_used) if l_stat and l_stat.total_used else 0
        
        result.append(InventoryStatDto(
            itemType=s.item_type,
            currentBalance=int(s.current_balance or 0),
            totalIssued=total_issued,
            totalUsed=total_used
        ))
    return result

@router.get("/inventory/items/users", response_model=List[UserInventoryItemDto])
def get_user_inventory_list(search: str | None = None, db: Session = Depends(get_db)):
    query = db.query(UserInventoryItem).join(User)
    
    if search:
        if search.isdigit():
            query = query.filter(User.id == int(search))
        else:
            query = query.filter(
                (User.nickname.ilike(f"%{search}%")) | 
                (User.telegram_username.ilike(f"%{search}%"))
            )
            
    items = query.limit(100).all()
    
    result = []
    for item in items:
        usage = db.query(
            func.sum(func.abs(UserInventoryLedger.change_amount)).label("total_used"),
            func.max(UserInventoryLedger.created_at).label("last_used_at")
        ).filter(
            UserInventoryLedger.user_id == item.user_id,
            UserInventoryLedger.item_type == item.item_type,
            UserInventoryLedger.change_amount < 0
        ).first()
        
        result.append(UserInventoryItemDto(
            userId=item.user_id,
            nickname=item.user.nickname or "Unknown",
            telegramUsername=item.user.telegram_username,
            itemType=item.item_type,
            currentQuantity=item.quantity,
            totalUsed=int(usage.total_used or 0) if usage else 0,
            lastUsedAt=usage.last_used_at if usage else None
        ))
    return result

@router.post("/inventory/items")
def create_inventory_item(
    payload: InventoryItemCreateRequest, 
    db: Session = Depends(get_db), 
    admin_info: tuple[int, str] = Depends(get_current_admin_info)
):
    user = db.query(User).filter(User.id == payload.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="USER_NOT_FOUND")

    try:
        V2AdminInventoryService.grant_item(
            db, 
            user_id=payload.user_id, 
            item_type=payload.item_type, 
            amount=payload.quantity, 
            reason=payload.reason
        )
        return {"success": True}
    except ValueError as exc:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(exc))

@router.put("/inventory/items/{id}")
def update_inventory_item(
    id: int, 
    payload: InventoryItemUpdateRequest, 
    db: Session = Depends(get_db), 
    admin_info: tuple[int, str] = Depends(get_current_admin_info)
):
    ledger = db.query(UserInventoryLedger).filter(UserInventoryLedger.id == id).first()
    if not ledger:
        raise HTTPException(status_code=404, detail="LOG_NOT_FOUND")
    
    if payload.reason:
        ledger.reason = payload.reason
    if payload.quantity is not None:
        ledger.change_amount = payload.quantity
        
    db.commit()
    return {"success": True}

@router.delete("/inventory/items/{id}")
def delete_inventory_item(id: int, db: Session = Depends(get_db), admin_info: tuple[int, str] = Depends(get_current_admin_info)):
    ledger = db.query(UserInventoryLedger).filter(UserInventoryLedger.id == id).first()
    if not ledger:
        raise HTTPException(status_code=404, detail="LOG_NOT_FOUND")
    db.delete(ledger)
    db.commit()
    return {"success": True}


# ============================================================================
# Combined Logs
# ============================================================================

@router.get("/inventory/logs", response_model=List[TicketLogDto])
def get_ticket_logs(
    user_id: int | None = None,
    start_date: str | None = None,
    end_date: str | None = None,
    db: Session = Depends(get_db)
):
    # Fetch Wallet Logs
    w_query = db.query(UserGameWalletLedger, User).outerjoin(
        User, UserGameWalletLedger.user_id == User.id
    )
    if user_id:
        w_query = w_query.filter(UserGameWalletLedger.user_id == user_id)
    if start_date:
        w_query = w_query.filter(func.date(UserGameWalletLedger.created_at) >= start_date)
    if end_date:
        w_query = w_query.filter(func.date(UserGameWalletLedger.created_at) <= end_date)
    
    w_logs = w_query.order_by(UserGameWalletLedger.created_at.desc()).limit(100).all()
    
    # Fetch Inventory Logs
    i_query = db.query(UserInventoryLedger, User).outerjoin(
        User, UserInventoryLedger.user_id == User.id
    )
    if user_id:
        i_query = i_query.filter(UserInventoryLedger.user_id == user_id)
    if start_date:
        i_query = i_query.filter(func.date(UserInventoryLedger.created_at) >= start_date)
    if end_date:
        i_query = i_query.filter(func.date(UserInventoryLedger.created_at) <= end_date)
        
    i_logs = i_query.order_by(UserInventoryLedger.created_at.desc()).limit(100).all()

    logger.info(
        "admin.inventory_logs(economy_routes) user_id=%s start_date=%s end_date=%s wallet_count=%s inventory_count=%s",
        user_id,
        start_date,
        end_date,
        len(w_logs),
        len(i_logs),
    )
    
    # Merge
    combined = []
    for l, user in w_logs:
        l_type = "GRANT" if l.delta > 0 else "USE"
        combined.append(TicketLogDto(
            id=l.id,
            userId=l.user_id,
            type=l_type,
            itemType=l.token_type.value,
            amount=abs(l.delta),
            balanceAfter=l.balance_after,
            reason=l.reason or "",
            timestamp=l.created_at.isoformat(),
            nickname=(user.nickname if user else "")
        ))
        
    for l, user in i_logs:
        l_type = "GRANT" if l.change_amount > 0 else "USE"
        combined.append(TicketLogDto(
            id=l.id,
            userId=l.user_id,
            type=l_type,
            itemType=l.item_type,
            amount=abs(l.change_amount),
            balanceAfter=l.balance_after,
            reason=l.reason or "",
            timestamp=l.created_at.isoformat(),
            nickname=(user.nickname if user else "")
        ))
        
    # Sort desc
    combined.sort(key=lambda x: x.timestamp, reverse=True)
    return combined[:100]
