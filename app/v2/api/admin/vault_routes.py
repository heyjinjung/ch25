from datetime import datetime
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_current_admin_info, get_db
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

