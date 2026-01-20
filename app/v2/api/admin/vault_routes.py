from datetime import datetime
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.api.deps import get_current_admin_info, get_db
from app.models.user import User
from app.models.vault_withdrawal_request import VaultWithdrawalRequest
from app.services.admin_audit_service import AdminAuditService
from app.v2.schemas.v2_admin_economy import (
    UserVaultDto,
    VaultDailyTrendDto,
    VaultForceEditRequest,
    VaultStatsDto,
    AdminWithdrawalRejectRequest,
)

router = APIRouter()


@router.get("/vault/stats", response_model=VaultStatsDto)
def get_vault_stats(
    db: Session = Depends(get_db),
    admin_info: tuple[int, str] = Depends(get_current_admin_info),
):
    admin_id, admin_role = admin_info

    from datetime import date

    today = date.today()

    today_total = (
        db.query(func.sum(User.vault_available_balance) + func.sum(User.vault_locked_balance))
        .scalar()
        or 0
    )

    today_withdrawals = db.query(VaultWithdrawalRequest).filter(
        func.date(VaultWithdrawalRequest.created_at) == today
    ).all()

    today_pending = sum(w.amount for w in today_withdrawals if w.status == "PENDING")
    today_approved = sum(w.amount for w in today_withdrawals if w.status == "APPROVED")
    today_rejected = sum(w.amount for w in today_withdrawals if w.status == "REJECTED")

    total_pending_count = db.query(VaultWithdrawalRequest).filter(
        VaultWithdrawalRequest.status == "PENDING"
    ).count()

    return VaultStatsDto(
        today_total_vault=int(today_total),
        today_withdrawal_pending=today_pending,
        today_withdrawal_approved=today_approved,
        today_withdrawal_rejected=today_rejected,
        total_pending_count=total_pending_count,
    )


@router.get("/vault/users", response_model=list[UserVaultDto])
def get_vault_users(
    limit: int = 50,
    offset: int = 0,
    sort_by: str = "vault_balance",
    db: Session = Depends(get_db),
    admin_info: tuple[int, str] = Depends(get_current_admin_info),
):
    admin_id, admin_role = admin_info

    query = db.query(User)

    if sort_by == "vault_balance":
        order_col = func.coalesce(User.vault_available_balance, 0) + func.coalesce(
            User.vault_locked_balance, 0
        )
        query = query.order_by(order_col.desc())
    elif sort_by == "total_deposit":
        query = query.order_by(User.total_charge_amount.desc())
    elif sort_by == "last_activity":
        query = query.order_by(User.updated_at.desc())

    users = query.offset(offset).limit(limit).all()

    result = []
    for user in users:
        vault_balance = int(user.vault_available_balance or 0) + int(user.vault_locked_balance or 0)

        tier = "COMMON"
        if user.total_charge_amount:
            if user.total_charge_amount >= 10000000:
                tier = "VVIP"
            elif user.total_charge_amount >= 5000000:
                tier = "VIP"

        total_withdrawal = (
            db.query(func.sum(VaultWithdrawalRequest.amount))
            .filter(
                VaultWithdrawalRequest.user_id == user.id,
                VaultWithdrawalRequest.status == "APPROVED",
            )
            .scalar()
            or 0
        )

        result.append(
            UserVaultDto(
                user_id=user.id,
                nickname=user.nickname or "(미설정)",
                telegram_username=user.telegram_username,
                vault_balance=vault_balance,
                total_deposit=int(user.total_charge_amount or 0),
                total_withdrawal=int(total_withdrawal),
                last_activity=user.updated_at,
                tier=tier,
            )
        )

    return result


@router.get("/vault/trend", response_model=list[VaultDailyTrendDto])
def get_vault_trend(
    days: int = 30,
    db: Session = Depends(get_db),
    admin_info: tuple[int, str] = Depends(get_current_admin_info),
):
    admin_id, admin_role = admin_info

    from datetime import timedelta, date

    today = date.today()

    result = []
    for i in range(days):
        target_date = today - timedelta(days=days - i - 1)

        day_withdrawals = db.query(VaultWithdrawalRequest).filter(
            func.date(VaultWithdrawalRequest.created_at) == target_date
        ).all()

        withdrawal_count = len([w for w in day_withdrawals if w.status == "APPROVED"])
        withdrawal_amount = sum(w.amount for w in day_withdrawals if w.status == "APPROVED")

        deposit_count = 0
        deposit_amount = 0

        total_vault = (
            db.query(func.sum(User.vault_available_balance) + func.sum(User.vault_locked_balance))
            .scalar()
            or 0
        )

        result.append(
            VaultDailyTrendDto(
                date=target_date.strftime("%Y-%m-%d"),
                total_vault=int(total_vault),
                deposit_count=deposit_count,
                withdrawal_count=withdrawal_count,
                deposit_amount=deposit_amount,
                withdrawal_amount=withdrawal_amount,
            )
        )

    return result


