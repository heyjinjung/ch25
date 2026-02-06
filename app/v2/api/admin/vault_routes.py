from datetime import datetime, date
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.v2.api.deps import get_current_admin_info, get_db
from app.v2.models.user import V2User
from app.v2.services.vault_service import V2VaultService
from app.v2.services.admin_economy_service import V2AdminEconomyService
from app.v2.schemas.v2_admin_economy import (
    UserVaultDto,
    VaultLedgerResponseDto,
    VaultDailyTrendDto,
    VaultForceEditRequest,
    VaultStatsDto,
    AdminWithdrawalRejectRequest,
)

# =============================================================================
# Vault Admin Routes (CANONICAL)
# =============================================================================
# NOTE: This is the canonical vault admin API.
# Withdrawal endpoints here are preferred over economy_routes.py duplicates.
# FE should use: /api/v2/admin/vault/* endpoints.
# =============================================================================

router = APIRouter()
vault_service = V2VaultService()
economy_service = V2AdminEconomyService()

@router.get("/vault/stats", response_model=VaultStatsDto)
def get_vault_stats(
    db: Session = Depends(get_db),
    admin_info: tuple[int, str] = Depends(get_current_admin_info),
):
    """Get aggregate vault stats."""
    return vault_service.get_admin_stats(db)

@router.get("/vault/users", response_model=list[UserVaultDto])
def get_vault_users(
    limit: int = 50,
    offset: int = 0,
    sort_by: str = "vault_balance",
    db: Session = Depends(get_db),
    admin_info: tuple[int, str] = Depends(get_current_admin_info),
):
    """List users with vault summary."""
    users = vault_service.get_admin_users(db, limit=limit, offset=offset, sort_by=sort_by)
    return [UserVaultDto(**u) for u in users]

@router.get("/vault/users/{user_id}/ledger", response_model=VaultLedgerResponseDto)
def get_vault_user_ledger(
    user_id: int,
    limit: int = 50,
    offset: int = 0,
    db: Session = Depends(get_db),
    admin_info: tuple[int, str] = Depends(get_current_admin_info),
):
    """Get user vault ledger."""
    return vault_service.get_admin_user_ledger(db, user_id=user_id, limit=limit, offset=offset)

@router.get("/vault/trend", response_model=list[VaultDailyTrendDto])
def get_vault_trend(
    days: int = 30,
    db: Session = Depends(get_db),
    admin_info: tuple[int, str] = Depends(get_current_admin_info),
):
    """Get vault daily trend."""
    return vault_service.get_admin_trend(db, days=days)

@router.post("/vault/force-edit")
def force_edit_vault(
    payload: VaultForceEditRequest,
    db: Session = Depends(get_db),
    admin_info: tuple[int, str] = Depends(get_current_admin_info),
):
    """Forcefully edit vault balance."""
    admin_id, _ = admin_info
    return vault_service.force_edit(db, admin_id=admin_id, user_id=payload.user_id, amount=payload.amount, reason=payload.reason)

@router.get("/vault/withdrawals/{status}")
def get_withdrawals_by_status(
    status: str,
    db: Session = Depends(get_db),
    admin_info: tuple[int, str] = Depends(get_current_admin_info),
):
    """Get withdrawals by status."""
    return vault_service.get_admin_withdrawals(db, status=status)

@router.post("/vault/withdrawals/{withdrawal_id}/approve")
def approve_withdrawal(
    withdrawal_id: int,
    db: Session = Depends(get_db),
    admin_info: tuple[int, str] = Depends(get_current_admin_info),
):
    """Approve withdrawal."""
    admin_id, _ = admin_info
    return economy_service.approve_withdrawal(db, withdrawal_id=withdrawal_id, admin_id=admin_id)

@router.post("/vault/withdrawals/{withdrawal_id}/reject")
def reject_withdrawal(
    withdrawal_id: int,
    payload: AdminWithdrawalRejectRequest,
    db: Session = Depends(get_db),
    admin_info: tuple[int, str] = Depends(get_current_admin_info),
):
    """Reject withdrawal."""
    admin_id, _ = admin_info
    return economy_service.reject_withdrawal(db, withdrawal_id=withdrawal_id, admin_id=admin_id, reason=payload.reason)


