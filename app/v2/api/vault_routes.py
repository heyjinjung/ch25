"""V2 Vault routes.
Minimal patch: Reuse V1 status logic but expose as V2 endpoint.
"""
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.api.deps import get_db
from app.v2.api.deps import get_current_user_id
from app.api.routes import vault as v1_vault
from app.models.user import User
from app.v2.models.user import V2User
from app.v2.services.user_service import V2UserService
from pydantic import BaseModel

router = APIRouter(prefix="/vault", tags=["Vault"])

class VaultWithdrawRequest(BaseModel):
    amount: int
    protocol_key: str | None = None

@router.get("/status")
def get_v2_vault_status(
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id)
):
    try:
        legacy_user_id = V2UserService.ensure_legacy_user_id(db, user_id)
        v2_user = db.get(V2User, user_id)
        legacy_user = db.get(User, legacy_user_id)
        if v2_user and legacy_user:
            legacy_user.vault_locked_balance = int(v2_user.vault_locked_balance or 0)
            db.add(legacy_user)
            db.flush()
        res = v1_vault.status(db=db, user_id=legacy_user_id)
        # Convert to a dict and ensure it matches V2 OpenAPI or just return as is if fields match
        # V2 OpenAPI fields: vaultBalance, lockedBalance, availableBalance (camelCase)
        # V1 Response fields: vault_balance, locked_balance, available_balance (snake_case)
        # We need to map them to match the new V2 FE expectations in OpenAPI
        
        return {
            "eligible": bool(res.eligible),
            "vaultBalance": int(res.vault_balance or 0),
            "lockedBalance": int(res.locked_balance or 0),
            "availableBalance": int(res.available_balance or 0),
            "ticketCount": int(res.ticket_count or 0),
            "is_golden_hour_active": bool(getattr(res, "is_golden_hour_active", False)),
            "golden_hour_multiplier": float(getattr(res, "golden_hour_multiplier", 1.0)),
            "golden_hour_remaining_seconds": int(getattr(res, "golden_hour_remaining_seconds", 0)),
            "showModalOverride": getattr(res, "show_modal_override", None),
            "segment": res.segment,
            "daily_play_count": int(getattr(res, "daily_play_count", 0) or 0),
            "daily_play_target": int(getattr(res, "daily_play_target", 30) or 30),
            "daily_vault_spent": int(getattr(res, "daily_vault_spent", 0) or 0),
            "daily_vault_spent_target": int(getattr(res, "daily_vault_spent_target", 10000) or 10000),
            "daily_deposit_confirmed": bool(getattr(res, "daily_deposit_confirmed", False)),
            "withdrawal_count": int(getattr(res, "withdrawal_count", 0) or 0),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/withdraw")
def v2_withdraw(
    payload: VaultWithdrawRequest,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id)
):
    # Reuse V1 withdrawal logic
    v1_payload = v1_vault.WithdrawRequestPayload(amount=payload.amount)
    try:
        legacy_user_id = V2UserService.ensure_legacy_user_id(db, user_id)
        v2_user = db.get(V2User, user_id)
        legacy_user = db.get(User, legacy_user_id)
        if v2_user and legacy_user:
            legacy_user.vault_locked_balance = int(v2_user.vault_locked_balance or 0)
            db.add(legacy_user)
            db.flush()
        res = v1_vault.request_withdraw(payload=v1_payload, db=db, user_id=legacy_user_id)
        if v2_user and legacy_user:
            v2_user.vault_locked_balance = int(legacy_user.vault_locked_balance or 0)
            db.add(v2_user)
            db.commit()
        return res
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
