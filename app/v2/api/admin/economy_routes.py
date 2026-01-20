from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.api.deps import get_current_admin_info, get_db
from app.models.external_ranking_daily_deposit_delta import ExternalRankingDailyDepositDelta
from app.models.user import User
from app.models.vault_withdrawal_request import VaultWithdrawalRequest
from app.services.admin_audit_service import AdminAuditService
from app.v2.schemas.v2_admin_economy import (
    AdminDepositCreateRequest,
    AdminDepositDto,
    AdminDepositLogDto,
    AdminDepositUpdateRequest,
    AdminProductDto,
    AdminWithdrawalDto,
    AdminWithdrawalRejectRequest,
)

router = APIRouter()


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
    """

    # Defaults per user approval:
    # - visible
    # - minimal vault cost
    # - reward 1 (except NONE)
    defaults: list[tuple[str, str, int]] = [
        ("ROULETTE_TICKET", "룰렛 티켓", 1),
        ("DICE_TICKET", "다이스 티켓", 1),
        ("LOTTERY_TICKET", "복권 티켓", 1),
        ("VAULT", "금고 포인트", 1),
        ("GOLD_KEY_TICKET", "골드 열쇠 티켓", 1),
        ("DIAMOND_TICKET", "다이아몬드 티켓", 1),
        ("GOLD_KEY_FRAGMENT", "골드 열쇠 조각", 1),
        ("DIAMOND_FRAGMENT", "다이아몬드 조각", 1),
        ("PUZZLE_C1", "퍼즐 조각 C1", 1),
        ("PUZZLE_C2", "퍼즐 조각 C2", 1),
        ("PUZZLE_J", "퍼즐 조각 J", 1),
        ("PUZZLE_M", "퍼즐 조각 M", 1),
        ("DIAMOND", "다이아몬드", 1),
        ("CHICKEN_GIFTICON_5000", "치킨 기프티콘 5천원", 1),
        ("CHICKEN_GIFTICON_10000", "치킨 기프티콘 1만원", 1),
        ("STARBUCKS_GIFTICON_2000", "스타벅스 기프티콘 2천원", 1),
        ("STARBUCKS_GIFTICON_10000", "스타벅스 기프티콘 1만원", 1),
        ("PIZZA_GIFTICON_5000", "피자 기프티콘 5천원", 1),
        ("PIZZA_GIFTICON_10000", "피자 기프티콘 1만원", 1),
        ("GOOGLE_GIFTICON_5000", "구글 기프티콘 5천원", 1),
        ("GOOGLE_GIFTICON_10000", "구글 기프티콘 1만원", 1),
        ("NONE", "없음(특수)", 1),
    ]

    products: list[dict] = []
    for reward_type, label, reward_amount in defaults:
        products.append(
            {
                "sku": f"SOT_{reward_type}",
                "name": label,
                "cost_type": "VAULT",
                "cost_amount": 1,
                "reward_type": reward_type,
                "reward_amount": reward_amount,
                "is_visible": True,
            }
        )
    return products


def _load_v2_shop_products(db: Session) -> list[dict]:
    from app.services.ui_config_service import UiConfigService

    row = UiConfigService.get(db, "v2_shop_products")
    value = row.value_json if row and isinstance(row.value_json, dict) else {}
    products = value.get("products", []) if isinstance(value, dict) else []
    if not isinstance(products, list):
        return []
    return [p for p in products if isinstance(p, dict)]


def _save_v2_shop_products(db: Session, products: list[dict], *, admin_id: int) -> None:
    from app.services.ui_config_service import UiConfigService

    UiConfigService.upsert(db, "v2_shop_products", {"products": products}, admin_id=admin_id)


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
        {"value": "POINT", "label": "포인트 (금고)", "group": "mission"},
        {"value": "TICKET_ROULETTE", "label": "룰렛 티켓", "group": "mission"},
        {"value": "TICKET_DICE", "label": "주사위 티켓", "group": "mission"},
        {"value": "TICKET_LOTTERY", "label": "복권 티켓", "group": "mission"},
        {"value": "DIAMOND", "label": "다이아", "group": "mission, wallet, inventory"},
        {"value": "TICKET_BUNDLE", "label": "티켓 번들", "group": "mission"},
        {"value": "GIFTICON_BAEMIN", "label": "깁콘(배민)", "group": "mission"},
        {"value": "GIFTICON_COMPOSE", "label": "깁콘(컴포즈)", "group": "mission"},
        {"value": "VAULT", "label": "예치금 (Vault)", "group": "wallet"},
        {"value": "ROULETTE_COIN", "label": "룰렛 티켓(지갑)", "group": "wallet"},
        {"value": "DICE_TOKEN", "label": "주사위 티켓(지갑)", "group": "wallet"},
        {"value": "LOTTERY_TICKET", "label": "복권 티켓(지갑)", "group": "wallet"},
        {"value": "GOLD_KEY", "label": "황금열쇠", "group": "wallet"},
        {"value": "DIAMOND_KEY", "label": "다이아몬드 열쇠", "group": "wallet"},
        {"value": "GOLD_KEY_FRAGMENT", "label": "황금열쇠 조각", "group": "wallet"},
        {"value": "DIAMOND_KEY_FRAGMENT", "label": "다이아몬드 열쇠 조각", "group": "wallet"},
        {"value": "DIAMOND_POINT", "label": "다이아 포인트", "group": "inventory"},
        {"value": "TICKET", "label": "만능 티켓", "group": "inventory"},
        {"value": "CC_COIN_GIFTICON", "label": "씨씨코인 깁콘", "group": "inventory"},
        {"value": "BAEMIN_GIFTICON_5000", "label": "깁콘(배민) 5000", "group": "inventory"},
        {"value": "BAEMIN_GIFTICON_10000", "label": "깁콘(배민) 10000", "group": "inventory"},
        {"value": "BAEMIN_GIFTICON_20000", "label": "깁콘(배민) 20000", "group": "inventory"},
        {"value": "COMPOSE_AMERICANO_GIFTICON_3000", "label": "깁콘(컴포즈) 3000", "group": "inventory"},
    ]


@router.get("/withdrawals", response_model=List[AdminWithdrawalDto])
def list_admin_withdrawals(
    status: str = "PENDING",
    db: Session = Depends(get_db),
    admin_info: tuple[int, str] = Depends(get_current_admin_info),
):
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

    AdminAuditService.log(
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

    AdminAuditService.log(
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

    AdminAuditService.log(
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
    from app.services.admin_external_ranking_service import AdminExternalRankingService

    rows = AdminExternalRankingService.list_all(db)

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
                is_visible=bool(p.get("is_visible", True)),
                category=_classify_product_category(str(p.get("reward_type") or "")),
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


@router.post("/withdrawals/{withdrawal_id}/approve")
def approve_withdrawal(
    withdrawal_id: int,
    db: Session = Depends(get_db),
    admin_info: tuple[int, str] = Depends(get_current_admin_info),
):
    """Approve a withdrawal request"""
    admin_id, admin_role = admin_info
    
    withdrawal = db.query(VaultWithdrawalRequest).filter(
        VaultWithdrawalRequest.id == withdrawal_id
    ).first()
    
    if not withdrawal:
        raise HTTPException(status_code=404, detail="WITHDRAWAL_NOT_FOUND")
    
    if withdrawal.status != "PENDING":
        raise HTTPException(status_code=400, detail="WITHDRAWAL_ALREADY_PROCESSED")
    
    withdrawal.status = "APPROVED"
    withdrawal.approved_at = datetime.utcnow()
    withdrawal.approved_by = admin_id
    
    AdminAuditService.log(
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
    """Reject a withdrawal request"""
    admin_id, admin_role = admin_info
    
    withdrawal = db.query(VaultWithdrawalRequest).filter(
        VaultWithdrawalRequest.id == withdrawal_id
    ).first()
    
    if not withdrawal:
        raise HTTPException(status_code=404, detail="WITHDRAWAL_NOT_FOUND")
    
    if withdrawal.status != "PENDING":
        raise HTTPException(status_code=400, detail="WITHDRAWAL_ALREADY_PROCESSED")
    
    withdrawal.status = "REJECTED"
    withdrawal.rejected_at = datetime.utcnow()
    withdrawal.rejection_reason = payload.reason
    
    AdminAuditService.log(
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