@router.post("/vault/users/{user_id}/suspend-manual")
def toggle_manual_suspension(
    user_id: int,
    suspended: bool,
    db: Session = Depends(get_db),
    admin_info: tuple[int, str] = Depends(get_current_admin_info),
):
    """Toggle manual benefit suspension for a user."""
    admin_id, _ = admin_info
    user = db.get(V2User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="USER_NOT_FOUND")
    
    user.benefits_suspended_manual = 1 if suspended else 0
    db.add(user)
    
    # Audit log
    from app.v2.services.admin_audit_service import V2AdminAuditService
    V2AdminAuditService.log(
        db,
        admin_id=admin_id,
        action="BENEFITS_SUSPENDED_MANUAL_TOGGLE",
        target_type="USER",
        target_id=str(user_id),
        before={"manual_suspension": not suspended},
        after={"manual_suspension": suspended},
    )
    
    db.commit()
    return {"success": True, "suspended": suspended}


# ─────────────────────────────────────────────────────────────────
# 8.4 Vault & Economy Monitoring (금고/경제 모니터링)
# ─────────────────────────────────────────────────────────────────

class VaultAggregateDto(BaseModel):
    """전체 금고 잔액 집계"""
    total_users: int
    total_locked_balance: int
    total_available_balance: int
    suspended_users_count: int
    suspended_users_balance: int
    average_balance: float
    median_balance: int
    max_balance: int


class VaultSpendLimitDto(BaseModel):
    """지출 한도 추적"""
    user_id: int
    nickname: str
    daily_spent: int
    daily_limit: int
    usage_rate: float  # 0.0 ~ 1.0
    is_limit_reached: bool
    reset_date: str | None


class VaultSpendLimitSummaryDto(BaseModel):
    """지출 한도 요약"""
    total_users: int
    users_at_limit: int
    users_above_80_percent: int
    total_daily_spent: int
    average_usage_rate: float


@router.get("/vault/aggregate", response_model=VaultAggregateDto)
def get_vault_aggregate(
    db: Session = Depends(get_db),
    admin_info: tuple[int, str] = Depends(get_current_admin_info),
):
    """
    전체 금고 잔액 집계

    - 전체 유저 수
    - 전체 locked_balance 합계
    - 제재 유저 수 및 잔액
    - 평균/중간값/최대값
    """
    # 전체 유저 통계
    total_stats = db.query(
        func.count(V2User.id).label("total_users"),
        func.coalesce(func.sum(V2User.vault_locked_balance), 0).label("total_locked"),
        func.coalesce(func.sum(V2User.vault_available_balance), 0).label("total_available"),
        func.coalesce(func.avg(V2User.vault_locked_balance), 0).label("avg_balance"),
        func.coalesce(func.max(V2User.vault_locked_balance), 0).label("max_balance"),
    ).first()

    total_users = int(total_stats.total_users or 0)
    total_locked = int(total_stats.total_locked or 0)
    total_available = int(total_stats.total_available or 0)
    avg_balance = float(total_stats.avg_balance or 0)
    max_balance = int(total_stats.max_balance or 0)

    # 중간값 계산 (근사치)
    median_query = db.query(V2User.vault_locked_balance).filter(
        V2User.vault_locked_balance > 0
    ).order_by(V2User.vault_locked_balance).all()

    if median_query:
        mid = len(median_query) // 2
        median_balance = int(median_query[mid].vault_locked_balance or 0)
    else:
        median_balance = 0

    # 제재 유저 (7일간 입금 0) - 간소화된 추정
    # 실제로는 is_benefits_suspended 호출이 필요하지만, 성능상 근사치 사용
    # vault_locked_balance가 30000 이상이고 최근 활동이 없는 유저를 추정
    suspended_estimate = db.query(
        func.count(V2User.id).label("count"),
        func.coalesce(func.sum(V2User.vault_locked_balance), 0).label("balance"),
    ).filter(
        V2User.vault_locked_balance >= 30000,
    ).first()

    suspended_count = int(suspended_estimate.count or 0)
    suspended_balance = int(suspended_estimate.balance or 0)

    return VaultAggregateDto(
        total_users=total_users,
        total_locked_balance=total_locked,
        total_available_balance=total_available,
        suspended_users_count=suspended_count,
        suspended_users_balance=suspended_balance,
        average_balance=round(avg_balance, 2),
        median_balance=median_balance,
        max_balance=max_balance,
    )


