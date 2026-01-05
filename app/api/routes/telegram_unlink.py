"""API routes for Telegram unlink request workflow."""

from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api import deps
from app.models.user import User
from app.models.telegram_unlink_request import TelegramUnlinkRequest

router = APIRouter(prefix="/api/telegram", tags=["telegram-unlink"])


class UnlinkRequestCreate(BaseModel):
    telegram_id: str
    reason: str
    evidence: Optional[str] = None  # JSON string with proof


class UnlinkRequestResponse(BaseModel):
    id: int
    telegram_id: str
    status: str
    created_at: datetime
    message: str


@router.post("/unlink-request", response_model=UnlinkRequestResponse)
def submit_unlink_request(
    payload: UnlinkRequestCreate,
    db: Session = Depends(deps.get_db),
    user_id: int = Depends(deps.get_current_user_id),
) -> UnlinkRequestResponse:
    """Submit a request to unlink a Telegram ID from another account.
    
    Used when a user encounters 409 TELEGRAM_ALREADY_LINKED error.
    """
    # Normalize telegram_id to int for DB lookup (User.telegram_id is numeric)
    try:
        telegram_id_int = int(payload.telegram_id)
    except (TypeError, ValueError):
        raise HTTPException(status_code=400, detail="INVALID_TELEGRAM_ID")

    telegram_id_norm = str(telegram_id_int)

    # Find who currently owns this telegram_id
    current_owner = db.query(User).filter(User.telegram_id == telegram_id_int).first()
    
    if not current_owner:
        raise HTTPException(status_code=400, detail="TELEGRAM_ID_NOT_LINKED_TO_ANY_ACCOUNT")
    
    if current_owner.id == user_id:
        raise HTTPException(status_code=400, detail="TELEGRAM_ID_ALREADY_LINKED_TO_YOUR_ACCOUNT")
    
    # Check for existing pending request
    existing = db.query(TelegramUnlinkRequest).filter(
        TelegramUnlinkRequest.telegram_id == telegram_id_norm,
        TelegramUnlinkRequest.requester_user_id == user_id,
        TelegramUnlinkRequest.status == "PENDING"
    ).first()
    
    if existing:
        raise HTTPException(status_code=409, detail="PENDING_REQUEST_EXISTS")
    
    request = TelegramUnlinkRequest(
        telegram_id=telegram_id_norm,
        current_user_id=current_owner.id,
        requester_user_id=user_id,
        reason=payload.reason,
        evidence=payload.evidence,
        status="PENDING",
    )
    db.add(request)
    db.commit()
    db.refresh(request)
    
    return UnlinkRequestResponse(
        id=request.id,
        telegram_id=request.telegram_id,
        status=request.status,
        created_at=request.created_at,
        message="요청이 접수되었습니다. 관리자 검토 후 처리됩니다.",
    )


# --- Admin Routes ---
admin_router = APIRouter(prefix="/api/admin/telegram", tags=["admin-telegram"])


class UnlinkRequestAdminView(BaseModel):
    id: int
    telegram_id: str
    current_user_id: int | None
    current_user_nickname: str | None
    requester_user_id: int | None
    requester_nickname: str | None
    reason: str | None
    evidence: str | None
    status: str
    created_at: datetime
    processed_at: datetime | None
    admin_memo: str | None


class AdminProcessRequest(BaseModel):
    action: str  # APPROVE, REJECT
    admin_memo: str | None = None


@admin_router.get("/unlink-requests", response_model=list[UnlinkRequestAdminView])
def list_unlink_requests(
    status: str = "PENDING",
    db: Session = Depends(deps.get_db),
    admin_id: int = Depends(deps.get_current_admin_id),
) -> list[UnlinkRequestAdminView]:
    """List Telegram unlink requests for admin review."""
    requests = db.query(TelegramUnlinkRequest).filter(
        TelegramUnlinkRequest.status == status
    ).order_by(TelegramUnlinkRequest.created_at.desc()).all()
    
    result = []
    for req in requests:
        result.append(UnlinkRequestAdminView(
            id=req.id,
            telegram_id=req.telegram_id,
            current_user_id=req.current_user_id,
            current_user_nickname=req.current_user.nickname if req.current_user else None,
            requester_user_id=req.requester_user_id,
            requester_nickname=req.requester_user.nickname if req.requester_user else None,
            reason=req.reason,
            evidence=req.evidence,
            status=req.status,
            created_at=req.created_at,
            processed_at=req.processed_at,
            admin_memo=req.admin_memo,
        ))
    return result


@admin_router.post("/unlink-requests/{request_id}/process")
def process_unlink_request(
    request_id: int,
    payload: AdminProcessRequest,
    db: Session = Depends(deps.get_db),
    admin_id: int = Depends(deps.get_current_admin_id),
):
    """Approve or reject an unlink request."""
    action = payload.action.upper()
    if action not in ("APPROVE", "REJECT"):
        raise HTTPException(status_code=400, detail="INVALID_ACTION")
    
    req = db.query(TelegramUnlinkRequest).filter(
        TelegramUnlinkRequest.id == request_id
    ).with_for_update().first()
    
    if not req:
        raise HTTPException(status_code=404, detail="REQUEST_NOT_FOUND")
    
    if req.status != "PENDING":
        raise HTTPException(status_code=400, detail="REQUEST_ALREADY_PROCESSED")
    
    now = datetime.utcnow()
    req.processed_at = now
    req.processed_by = admin_id
    req.admin_memo = payload.admin_memo
    
    if action == "APPROVE":
        req.status = "APPROVED"
        
        # Unlink the telegram_id from current owner
        if req.current_user_id:
            current_owner = db.query(User).filter(User.id == req.current_user_id).first()
            if current_owner and current_owner.telegram_id is not None:
                # Compare robustly across possible types (int in User, str in request)
                matches = False
                try:
                    matches = int(current_owner.telegram_id) == int(req.telegram_id)
                except (TypeError, ValueError):
                    matches = str(current_owner.telegram_id) == str(req.telegram_id)

                if matches:
                    current_owner.telegram_id = None
                    current_owner.telegram_username = None
        
        # Optionally: Link to requester automatically?
        # For safety, we just unlink. Requester can now link via normal flow.
        
    elif action == "REJECT":
        req.status = "REJECTED"
    
    db.commit()
    
    return {
        "request_id": req.id,
        "status": req.status,
        "processed_at": req.processed_at,
        "message": "승인되었습니다. 요청자는 이제 텔레그램 연동을 진행할 수 있습니다." if action == "APPROVE" else "요청이 거절되었습니다."
    }
