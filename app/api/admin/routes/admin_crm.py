
"""Admin CRM and Messaging Endpoints."""
import csv
import io
from typing import List, Optional

from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, BackgroundTasks
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_current_admin_id
from app.services.user_segment_service import UserSegmentService
from app.services.admin_user_identity_service import resolve_user_id_by_identifier
from app.models.user import User
from app.models.admin_message import AdminMessage, AdminMessageInbox
from app.models.admin_user_profile import AdminUserProfile
from app.db.session import SessionLocal

# Schemas (inline for now, or move to app/schemas/admin_crm.py)
from pydantic import BaseModel
from datetime import datetime
from app.core.security import hash_password

# Default password for auto-created users via CSV import
DEFAULT_IMPORT_PASSWORD = "1234"

router = APIRouter(prefix="/admin/api/crm", tags=["admin-crm"])

class AdminUserProfileResponse(BaseModel):
    user_id: int
    external_id: Optional[str]
    real_name: Optional[str]
    phone_number: Optional[str]
    telegram_id: Optional[str]
    tags: Optional[List[str]] = []
    memo: Optional[str]
    computed_segments: List[str] = []
    
    class Config:
        from_attributes = True

class ImportResult(BaseModel):
    total_processed: int
    success_count: int
    failed_count: int
    errors: List[str]
    charge_risk_segments: dict = {}  # {"LOW": x, "MEDIUM": y, "HIGH": z}
    tag_counts: dict = {}  # {"태그명": count}

    # NEW: Retention & Game Stats (2026-01-03)
    roulette_spins: int = 0
    dice_rolls: int = 0
    avg_vault_balance: float = 0.0

class MessageCreate(BaseModel):
    title: str
    content: str
    target_type: str # ALL, SEGMENT, TAG, USER
    target_value: Optional[str]
    channels: List[str] = ["INBOX"]

class MessageResponse(BaseModel):
    id: int
    sender_admin_id: int
    title: str
    content: str
    target_type: str
    target_value: Optional[str]
    recipient_count: int
    read_count: int
    created_at: datetime
    
    class Config:
        from_attributes = True


class MessageUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None

class CrmStatsResponse(BaseModel):
    total_users: int
    active_users: int
    paying_users: int
    whale_count: int
    conversion_rate: float
    retention_rate: float
    empty_tank_count: int
    
    # Advanced KPIs
    churn_rate: float
    new_user_growth: float
    message_open_rate: float
    
    # Segmentation Distribution
    segments: dict = {} # e.g. {"DAILY": 10, "WEEKLY": 5}
    
    # NEW: Imported Profile Data KPIs
    avg_active_days: float = 0
    charge_risk_segments: dict = {}
    tag_counts: dict = {}

    # NEW: Game & Vault KPIs (2026-01-03)
    roulette_spins: int = 0
    dice_rolls: int = 0
    avg_vault_balance: float = 0.0

@router.get("/stats", response_model=CrmStatsResponse)
def get_crm_stats(db: Session = Depends(get_db)):
    """Get aggregated CRM statistics."""
    return UserSegmentService.get_overall_stats(db)

@router.get("/segment-detail", response_model=List[AdminUserProfileResponse])
def get_segment_detail(segment_type: str, limit: int = 100, db: Session = Depends(get_db)):
    """Get users in a specific segment with profile info."""
    user_ids = UserSegmentService.get_users_by_segment(db, segment_type, limit)
    results = []
    for uid in user_ids:
        profile = UserSegmentService.get_user_profile(db, uid)
        segments = UserSegmentService.get_computed_segments(db, uid)
        
        # User object for external_id fallback
        u = db.query(User).filter(User.id == uid).first()
        
        resp = AdminUserProfileResponse(
            user_id=uid,
            external_id=u.external_id if u else None,
            real_name=profile.real_name if profile else None,
            phone_number=profile.phone_number if profile else None,
            telegram_id=profile.telegram_id if profile else None,
            tags=profile.tags if profile else [],
            memo=profile.memo if profile else None,
            computed_segments=segments
        )
        results.append(resp)
    return results