@router.get("/vault/spend-limits", response_model=List[VaultSpendLimitDto])
def get_vault_spend_limits(
    min_usage_rate: float = Query(0.0, ge=0.0, le=1.0, description="최소 사용률 필터"),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    admin_info: tuple[int, str] = Depends(get_current_admin_info),
):
    """
    지출 한도 추적

    - daily_vault_spent 현황
    - 한도 도달율(%)
    - min_usage_rate 필터로 높은 사용률 유저만 조회 가능
    """
    from app.core.config import get_settings
    settings = get_settings()
    daily_limit = int(getattr(settings, "vault_daily_spend_limit", 50000) or 50000)

    # 오늘 날짜
    today = date.today().isoformat()

    # vault_spent_today > 0 인 유저 조회
    query = db.query(V2User).filter(
        V2User.vault_spent_today > 0,
        V2User.vault_spent_reset_date == today,
    ).order_by(V2User.vault_spent_today.desc())

    users = query.limit(limit * 2).all()  # 필터링 여유분

    results = []
    for user in users:
        daily_spent = int(user.vault_spent_today or 0)
        usage_rate = daily_spent / daily_limit if daily_limit > 0 else 0.0

        if usage_rate < min_usage_rate:
            continue

        results.append(VaultSpendLimitDto(
            user_id=user.id,
            nickname=user.nickname or "(미설정)",
            daily_spent=daily_spent,
            daily_limit=daily_limit,
            usage_rate=round(usage_rate, 4),
            is_limit_reached=daily_spent >= daily_limit,
            reset_date=user.vault_spent_reset_date,
        ))

        if len(results) >= limit:
            break

    return results


@router.get("/vault/spend-limits/summary", response_model=VaultSpendLimitSummaryDto)
def get_vault_spend_limits_summary(
    db: Session = Depends(get_db),
    admin_info: tuple[int, str] = Depends(get_current_admin_info),
):
    """
    지출 한도 요약

    - 오늘 지출한 유저 수
    - 한도 도달 유저 수
    - 80% 이상 사용 유저 수
    - 총 지출액
    - 평균 사용률
    """
    from app.core.config import get_settings
    settings = get_settings()
    daily_limit = int(getattr(settings, "vault_daily_spend_limit", 50000) or 50000)

    today = date.today().isoformat()

    # 오늘 지출한 유저 통계
    stats = db.query(
        func.count(V2User.id).label("total_users"),
        func.coalesce(func.sum(V2User.vault_spent_today), 0).label("total_spent"),
        func.coalesce(func.avg(V2User.vault_spent_today), 0).label("avg_spent"),
    ).filter(
        V2User.vault_spent_today > 0,
        V2User.vault_spent_reset_date == today,
    ).first()

    total_users = int(stats.total_users or 0)
    total_spent = int(stats.total_spent or 0)
    avg_spent = float(stats.avg_spent or 0)

    # 한도 도달 유저 수
    at_limit = db.query(func.count(V2User.id)).filter(
        V2User.vault_spent_today >= daily_limit,
        V2User.vault_spent_reset_date == today,
    ).scalar() or 0

    # 80% 이상 사용 유저 수
    threshold_80 = int(daily_limit * 0.8)
    above_80 = db.query(func.count(V2User.id)).filter(
        V2User.vault_spent_today >= threshold_80,
        V2User.vault_spent_reset_date == today,
    ).scalar() or 0

    avg_usage_rate = avg_spent / daily_limit if daily_limit > 0 else 0.0

    return VaultSpendLimitSummaryDto(
        total_users=total_users,
        users_at_limit=int(at_limit),
        users_above_80_percent=int(above_80),
        total_daily_spent=total_spent,
        average_usage_rate=round(avg_usage_rate, 4),
    )

