"""V2 Admin UI Routes."""
from datetime import datetime
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.api.deps import get_current_admin_id, get_db
from app.models.game_wallet import GameTokenType, UserGameWallet
from app.models.inventory import UserInventoryItem
from app.models.user import User
from app.models.vault_withdrawal_request import VaultWithdrawalRequest
from app.models.user_retention_state import UserRetentionState  
from app.v2.schemas.v2_admin_economy import AdminWithdrawalDto
from app.v2.schemas.v2_admin_ops import (
    OpsDashboardResponse,
    OpsGoldenRadarDto,
    OpsMetricsDto,
    OpsSystemStatusDto,
)
from app.v2.schemas.v2_admin_user import AdminUserDetailDto

router = APIRouter(prefix="/admin", tags=["v2-admin-ui"])


@router.get("/users/{user_id}", response_model=AdminUserDetailDto)
def get_admin_user_detail(
    user_id: int,
    db: Session = Depends(get_db),
    admin_id: int = Depends(get_current_admin_id),
):
    """Get 360-view of a user."""
    _ = admin_id
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="USER_NOT_FOUND")

    # 1. Ticket Balance
    # Sum of all major ticket types
    ticket_balance = 0
    wallets = db.query(UserGameWallet).filter(UserGameWallet.user_id == user_id).all()
    for w in wallets:
        if "TICKET" in w.token_type.name or "COIN" in w.token_type.name:
             ticket_balance += int(w.balance or 0)

    # 2. Vault/Assets
    vault_balance = int(user.vault_locked_balance or 0) + int(user.vault_available_balance or 0)
    
    # Inventory Asset Value (Optional approximation)
    # For now, just using Vault + Cash logic if any
    current_assets = vault_balance  
    
    # 3. Retention/Risk State
    retention = db.query(UserRetentionState).filter(UserRetentionState.user_id == user_id).first()
    risk_level = "LOW"
    risk_reason = None
    
    if retention:
        if retention.churn_probability_score > 0.8:
            risk_level = "HIGH"
            risk_reason = "High Churn Probability"
        elif retention.churn_probability_score > 0.5:
            risk_level = "MEDIUM"
            
    # Check simple high roller logic
    if user.total_charge_amount > 10000000:  # 10m KRW
        risk_level = "HIGH" # Just as example of importance
        risk_reason = "High Value Account"

    return AdminUserDetailDto(
        id=user.id,
        nickname=user.nickname,
        telegram_id=user.telegram_id,
        created_at=user.created_at,
        total_deposit=int(user.total_charge_amount or 0),
        current_assets=current_assets,
        vault_balance=vault_balance,
        ticket_balance=ticket_balance,
        level=user.level,
        vip_level="VIP" if user.total_charge_amount > 5000000 else "COMMON", # Simple logic
        is_active=(user.status == "ACTIVE"),
        risk_level=risk_level,
        risk_reason=risk_reason
    )


@router.get("/withdrawals", response_model=List[AdminWithdrawalDto])
def list_admin_withdrawals(
    status: str = "PENDING",
    db: Session = Depends(get_db),
    admin_id: int = Depends(get_current_admin_id),
):
    """List withdrawal requests."""
    _ = admin_id
    query = db.query(VaultWithdrawalRequest)
    if status:
        query = query.filter(VaultWithdrawalRequest.status == status)
    
    rows = query.order_by(VaultWithdrawalRequest.created_at.desc()).limit(100).all()
    
    result = []
    for r in rows:
        # Determine risk level (Mock logic or based on amount)
        risk = "LOW"
        if r.amount >= 1000000:
            risk = "HIGH"
        elif r.amount >= 300000:
            risk = "MEDIUM"
            
        result.append(AdminWithdrawalDto(
            id=r.id,
            user_id=r.user_id,
            nickname=r.user.nickname if r.user else "Unknown",
            amount=r.amount,
            request_time=r.created_at,
            risk_level=risk,
            status=r.status
        ))
    return result


@router.get("/ops/status", response_model=OpsDashboardResponse)
def get_ops_dashboard_status(
    db: Session = Depends(get_db),
    admin_id: int = Depends(get_current_admin_id),
):
    """Get Ops Dashboard Status (System & Radar)."""
    _ = admin_id
    
    # 1. System Status (Mock Check)
    # Real implementation would ping Redis/Celery
    system_status = OpsSystemStatusDto(
        db="OK",
        redis="OK",
        worker="OK"
    )
    
    # 2. Golden Radar
    # Count High Rollers (e.g. Total Charge > 1m)
    high_rollers = db.query(User).filter(User.total_charge_amount >= 1000000).count()
    
    # Count Churn Risk (from retention state)
    churn_risks = db.query(UserRetentionState).filter(UserRetentionState.churn_probability_score >= 0.7).count()
    
    # Online Users (would normally check Redis sessions)
    online_now = 42 # Mock for now
    
    golden_radar = OpsGoldenRadarDto(
        high_rollers=high_rollers,
        churn_risks=churn_risks,
        online_now=online_now
    )
    
    # 3. Metrics
    # Sum of deposits today? 
    # Use vault_spent_today as a proxy for activity
    revenue = db.query(func.sum(User.vault_spent_today)).scalar() or 0
    
    metrics = OpsMetricsDto(
        today_revenue=int(revenue),
        active_users_24h=120  # Mock
    )
    
    return OpsDashboardResponse(
        system=system_status,
        golden_radar=golden_radar,
        metrics=metrics
    )
