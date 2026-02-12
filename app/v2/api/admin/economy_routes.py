from datetime import datetime
import logging
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import func, case
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.v2.api.deps import get_current_admin_info, get_db
from app.v2.models import ExternalRankingDailyDepositDelta
from app.v2.models.user import V2User
from app.v2.models import VaultWithdrawalRequest
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
    AdminLatencyEvidenceDto,
    AdminLatencyVerifyRequest,
    AdminLatencyRejectRequest,
    AdminCircuitBreakerStatusDto,
    AdminCircuitBreakerResetRequest,
    AdminCircuitBreakerLimitUpdateRequest,
)
from app.v2.models import UserGameWallet, GameTokenType
from app.v2.models import UserGameWalletLedger
from app.v2.models import UserInventoryItem, UserInventoryLedger
from app.v2.utils.timezone import utc_to_kst_iso
from sqlalchemy import desc, text

router = APIRouter()
logger = logging.getLogger("uvicorn.error")


def _product_id_from_sku(sku: str) -> int:
    import zlib

    return int(zlib.crc32(str(sku or "").encode("utf-8")) & 0x7FFFFFFF)


def _sync_cumulative_deposit(db: Session, user_id: int) -> None:
    """ExternalRankingDailyDepositDelta(일별 입금 로그) -> cc_deposit(누적) 동기화.

    V2 어드민 입금 페이지는 일별 delta를 기록한다. 실제 누적 입금 SoT는
    external_ranking_data(=cc_deposit)이므로, delta 합계를 누적으로 환산하여
    V2AdminCCDepositService.upsert_many로 전달한다.

    upsert_many 내부에서 (1) 누적 증가분 계산, (2) XP/레벨 동기화, (3) commit까지 수행한다.
    """
    from app.v2.models import ExternalRankingData
    from app.v2.schemas.v2_cc_deposit import CCDepositCreate
    from app.v2.services.admin_cc_deposit_service import V2AdminCCDepositService

    total = (
        db.query(func.sum(ExternalRankingDailyDepositDelta.deposit_delta))
        .filter(ExternalRankingDailyDepositDelta.user_id == user_id)
        .scalar()
        or 0
    )
    total_int = max(int(total), 0)

    rank_row = db.query(ExternalRankingData).filter(ExternalRankingData.user_id == user_id).first()
    current_play_count = int(rank_row.play_count or 0) if rank_row else 0

    payload = CCDepositCreate(
        user_id=int(user_id),
        cc_id=None,
        deposit_amount=total_int,
        play_count=current_play_count,
    )
    V2AdminCCDepositService.upsert_many(db, [payload])


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
    query = db.query(ExternalRankingDailyDepositDelta, V2User).join(
        V2User, ExternalRankingDailyDepositDelta.user_id == V2User.id
    )

    if search:
        query = query.filter(
            (V2User.nickname.ilike(f"%{search}%"))
            | (V2User.telegram_username.ilike(f"%{search}%"))
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
            nickname=r.V2User.nickname,
            amount=r.ExternalRankingDailyDepositDelta.deposit_delta,
            kstDate=r.ExternalRankingDailyDepositDelta.kst_date.isoformat(),
            createdAt=r.ExternalRankingDailyDepositDelta.updated_at,  # 작업 일시는 updated_at 사용
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

    user = db.query(V2User).filter(V2User.id == payload.user_id).first()

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

    user = db.query(V2User).filter(V2User.id == user_id).first()
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
        users = db.query(V2User).filter(V2User.id.in_(user_ids)).all()
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
    query = db.query(UserGameWallet).join(V2User, UserGameWallet.user_id == V2User.id)
    
    if search:
        if search.isdigit():
            query = query.filter(V2User.id == int(search))
        else:
            query = query.filter(
                (V2User.nickname.ilike(f"%{search}%")) | 
                (V2User.telegram_username.ilike(f"%{search}%"))
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
            nickname=w.V2User.nickname or "Unknown",
            telegramUsername=w.V2User.telegram_username,
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
    # FK now references v2_user (migrated from legacy user)
    user = db.query(V2User).filter(V2User.id == payload.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="USER_NOT_FOUND")
    
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
    query = db.query(UserInventoryItem).join(V2User, UserInventoryItem.user_id == V2User.id)
    
    if search:
        if search.isdigit():
            query = query.filter(V2User.id == int(search))
        else:
            query = query.filter(
                (V2User.nickname.ilike(f"%{search}%")) | 
                (V2User.telegram_username.ilike(f"%{search}%"))
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
            nickname=item.V2User.nickname or "Unknown",
            telegramUsername=item.V2User.telegram_username,
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
    # FK now references v2_user (migrated from legacy user)
    user = db.query(V2User).filter(V2User.id == payload.user_id).first()
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
    def is_admin_label(value: str | None) -> bool:
        if not value:
            return False
        return value.upper().startswith("ADMIN")

    def is_admin_related(value: str | None) -> bool:
        if not value:
            return False
        lower = value.lower()
        return lower.startswith("admin_") or lower.startswith("admin:")

    # Fetch Wallet Logs
    w_query = db.query(UserGameWalletLedger, V2User).outerjoin(
        V2User, UserGameWalletLedger.user_id == V2User.id
    )
    if user_id:
        w_query = w_query.filter(UserGameWalletLedger.user_id == user_id)
    if start_date:
        w_query = w_query.filter(func.date(UserGameWalletLedger.created_at) >= start_date)
    if end_date:
        w_query = w_query.filter(func.date(UserGameWalletLedger.created_at) <= end_date)
    
    w_logs = w_query.order_by(UserGameWalletLedger.created_at.desc()).limit(100).all()
    
    # Fetch Inventory Logs
    i_query = db.query(UserInventoryLedger, V2User).outerjoin(
        V2User, UserInventoryLedger.user_id == V2User.id
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
        if l.delta < 0:
            l_type = "REVOKE" if is_admin_label(l.label) else "USE"
        else:
            l_type = "GRANT"
        combined.append(TicketLogDto(
            id=l.id,
            userId=l.user_id,
            type=l_type,
            itemType=l.token_type.value,
            amount=abs(l.delta),
            balanceAfter=l.balance_after,
            reason=l.reason or "",
            timestamp=utc_to_kst_iso(l.created_at) or l.created_at.isoformat(),
            nickname=(user.nickname if user else "") or ""
        ))
        
    for l, user in i_logs:
        if l.change_amount < 0:
            l_type = "REVOKE" if is_admin_related(l.related_id) else "USE"
        else:
            l_type = "GRANT"
        combined.append(TicketLogDto(
            id=l.id,
            userId=l.user_id,
            type=l_type,
            itemType=l.item_type,
            amount=abs(l.change_amount),
            balanceAfter=l.balance_after,
            reason=l.reason or "",
            timestamp=utc_to_kst_iso(l.created_at) or l.created_at.isoformat(),
            nickname=(user.nickname if user else "") or ""
        ))
        
    # Sort desc
    combined.sort(key=lambda x: x.timestamp, reverse=True)
    return combined[:100]


# ============================================================================
# Latency Survival (Admin)
# ============================================================================

@router.get("/economy/latency-evidences", response_model=List[AdminLatencyEvidenceDto])
def list_latency_evidences(
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    admin_info: tuple[int, str] = Depends(get_current_admin_info),
):
    return V2AdminEconomyService.list_latency_evidences(db, status=status)


@router.post("/economy/latency-evidences/{id}/verify")
def verify_latency_evidence(
    id: int,
    payload: AdminLatencyVerifyRequest,
    db: Session = Depends(get_db),
    admin_info: tuple[int, str] = Depends(get_current_admin_info),
):
    admin_id, _ = admin_info

    from app.v2.models.v2_user_deposit_evidence import V2UserDepositEvidence

    evidence_before = db.get(V2UserDepositEvidence, id)
    before = None
    if evidence_before:
        before = {
            "status": evidence_before.status.value if hasattr(evidence_before.status, "value") else str(evidence_before.status),
            "matched_log_id": evidence_before.matched_log_id,
            "admin_memo": evidence_before.admin_memo,
            "user_id": evidence_before.user_id,
            "tx_id": evidence_before.tx_id,
        }

    V2AdminEconomyService.verify_latency_evidence(db, id, payload.log_id, admin_id)
    db.flush()

    evidence_after = db.get(V2UserDepositEvidence, id)
    after = None
    if evidence_after:
        after = {
            "status": evidence_after.status.value if hasattr(evidence_after.status, "value") else str(evidence_after.status),
            "matched_log_id": evidence_after.matched_log_id,
            "admin_memo": evidence_after.admin_memo,
            "user_id": evidence_after.user_id,
            "tx_id": evidence_after.tx_id,
            "log_id": payload.log_id,
        }

    V2AdminAuditService.log(
        db,
        admin_id,
        "LATENCY_EVIDENCE_VERIFY",
        "ECONOMY",
        str(id),
        before=before,
        after=after,
        auto_commit=False,
    )
    db.commit()
    return {"success": True, "id": id}


@router.post("/economy/latency-evidences/{id}/reject")
def reject_latency_evidence(
    id: int,
    payload: AdminLatencyRejectRequest,
    db: Session = Depends(get_db),
    admin_info: tuple[int, str] = Depends(get_current_admin_info),
):
    admin_id, _ = admin_info

    from app.v2.models.v2_user_deposit_evidence import V2UserDepositEvidence

    evidence_before = db.get(V2UserDepositEvidence, id)
    before = None
    if evidence_before:
        before = {
            "status": evidence_before.status.value if hasattr(evidence_before.status, "value") else str(evidence_before.status),
            "matched_log_id": evidence_before.matched_log_id,
            "admin_memo": evidence_before.admin_memo,
            "user_id": evidence_before.user_id,
            "tx_id": evidence_before.tx_id,
        }

    V2AdminEconomyService.reject_latency_evidence(db, id, payload.reason, admin_id)
    db.flush()

    evidence_after = db.get(V2UserDepositEvidence, id)
    after = None
    if evidence_after:
        after = {
            "status": evidence_after.status.value if hasattr(evidence_after.status, "value") else str(evidence_after.status),
            "matched_log_id": evidence_after.matched_log_id,
            "admin_memo": evidence_after.admin_memo,
            "user_id": evidence_after.user_id,
            "tx_id": evidence_after.tx_id,
            "reason": payload.reason,
        }

    V2AdminAuditService.log(
        db,
        admin_id,
        "LATENCY_EVIDENCE_REJECT",
        "ECONOMY",
        str(id),
        before=before,
        after=after,
        auto_commit=False,
    )
    db.commit()
    return {"success": True, "id": id}


@router.get("/economy/deposits/unmatched")
def list_unmatched_deposits(
    hours: int = 24,
    db: Session = Depends(get_db),
    admin_info: tuple[int, str] = Depends(get_current_admin_info),
):
    """
    Get unmatched deposit logs from the last N hours.

    These are deposits that haven't been matched to a latency evidence yet.
    Used for admin dropdown selection when verifying latency evidence.
    """
    from datetime import datetime, timedelta

    from app.v2.models.v2_hq_daily_deposit_log import HQDailyDepositLog
    from app.v2.models.v2_user_deposit_evidence import V2UserDepositEvidence

    cutoff_time = datetime.utcnow() - timedelta(hours=hours)

    # NOTE:
    # - Latency evidence의 matched_log_id는 "특정 입금 로그"를 가리키는 soft link입니다.
    # - 현재 V2에서 운영상 확인 가능한 입금 로그 소스는 HQ CSV import 로그(HQDailyDepositLog)입니다.
    # - 이미 evidence에 매칭된 로그는 드롭다운에서 제외합니다.
    query = (
        db.query(HQDailyDepositLog)
        .outerjoin(
            V2UserDepositEvidence,
            V2UserDepositEvidence.matched_log_id == HQDailyDepositLog.id,
        )
        .filter(
            HQDailyDepositLog.user_id.isnot(None),
            HQDailyDepositLog.created_at >= cutoff_time,
            V2UserDepositEvidence.id.is_(None),
        )
        .order_by(HQDailyDepositLog.created_at.desc())
        .limit(50)
    )

    rows = query.all()

    return [
        {
            "id": row.id,
            "user_id": row.user_id,
            "amount": row.amount,
            "created_at": (row.deposit_at or row.created_at).isoformat() if (row.deposit_at or row.created_at) else None,
            "label": row.nickname,
        }
        for row in rows
    ]


# ============================================================================
# Circuit Breaker (Admin)
# ============================================================================

@router.get("/economy/circuit-breaker/status", response_model=List[AdminCircuitBreakerStatusDto])
def get_circuit_breaker_status(
    db: Session = Depends(get_db),
    admin_info: tuple[int, str] = Depends(get_current_admin_info),
):
    return V2AdminEconomyService.get_circuit_breaker_status(db)


@router.post("/economy/circuit-breaker/reset")
def reset_circuit_breaker(
    payload: AdminCircuitBreakerResetRequest,
    db: Session = Depends(get_db),
    admin_info: tuple[int, str] = Depends(get_current_admin_info),
):
    V2AdminEconomyService.reset_circuit_breaker(
        db, 
        asset_type=payload.asset_type, 
        limit_type=payload.limit_type, 
        user_id=payload.user_id
    )
    db.commit()
    return {"success": True}


@router.put("/economy/circuit-breaker/limits")
def update_circuit_breaker_limits(
    payload: AdminCircuitBreakerLimitUpdateRequest,
    db: Session = Depends(get_db),
    admin_info: tuple[int, str] = Depends(get_current_admin_info),
):
    from app.v2.services.circuit_breaker_service import CircuitBreakerService
    CircuitBreakerService.set_config(
        db, 
        payload.asset_type, 
        global_limit=payload.global_limit, 
        user_limit=payload.user_limit
    )
    db.commit()
    return {"success": True}