@router.post("/import-profiles", response_model=ImportResult)
async def import_profiles(
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """Import User Profiles from CSV.
    Expected columns: external_id, real_name, phone, telegram, memo, tags (comma-sep)
    """
    if not file.filename.endswith(".csv"):
        raise HTTPException(400, "Only CSV files are supported.")

    content = await file.read()
    decoded = content.decode("utf-8-sig") # Handle BOM
    reader = csv.DictReader(io.StringIO(decoded))
    
    total = 0
    success = 0
    failed = 0
    errors = []
    
    for row in reader:
        total += 1
    for row in reader:
        total += 1
        try:
            # Delegate processing to Service
            result = UserSegmentService.resolve_and_sync_user_from_import(db, row, DEFAULT_IMPORT_PASSWORD)
            
            if result.get("success"):
                success += 1
            else:
                failed += 1
                errors.append(f"Row {total}: {result.get('error')}")
            
        except Exception as e:
            failed += 1
            errors.append(f"Row {total}: {str(e)}")
            
        except Exception as e:
            failed += 1
            errors.append(f"Row {total}: {str(e)}")
            
    return ImportResult(
        total_processed=total,
        success_count=success,
        failed_count=failed,
        errors=errors[:10] # Limit error size
    )

@router.get("/user/{user_id}/segments", response_model=AdminUserProfileResponse)
def get_user_crm_info(user_id: int, db: Session = Depends(get_db)):
    """Get manual profile + computed segments."""
    profile = UserSegmentService.get_user_profile(db, user_id)
    segments = UserSegmentService.get_computed_segments(db, user_id)
    
    # Construct response
    resp = AdminUserProfileResponse(
        user_id=user_id,
        external_id=None,
        real_name=None,
        phone_number=None,
        telegram_id=None,
        tags=[],
        memo=None,
        computed_segments=segments
    )
    
    if profile:
        resp.external_id = profile.external_id
        resp.real_name = profile.real_name
        resp.phone_number = profile.phone_number
        resp.telegram_id = profile.telegram_id
        resp.tags = profile.tags or []
        resp.memo = profile.memo
        
    return resp

@router.post("/messages", response_model=MessageResponse)
def send_message(
    payload: MessageCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    admin_id: int = Depends(get_current_admin_id)
):
    """Send admin message (Async fan-out)."""
    if payload.target_type != "ALL" and not (payload.target_value and payload.target_value.strip()):
        raise HTTPException(status_code=400, detail="TARGET_VALUE_REQUIRED")

    resolved_user_ids: Optional[List[int]] = None
    if payload.target_type == "USER":
        identifiers = [v.strip() for v in (payload.target_value or "").split(",") if v.strip()]
        if not identifiers:
            raise HTTPException(status_code=400, detail="IDENTIFIER_REQUIRED")
        resolved_user_ids = []
        for identifier in identifiers:
            resolved_user_ids.append(resolve_user_id_by_identifier(db, identifier))

    # Create record
    msg = AdminMessage(
        sender_admin_id=admin_id,
        title=payload.title,
        content=payload.content,
        target_type=payload.target_type,
        target_value=payload.target_value,
        channels=payload.channels
    )
    db.add(msg)
    db.commit()
    db.refresh(msg)
    
    # Fan-out logic (naive sync for now, or background task)
    background_tasks.add_task(
        fan_out_message,
        msg.id,
        payload.target_type,
        payload.target_value,
        resolved_user_ids,
    )
    
    return msg

@router.get("/messages", response_model=List[MessageResponse])
def list_messages(
    skip: int = 0, 
    limit: int = 50, 
    db: Session = Depends(get_db)
):
    return (
        db.query(AdminMessage)
        .filter(AdminMessage.is_deleted == False)
        .order_by(AdminMessage.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )


@router.put("/messages/{message_id}", response_model=MessageResponse)
def update_message(
    message_id: int,
    payload: MessageUpdate,
    db: Session = Depends(get_db),
    admin_id: int = Depends(get_current_admin_id),
):
    """Edit an already-sent message.

    Note: This updates the message template/history row. User inbox pulls title/content
    from the message row, so edits will be reflected to users on next inbox fetch.
    """
    _ = admin_id
    msg = db.query(AdminMessage).filter(AdminMessage.id == message_id).first()
    if not msg:
        raise HTTPException(status_code=404, detail="MESSAGE_NOT_FOUND")

    data = payload.model_dump(exclude_unset=True)
    if "title" in data and data["title"] is not None:
        title = str(data["title"]).strip()
        if not title:
            raise HTTPException(status_code=400, detail="TITLE_REQUIRED")
        msg.title = title

    if "content" in data and data["content"] is not None:
        content = str(data["content"]).strip()
        if not content:
            raise HTTPException(status_code=400, detail="CONTENT_REQUIRED")
        msg.content = content

    db.add(msg)
    db.commit()
    db.refresh(msg)
    return msg


@router.delete("/messages/{message_id}")
def delete_message(
    message_id: int,
    db: Session = Depends(get_db),
    admin_id: int = Depends(get_current_admin_id),
):
    """Callback (Delete) an already-sent message for ALL users.
    
    Sets is_deleted=True, so it disappears from user inboxes.
    Admin history still shows it (with deleted status).
    """
    _ = admin_id
    msg = db.query(AdminMessage).filter(AdminMessage.id == message_id).first()
    if not msg:
        raise HTTPException(status_code=404, detail="MESSAGE_NOT_FOUND")

    msg.is_deleted = True
    db.commit()
    
    return {"status": "ok", "message_id": message_id}


# Helper for fan-out
def fan_out_message(
    message_id: int,
    target_type: str,
    target_value: Optional[str],
    resolved_user_ids: Optional[List[int]] = None,
    db: Session = None,
):
    # If db is provided (e.g. from test or existing session), use it.
    # Otherwise create a new one.
    local_db_created = False
    if db is None:
        db = SessionLocal()
        local_db_created = True
        
    try:
        # 1. Select Users
        target_user_ids: List[int] = []

        if target_type == "ALL":
            target_user_ids = db.execute(select(User.id)).scalars().all()

        elif target_type == "USER":
            if resolved_user_ids is not None:
                target_user_ids = resolved_user_ids
            elif target_value:
                identifiers = [v.strip() for v in target_value.split(",") if v.strip()]
                for identifier in identifiers:
                    target_user_ids.append(resolve_user_id_by_identifier(db, identifier))

        elif target_type == "SEGMENT":
            if target_value:
                # target_value should be something like "WHALE", "DORMANT", etc.
                target_user_ids = UserSegmentService.get_users_by_segment(db, target_value, limit=10000)

        elif target_type == "TAG":
            if target_value:
                tags = [t.strip() for t in target_value.split(",") if t.strip()]
                if tags:
                    tag_filters = [AdminUserProfile.tags.contains([tag]) for tag in tags]
                    target_user_ids = db.execute(
                        select(AdminUserProfile.user_id).where(
                            AdminUserProfile.tags.isnot(None),
                            or_(*tag_filters),
                        )
                    ).scalars().all()

        # 2. Insert Inbox
        inbox_items = []
        for uid in set(target_user_ids):
            inbox_items.append(AdminMessageInbox(
                user_id=uid,
                message_id=message_id
            ))

        if inbox_items:
            db.bulk_save_objects(inbox_items)
            # Update Stats
            msg = db.query(AdminMessage).filter(AdminMessage.id == message_id).first()
            if msg:
                msg.recipient_count = len(inbox_items)
            db.commit()

        # 3. Telegram Fan-out (if channel selected)
        msg_ref = db.query(AdminMessage).filter(AdminMessage.id == message_id).first()
        if msg_ref and "TELEGRAM" in (msg_ref.channels or []):
            from app.services.notification_service import NotificationService
            import asyncio
            
            notifier = NotificationService()
            user_tg_ids = db.execute(
                select(User.telegram_id).where(User.id.in_(target_user_ids), User.telegram_id.isnot(None))
            ).scalars().all()
            
            async def _send_batch():
                # Note: Simple serial send for now to respect TG limits
                for tid in set(user_tg_ids):
                    await notifier.send_telegram_message(
                        chat_id=int(tid),
                        text=f"<b>[공지] {msg_ref.title}</b>\n\n{msg_ref.content}"
                    )
            
            try:
                loop = asyncio.get_event_loop()
                if loop.is_running():
                    asyncio.create_task(_send_batch())
                else:
                    loop.run_until_complete(_send_batch())
            except Exception as e:
                import logging
                logging.getLogger(__name__).error(f"Telegram fan-out failed: {e}")

    finally:
        if local_db_created:
            db.close()
