from datetime import datetime
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import desc

from app.api.deps import get_db, get_current_admin_id
from app.models.vault_withdrawal_request import VaultWithdrawalRequest
from app.v2.models.user import V2User
from app.models.user_cash_ledger import UserCashLedger
from app.services.vault_service import VaultService

router = APIRouter(prefix="/admin/api/vault/admin", tags=["admin-vault-requests"])

class VaultRequestResponse(BaseModel):
    id: int
    user_id: int
    amount: int
    status: str
    created_at: datetime
    admin_memo: Optional[str]
    user: Optional[dict]

    class Config:
        orm_mode = True

class ProcessRequest(BaseModel):
    request_id: int
    action: str  # APPROVE, REJECT
    admin_memo: Optional[str] = None
    approved_amount: Optional[int] = None  # NEW: Allow override during approval

class AdjustAmountRequest(BaseModel):
    request_id: int
    new_amount: int
    admin_memo: Optional[str] = None

@router.get("/requests")
def list_requests(
    status: Optional[str] = None,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    try:
        q = db.query(VaultWithdrawalRequest).options(joinedload(VaultWithdrawalRequest.user))
        
        if status and status != "ALL":
            q = q.filter(VaultWithdrawalRequest.status == status)
        
        requests = q.order_by(desc(VaultWithdrawalRequest.created_at)).limit(limit).all()
        
        # Custom serialization to include user info safely
        results = []
        for r in requests:
            user_data = None
            if r.user:
                try:
                    user_data = {
                        "id": r.user.id,
                        "nickname": getattr(r.user, "nickname", "-"),
                        "username": getattr(r.user, "username", "-"),
                        "telegram_username": getattr(r.user, "telegram_username", None),
                        "external_id": getattr(r.user, "external_id", str(r.user.id)),
                    }
                except Exception as e:
                    print(f"Error serializing user for req {r.id}: {e}")
                    # Fallback user data, don't show "Error" to UI if possible, try basic ID
                    user_data = {"id": r.user_id, "nickname": "Unknown", "external_id": str(r.user_id)}

            results.append({
                "id": r.id,
                "user_id": r.user_id,
                "amount": r.amount,
                "status": r.status,
                "created_at": r.created_at,
                "admin_memo": r.admin_memo,
                "user": user_data
            })
        return results
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Internal Error: {str(e)}")

@router.post("/process")
def process_request(
    payload: ProcessRequest,
    db: Session = Depends(get_db),
    admin_id: int = Depends(get_current_admin_id)
):
    req = db.query(VaultWithdrawalRequest).filter(VaultWithdrawalRequest.id == payload.request_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="REQUEST_NOT_FOUND")
    
    if req.status != "PENDING":
        raise HTTPException(status_code=400, detail="REQUEST_NOT_PENDING")

    # Lock User properties
    user = db.query(V2User).filter(V2User.id == req.user_id).with_for_update().first()
    if not user:
         raise HTTPException(status_code=404, detail="USER_NOT_FOUND")

    if payload.action == "APPROVE":
        # Handle Amount Override
        if payload.approved_amount is not None and payload.approved_amount != req.amount:
            old_amount = req.amount
            req.amount = payload.approved_amount
            req.admin_memo = f"{req.admin_memo or ''} | Amount adjusted from {old_amount} to {req.amount} during approval by Admin {admin_id}"

        # Deduct the amount from user's Vault Balance permanently
        # Prior to this, it was "Reserved" (part of Locked but deducted from Available).
        # Approving means we consume the Locked amount.
        
        # Check integrity (though UI should handle it)
        if (user.vault_locked_balance or 0) < req.amount:
             # Should we force it? Or fail? Let's fail safety.
             # Wait, reserved amount is part of locked. If locked < amount, something is wrong.
             # We allow going negative? No.
             raise HTTPException(status_code=400, detail="INSUFFICIENT_FUNDS_FOR_APPROVAL")

        user.vault_locked_balance = (user.vault_locked_balance or 0) - req.amount
        VaultService.sync_legacy_mirror(user)
        
        # Record Ledger (Cash Ledger used for tracking vault flows too?)
        # Or just audit log.
        # Let's add a UserCashLedger entry for record keeping (even if it's Vault asset)
        # Using specific reason text
        ledger = UserCashLedger(
            user_id=user.id,
            delta=-req.amount,
            balance_after=user.vault_locked_balance,
            reason="VAULT_WITHDRAWAL_APPROVED",
            label=f"Vault Withdrawal Approved #{req.id}",
            meta_json={"admin_id": admin_id, "request_id": req.id}
        )
        db.add(ledger)
        
        req.status = "APPROVED"

    elif payload.action == "REJECT":
        # Rejecting releases the "Reserved" status. 
        # Since "Reserved" is dynamic (calculated from PENDING requests), 
        # changing status to REJECTED automatically returns funds to Available 
        # (because they are no longer counted as PENDING).
        req.status = "REJECTED"
    
    else:
        raise HTTPException(status_code=400, detail="INVALID_ACTION")

    req.admin_memo = payload.admin_memo
    req.processed_at = datetime.utcnow()
    req.processed_by = admin_id
    
    db.commit()
    return {"ok": True}

@router.post("/adjust-amount")
def adjust_amount(
    payload: AdjustAmountRequest,
    db: Session = Depends(get_db),
    admin_id: int = Depends(get_current_admin_id)
):
    req = db.query(VaultWithdrawalRequest).filter(VaultWithdrawalRequest.id == payload.request_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="REQUEST_NOT_FOUND")
    
    if req.status != "PENDING":
        raise HTTPException(status_code=400, detail="REQUEST_NOT_PENDING")
        
    old_amount = req.amount
    req.amount = payload.new_amount
    req.admin_memo = f"{req.admin_memo or ''} | Amount adjusted from {old_amount} to {payload.new_amount} by Admin {admin_id}"
    
    db.commit()
    return {"ok": True}