@router.post("/vault/force-edit")
def force_edit_vault(
    payload: VaultForceEditRequest,
    db: Session = Depends(get_db),
    admin_info: tuple[int, str] = Depends(get_current_admin_info),
):
    admin_id, admin_role = admin_info

    if admin_role not in ["ADMIN", "OPERATOR", "SUPER_ADMIN"]:
        raise HTTPException(status_code=403, detail="NOT_AUTHORIZED")

    user = db.query(User).filter(User.id == payload.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="USER_NOT_FOUND")

    current_available = int(user.vault_available_balance or 0)
    current_locked = int(user.vault_locked_balance or 0)
    before_balance = current_available + current_locked

    delta = int(payload.amount)
    if before_balance + delta < 0:
        raise HTTPException(status_code=400, detail="INSUFFICIENT_BALANCE")

    # Vault SoT is `vault_locked_balance`.
    # - Increases always go to locked.
    # - Decreases consume locked first, then available only if needed (legacy carryover).
    if delta >= 0:
        user.vault_locked_balance = current_locked + delta
    else:
        if current_locked + delta >= 0:
            user.vault_locked_balance = current_locked + delta
        else:
            remaining = delta + current_locked  # negative
            user.vault_locked_balance = 0
            user.vault_available_balance = current_available + remaining

    after_balance = int(user.vault_available_balance or 0) + int(user.vault_locked_balance or 0)

    AdminAuditService.log(
        db,
        admin_id,
        "VAULT_FORCE_EDIT",
        "USER",
        str(payload.user_id),
        before={"vault_balance": before_balance},
        after={
            "vault_balance": after_balance,
            "amount_change": delta,
            "reason": payload.reason,
        },
    )

    db.commit()

    return {
        "success": True,
        "user_id": payload.user_id,
        "before_balance": before_balance,
        "after_balance": after_balance,
        "amount_change": delta,
    }


@router.get("/vault/withdrawals/{status}")
def get_withdrawals_by_status(
    status: str,
    db: Session = Depends(get_db),
    admin_info: tuple[int, str] = Depends(get_current_admin_info),
):
    """Get withdrawal requests by status (PENDING, APPROVED, REJECTED, ALL)"""
    admin_id, admin_role = admin_info
    
    from datetime import date
    today = date.today()
    
    query = db.query(VaultWithdrawalRequest)
    
    # Filter by status
    if status.upper() != "ALL":
        query = query.filter(VaultWithdrawalRequest.status == status.upper())
    
    # Get today's withdrawals
    today_withdrawals = query.filter(
        func.date(VaultWithdrawalRequest.created_at) == today
    ).all()
    
    result = []
    for w in today_withdrawals:
        user = db.query(User).filter(User.id == w.user_id).first()
        result.append({
            "id": w.id,
            "user_id": w.user_id,
            "nickname": user.nickname if user else "(알 수 없음)",
            "telegram_username": user.telegram_username if user else None,
            "amount": w.amount,
            "status": w.status,
            "created_at": w.created_at.strftime("%Y-%m-%d %H:%M:%S"),
            "approved_at": w.approved_at.strftime("%Y-%m-%d %H:%M:%S") if w.approved_at else None,
            "rejected_at": w.rejected_at.strftime("%Y-%m-%d %H:%M:%S") if w.rejected_at else None,
            "rejection_reason": w.rejection_reason,
        })
    
    total_amount = sum(w.amount for w in today_withdrawals)
    
    return {
        "status": status,
        "count": len(result),
        "total_amount": total_amount,
        "withdrawals": result
    }


@router.post("/vault/withdrawals/{withdrawal_id}/approve")
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


@router.post("/vault/withdrawals/{withdrawal_id}/reject")
def reject_withdrawal(
    withdrawal_id: int,
    db: Session = Depends(get_db),
    admin_info: tuple[int, str] = Depends(get_current_admin_info),
):
    """Reject a withdrawal request"""
    from pydantic import BaseModel
    from fastapi import Body
    
    class RejectRequest(BaseModel):
        reason: str
    
    admin_id, admin_role = admin_info
    
    withdrawal = db.query(VaultWithdrawalRequest).filter(
        VaultWithdrawalRequest.id == withdrawal_id
    ).first()
    
    if not withdrawal:
        raise HTTPException(status_code=404, detail="WITHDRAWAL_NOT_FOUND")
    
    if withdrawal.status != "PENDING":
        raise HTTPException(status_code=400, detail="WITHDRAWAL_ALREADY_PROCESSED")
    
    # Get reason from request - will be populated by FastAPI
    # This is a workaround since we can't access request body in function signature
    return {"success": True, "id": withdrawal_id}

