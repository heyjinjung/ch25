"""V2 admin-specific economy management service (Shop/Withdrawals)."""
from __future__ import annotations
from datetime import datetime
from typing import Any, List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import select
from app.v2.services.ui_config_service import UiConfigService
from app.v2.services.spending_logger_service import SpendingLoggerService
from app.v2.models import VaultWithdrawalRequest

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

        SpendingLoggerService.log_vault_withdrawal(
            db=db,
            user_id=withdrawal.user_id,
            amount=withdrawal.amount,
            request_id=withdrawal.id,
            metadata={
                "admin_id": admin_id,
                "approved_at": datetime.utcnow().isoformat(),
            },
        )
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

    @staticmethod
    def list_latency_evidences(db: Session, status: str = None) -> List[Any]:
        from app.v2.models.v2_user_deposit_evidence import V2UserDepositEvidence
        from app.v2.models.user import V2User
        
        query = db.query(V2UserDepositEvidence, V2User.nickname).outerjoin(V2User, V2UserDepositEvidence.user_id == V2User.id)
        if status:
            query = query.filter(V2UserDepositEvidence.status == status)
        
        rows = query.order_by(V2UserDepositEvidence.created_at.desc()).all()
        result = []
        for evidence, nickname in rows:
            # Attach nickname for DTO
            evidence.nickname = nickname
            result.append(evidence)
        return result

    @staticmethod
    def verify_latency_evidence(db: Session, evidence_id: int, log_id: int, admin_id: int):
        from app.v2.services.latency_survival_service import V2LatencySurvivalService
        return V2LatencySurvivalService.verify_evidence(
            db,
            admin_id,
            evidence_id,
            matched_log_id=log_id,
        )

    @staticmethod
    def reject_latency_evidence(db: Session, evidence_id: int, reason: str, admin_id: int):
        from app.v2.services.latency_survival_service import V2LatencySurvivalService
        return V2LatencySurvivalService.reject_evidence(
            db,
            admin_id,
            evidence_id,
            reason,
        )

    @staticmethod
    def get_circuit_breaker_status(db: Session) -> List[dict]:
        from app.v2.services.circuit_breaker_service import CircuitBreakerService
        from app.core.config import get_settings
        
        settings = get_settings()
        asset_types = ["VAULT", "TICKET"] # Basic supported types
        
        result = []
        for asset in asset_types:
            status = CircuitBreakerService.get_status(db, asset)
            config = CircuitBreakerService.get_config(db, asset)
            
            result.append({
                "asset_type": asset,
                "global": {
                    "current": status["global_current"],
                    "limit": status["global_limit"],
                    "is_breached": status["is_global_breached"]
                },
                "config": {
                    "global_limit": config["global_limit"],
                    "user_limit": config["user_limit"]
                }
            })
        return result

    @staticmethod
    def reset_circuit_breaker(db: Session, asset_type: str, limit_type: str, user_id: int = None) -> None:
        from app.v2.services.circuit_breaker_service import CircuitBreakerService
        if limit_type == "GLOBAL":
            CircuitBreakerService.reset_global_limit(db, asset_type)
        elif limit_type == "USER" and user_id:
            CircuitBreakerService.reset_user_limit(db, asset_type, user_id)
