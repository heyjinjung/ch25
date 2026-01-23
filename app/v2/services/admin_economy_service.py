"""V2 admin-specific economy management service (Shop/Withdrawals)."""
from __future__ import annotations
from datetime import datetime
from typing import Any, List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import select
from app.services.ui_config_service import UiConfigService
from app.models.vault_withdrawal_request import VaultWithdrawalRequest

class V2AdminEconomyService:
    @staticmethod
    def load_shop_products(db: Session) -> list[dict]:
        row = UiConfigService.get(db, "v2_shop_products")
        value = row.value_json if row and isinstance(row.value_json, dict) else {}
        products = value.get("products", []) if isinstance(value, dict) else []
        return [p for p in products if isinstance(p, dict)]

    @staticmethod
    def save_shop_products(db: Session, products: list[dict], *, admin_id: int) -> None:
        UiConfigService.upsert(db, "v2_shop_products", {"products": products}, admin_id=admin_id)

    @staticmethod
    def approve_withdrawal(db: Session, withdrawal_id: int, admin_id: int) -> VaultWithdrawalRequest:
        withdrawal = db.get(VaultWithdrawalRequest, withdrawal_id)
        if not withdrawal:
            raise ValueError("WITHDRAWAL_NOT_FOUND")
        if withdrawal.status != "PENDING":
            raise ValueError("WITHDRAWAL_ALREADY_PROCESSED")
        
        withdrawal.status = "APPROVED"
        withdrawal.approved_at = datetime.utcnow()
        withdrawal.approved_by = admin_id
        db.add(withdrawal)
        db.flush()
        return withdrawal

    @staticmethod
    def reject_withdrawal(db: Session, withdrawal_id: int, admin_id: int, reason: str) -> VaultWithdrawalRequest:
        withdrawal = db.get(VaultWithdrawalRequest, withdrawal_id)
        if not withdrawal:
            raise ValueError("WITHDRAWAL_NOT_FOUND")
        if withdrawal.status != "PENDING":
            raise ValueError("WITHDRAWAL_ALREADY_PROCESSED")
        
        withdrawal.status = "REJECTED"
        withdrawal.rejected_at = datetime.utcnow()
        withdrawal.rejection_reason = reason
        db.add(withdrawal)
        db.flush()
        return withdrawal
