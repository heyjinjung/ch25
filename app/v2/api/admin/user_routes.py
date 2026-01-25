from datetime import datetime
import logging
from typing import List, Optional

from fastapi import APIRouter, Body, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session, selectinload

from app.api.deps import get_current_admin_info, get_db
from app.models.admin_audit_log import AdminAuditLog
from app.models.game_wallet import GameTokenType
from app.models.game_wallet import UserGameWallet
from app.models.inventory import UserInventoryItem
from app.models.mission import ApprovalStatus, Mission, UserMissionProgress
from app.models.user import User
from app.models.user_retention_state import UserRetentionState
from app.models.user_segment import UserSegment
from app.models.level_xp import UserLevelProgress, UserXpEventLog
from app.v2.services import V2AdminAuditService, V2AdminInventoryService, V2AdminUserService
from app.core.exceptions import NotEnoughTokensError
from app.v2.schemas.v2_admin_user import (
    AdminUserCreate,
    AdminUserDetailDto,
    AdminUserListDto,
    AdminWalletAdjustmentRequest,
    CreateUserNoteRequest,
    InterventionActionDto,
    InterventionExecutionResponse,
    InterventionPlaybookDto,
    TicketLogDto,
    UserMissionProgressUpdateRequest,
    UserMissionRewardClaimResponse,
    UserActivityLogDto,
    UserInventoryItemDto,
    UserListResponse,
    UserMissionHistoryDto,
    UserNoteDto,
    AdminUserLevelSnapshotDto,
    AdminUserLevelAdjustRequest,
    AdminUserLevelSetRequest,
)
from app.v2.services.vault_service import V2VaultService
from app.v2.services.mission_service import V2MissionService
from app.v2.models.v2_level_reward import V2LevelRewardTable

router = APIRouter()
logger = logging.getLogger("uvicorn.error")


def _get_level_rows(db: Session) -> list[V2LevelRewardTable]:
    return (
        db.query(V2LevelRewardTable)
        .order_by(V2LevelRewardTable.required_xp.asc())
        .all()
    )


def _resolve_level_by_xp(level_rows: list[V2LevelRewardTable], xp: int) -> int:
    if not level_rows:
        return 1
    current = 1
    for row in level_rows:
        if xp >= int(row.required_xp or 0):
            current = int(row.level)
    return max(current, 1)


def _resolve_next_level(level_rows: list[V2LevelRewardTable], xp: int) -> tuple[int | None, int | None]:
    for row in level_rows:
        if xp < int(row.required_xp or 0):
            return int(row.level), int(row.required_xp or 0)
    return None, None


def _get_or_create_level_progress(db: Session, user_id: int) -> UserLevelProgress:
    progress = db.get(UserLevelProgress, user_id)
    if progress:
        return progress
    progress = UserLevelProgress(user_id=user_id, level=1, xp=0)
    db.add(progress)
    db.flush()
    return progress


@router.get("/users", response_model=UserListResponse)
def get_admin_users_list(
    search: str = None,
    status: str = None,
    minLevel: int = None,
    maxLevel: int = None,
    sortBy: str = "last_active",
    sortOrder: str = "desc",
    page: int = 1,
    limit: int = 20,
    db: Session = Depends(get_db),
    admin_info: tuple[int, str] = Depends(get_current_admin_info),
):
    admin_id, admin_role = admin_info

    query = db.query(User)

    if search:
        search_pattern = f"%{search}%"
        filters = (
            (User.nickname.ilike(search_pattern))
            | (User.telegram_username.ilike(search_pattern))
            | (User.external_id.ilike(search_pattern))
        )
        if search.isdigit():
            numeric = int(search)
            filters = filters | (User.id == numeric) | (User.telegram_id == numeric)
        query = query.filter(filters)

    if status:
        query = query.filter(User.status == status)

    if minLevel is not None:
        query = query.filter(User.level >= minLevel)
    if maxLevel is not None:
        query = query.filter(User.level <= maxLevel)

    if sortBy == "level":
        order_col = User.level
    elif sortBy == "vault_balance":
        order_col = func.coalesce(User.vault_available_balance, 0) + func.coalesce(
            User.vault_locked_balance, 0
        )
    elif sortBy == "created_at":
        order_col = User.created_at
    else:
        order_col = User.updated_at

    if sortOrder == "asc":
        query = query.order_by(order_col.asc())
    else:
        query = query.order_by(order_col.desc())

    total = query.count()
    offset = (page - 1) * limit
    users = query.offset(offset).limit(limit).all()

    if search:
        logger.warning(
            "admin.users.search term=%s total=%s page=%s limit=%s",
            search,
            total,
            page,
            limit,
        )

    user_list = []
    for user in users:
        vault_balance = int(user.vault_available_balance or 0) + int(user.vault_locked_balance or 0)

        tier = "COMMON"
        if user.total_charge_amount:
            if user.total_charge_amount >= 10000000:
                tier = "VVIP"
            elif user.total_charge_amount >= 5000000:
                tier = "VIP"

        status_str = "Active" if user.status == "ACTIVE" else "Inactive" if user.status == "INACTIVE" else "Suspended"
        last_active = user.updated_at.strftime("%Y-%m-%d %H:%M") if user.updated_at else "-"

        user_list.append(
            AdminUserListDto(
                id=user.id,
                cc_id=user.id,
                nickname=user.nickname or "(미설정)",
                telegram_id=user.telegram_id,
                telegram_username=user.telegram_username,
                tier=tier,
                level=user.level or 1,
                vaultBalance=vault_balance,
                last_active=last_active,
                status=status_str,
            )
        )

    total_pages = (total + limit - 1) // limit

    return UserListResponse(
        users=user_list,
        total=total,
        page=page,
        limit=limit,
        totalPages=total_pages,
    )


@router.post("/users", response_model=AdminUserListDto, status_code=201)
def create_admin_user(
    payload: AdminUserCreate,
    db: Session = Depends(get_db),
    admin_info: tuple[int, str] = Depends(get_current_admin_info),
):
    admin_id, admin_role = admin_info

    user = V2AdminUserService.create_user(db, payload)

    vault_balance = int(user.vault_available_balance or 0) + int(user.vault_locked_balance or 0)
    total_charge = int(getattr(user, "total_charge_amount", 0) or 0)
    tier = "COMMON"
    if total_charge >= 10000000:
        tier = "VVIP"
    elif total_charge >= 5000000:
        tier = "VIP"

    status_str = "Active" if user.status == "ACTIVE" else "Inactive" if user.status == "INACTIVE" else "Suspended"
    last_active = user.updated_at.strftime("%Y-%m-%d %H:%M") if user.updated_at else "-"

    V2AdminAuditService.log(
        db,
        admin_id,
        "USER_CREATE",
        "USER",
        str(user.id),
        before={},
        after={"external_id": user.external_id, "nickname": user.nickname},
    )

    return AdminUserListDto(
        id=user.id,
        cc_id=user.id,
        nickname=user.nickname or "(미설정)",
        telegram_id=user.telegram_id,
        telegram_username=user.telegram_username,
        tier=tier,
        level=user.level or 1,
        vaultBalance=vault_balance,
        last_active=last_active,
        status=status_str,
    )


@router.get("/users/level", response_model=AdminUserLevelSnapshotDto)
def get_admin_user_level_by_cc_id(
    cc_id: str,
    db: Session = Depends(get_db),
    admin_info: tuple[int, str] = Depends(get_current_admin_info),
):
    _admin_id, _admin_role = admin_info
    user = db.query(User).filter(User.external_id == cc_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="USER_NOT_FOUND")

    progress = _get_or_create_level_progress(db, user.id)
    level_rows = _get_level_rows(db)
    next_level, next_required_xp = _resolve_next_level(level_rows, int(progress.xp or 0))

    return AdminUserLevelSnapshotDto(
        userId=user.id,
        ccId=str(user.external_id),
        level=int(progress.level or 1),
        xp=int(progress.xp or 0),
        nextLevel=next_level,
        nextRequiredXp=next_required_xp,
        updatedAt=progress.updated_at,
    )


@router.post("/users/level/adjust", response_model=AdminUserLevelSnapshotDto)
def adjust_admin_user_level_xp(
    payload: AdminUserLevelAdjustRequest,
    db: Session = Depends(get_db),
    admin_info: tuple[int, str] = Depends(get_current_admin_info),
):
    admin_id, _admin_role = admin_info
    user = db.query(User).filter(User.external_id == payload.ccId).first()
    if not user:
        raise HTTPException(status_code=404, detail="USER_NOT_FOUND")
    if payload.deltaXp == 0:
        raise HTTPException(status_code=400, detail="DELTA_XP_REQUIRED")

    progress = _get_or_create_level_progress(db, user.id)
    progress.xp = int(progress.xp or 0) + int(payload.deltaXp)
    if progress.xp < 0:
        progress.xp = 0

    level_rows = _get_level_rows(db)
    progress.level = _resolve_level_by_xp(level_rows, int(progress.xp or 0))
    user.level = int(progress.level or 1)

    db.add(
        UserXpEventLog(
            user_id=user.id,
            source="ADMIN_ADJUST",
            delta=int(payload.deltaXp),
            meta={"reason": payload.reason, "policy": "NO_REWARD"},
        )
    )

    V2AdminAuditService.log(
        db,
        admin_id,
        "USER_LEVEL_XP_ADJUST",
        "USER_LEVEL",
        str(user.id),
        before={"xp": int(progress.xp or 0) - int(payload.deltaXp)},
        after={"xp": int(progress.xp or 0), "level": int(progress.level or 1)},
    )

    db.commit()
    db.refresh(progress)

    next_level, next_required_xp = _resolve_next_level(level_rows, int(progress.xp or 0))
    return AdminUserLevelSnapshotDto(
        userId=user.id,
        ccId=str(user.external_id),
        level=int(progress.level or 1),
        xp=int(progress.xp or 0),
        nextLevel=next_level,
        nextRequiredXp=next_required_xp,
        updatedAt=progress.updated_at,
    )


@router.post("/users/level/set", response_model=AdminUserLevelSnapshotDto)
def set_admin_user_level(
    payload: AdminUserLevelSetRequest,
    db: Session = Depends(get_db),
    admin_info: tuple[int, str] = Depends(get_current_admin_info),
):
    admin_id, _admin_role = admin_info
    user = db.query(User).filter(User.external_id == payload.ccId).first()
    if not user:
        raise HTTPException(status_code=404, detail="USER_NOT_FOUND")
    if payload.level is None and payload.xp is None:
        raise HTTPException(status_code=400, detail="LEVEL_OR_XP_REQUIRED")

    progress = _get_or_create_level_progress(db, user.id)
    before_xp = int(progress.xp or 0)
    before_level = int(progress.level or 1)

    if payload.xp is not None:
        progress.xp = int(payload.xp)
    if payload.level is not None:
        progress.level = int(payload.level)
    elif payload.xp is not None:
        level_rows = _get_level_rows(db)
        progress.level = _resolve_level_by_xp(level_rows, int(progress.xp or 0))

    user.level = int(progress.level or 1)

    V2AdminAuditService.log(
        db,
        admin_id,
        "USER_LEVEL_SET",
        "USER_LEVEL",
        str(user.id),
        before={"level": before_level, "xp": before_xp},
        after={"level": int(progress.level or 1), "xp": int(progress.xp or 0)},
    )

    db.commit()
    db.refresh(progress)

    level_rows = _get_level_rows(db)
    next_level, next_required_xp = _resolve_next_level(level_rows, int(progress.xp or 0))
    return AdminUserLevelSnapshotDto(
        userId=user.id,
        ccId=str(user.external_id),
        level=int(progress.level or 1),
        xp=int(progress.xp or 0),
        nextLevel=next_level,
        nextRequiredXp=next_required_xp,
        updatedAt=progress.updated_at,
    )


@router.get("/users/{user_id}", response_model=AdminUserDetailDto)
def get_admin_user_detail(
    user_id: int,
    db: Session = Depends(get_db),
    admin_info: tuple[int, str] = Depends(get_current_admin_info),
):
    admin_id, admin_role = admin_info
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="USER_NOT_FOUND")

    ticket_balance = 0
    wallets = db.query(UserGameWallet).filter(UserGameWallet.user_id == user_id).all()
    for w in wallets:
        try:
            token_name = w.token_type.name if hasattr(w.token_type, "name") else str(w.token_type)
            if "TICKET" in token_name or "COIN" in token_name:
                ticket_balance += int(w.balance or 0)
        except Exception:
            continue

    vault_balance = int(user.vault_locked_balance or 0) + int(user.vault_available_balance or 0)
    current_assets = vault_balance

    retention = db.query(UserRetentionState).filter(UserRetentionState.user_id == user_id).first()
    risk_level = "LOW"
    risk_reason = None

    if retention:
        if retention.churn_probability_score > 0.8:
            risk_level = "HIGH"
            risk_reason = "High Churn Probability"
        elif retention.churn_probability_score > 0.5:
            risk_level = "MEDIUM"

    total_charge = int(user.total_charge_amount or 0)
    if total_charge > 10000000:
        risk_level = "HIGH"
        risk_reason = "High Value Account"

    suggested_actions = []
    if risk_level == "HIGH":
        suggested_actions = [
            InterventionActionDto(
                action_id="BAILOUT_GIFT",
                label="긴급 구호 자금 지급",
                type="REWARD",
                description="파산 위험 유저에게 소액의 티켓 지급 (Retention)",
            ),
            InterventionActionDto(
                action_id="SEND_CRM_PULSE",
                label="CRM 펄스 전송",
                type="MESSAGE",
                description="이탈 방지용 개인화 메시지 전송",
            ),
        ]
    elif risk_level == "MEDIUM":
        suggested_actions = [
            InterventionActionDto(
                action_id="MONITOR_CLOSELY",
                label="밀착 모니터링 지정",
                type="SYSTEM",
                description="해당 유저의 다음 게임 결과 실시간 알림 활성화",
            )
        ]

    playbook = InterventionPlaybookDto(riskLevel=risk_level, suggestedActions=suggested_actions)

    return AdminUserDetailDto(
        id=user.id,
        nickname=user.nickname or "(미설정)",
        telegramId=user.telegram_id,
        createdAt=user.created_at,
        totalDeposit=total_charge,
        currentAssets=current_assets,
        vaultBalance=vault_balance,
        ticketBalance=ticket_balance,
        level=int(user.level or 1),
        vipLevel="VIP" if total_charge > 5000000 else "COMMON",
        isActive=(user.status == "ACTIVE"),
        riskLevel=risk_level,
        riskReason=risk_reason,
        playbook=playbook if suggested_actions else None,
    )


@router.post("/users/{user_id}/intervention/{action_id}", response_model=InterventionExecutionResponse)
def execute_intervention_action(
    user_id: int,
    action_id: str,
    db: Session = Depends(get_db),
    admin_info: tuple[int, str] = Depends(get_current_admin_info),
):
    admin_id, admin_role = admin_info
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="USER_NOT_FOUND")

    if action_id == "BAILOUT_GIFT":
        V2VaultService.deposit(db, user_id, 1000)
        db.commit()

        V2AdminAuditService.log(
            db,
            admin_id,
            "EXECUTE_INTERVENTION",
            "USER",
            str(user_id),
            before={"risk_level": user.retention_state.risk_level if user.retention_state else "UNKNOWN"},
            after={"action": action_id, "result": "1000 points granted"},
        )

        return InterventionExecutionResponse(
            success=True, action_id=action_id, message="Bailout points (1000) granted successfully."
        )

    if action_id == "SEND_CRM_PULSE":
        return InterventionExecutionResponse(
            success=True, action_id=action_id, message="CRM Pulse scheduled for delivery."
        )

    raise HTTPException(status_code=400, detail="INVALID_ACTION_ID")


@router.post("/users/{user_id}/wallet/adjust", response_model=InterventionExecutionResponse)
def adjust_user_wallet(
    user_id: int,
    payload: AdminWalletAdjustmentRequest,
    db: Session = Depends(get_db),
    admin_info: tuple[int, str] = Depends(get_current_admin_info),
):
    admin_id, admin_role = admin_info

    if payload.amount == 0:
        raise HTTPException(status_code=400, detail="INVALID_AMOUNT")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="USER_NOT_FOUND")

    if payload.token_type == "VAULT":
        try:
            if payload.amount > 0:
                V2VaultService.deposit(db, user_id, payload.amount)
            else:
                V2VaultService.withdraw(db, user_id, abs(payload.amount))
        except ValueError as e:
            msg = str(e).lower()
            if "insufficient" in msg:
                raise HTTPException(status_code=400, detail="INSUFFICIENT_VAULT_BALANCE")
            raise HTTPException(status_code=400, detail="INVALID_VAULT_ADJUST")
    else:
        try:
            token_enum = GameTokenType(payload.token_type)
        except Exception:
            raise HTTPException(status_code=400, detail="INVALID_TOKEN_TYPE")
        try:
            if payload.amount > 0:
                V2AdminInventoryService.grant_tokens(
                    db,
                    user_id=user_id,
                    token_type=token_enum,
                    amount=payload.amount,
                    reason=payload.reason,
                    label=f"ADMIN:{admin_id}",
                )
            else:
                V2AdminInventoryService.revoke_tokens(
                    db,
                    user_id=user_id,
                    token_type=token_enum,
                    amount=abs(payload.amount),
                    reason=payload.reason,
                    label=f"ADMIN:{admin_id}",
                )
        except NotEnoughTokensError:
            raise HTTPException(status_code=400, detail="INSUFFICIENT_TOKEN_BALANCE")

    db.commit()

    V2AdminAuditService.log(
        db,
        admin_id,
        "WALLET_ADJUST",
        "USER",
        str(user_id),
        before={"token_type": payload.token_type, "amount_change": payload.amount},
        after={"reason": payload.reason},
    )

    return InterventionExecutionResponse(
        success=True,
        action_id="WALLET_ADJUST",
        message=f"Wallet adjusted: {payload.amount} ({payload.token_type})",
    )


@router.get("/users/{user_id}/activity-logs", response_model=List[UserActivityLogDto])
def get_user_activity_logs(
    user_id: int,
    db: Session = Depends(get_db),
    admin_info: tuple[int, str] = Depends(get_current_admin_info),
):
    logs = (
        db.query(AdminAuditLog)
        .filter(AdminAuditLog.target_id == str(user_id), AdminAuditLog.target_type == "USER")
        .order_by(AdminAuditLog.created_at.desc())
        .limit(20)
        .all()
    )

    return [
        UserActivityLogDto(
            id=log.id,
            userId=user_id,
            type="ADMIN_ACTION",
            description=f"{log.action} by Admin #{log.admin_id}",
            metadata={
                "before": log.before_json or {},
                "after": log.after_json or {},
            },
            timestamp=log.created_at,
        )
        for log in logs
    ]


@router.get("/users/{user_id}/inventory", response_model=List[UserInventoryItemDto])
def get_user_inventory(
    user_id: int,
    db: Session = Depends(get_db),
    admin_info: tuple[int, str] = Depends(get_current_admin_info),
):
    # Hide items with 0 quantity (USED or consumed)
    items = db.query(UserInventoryItem).filter(
        UserInventoryItem.user_id == user_id,
        UserInventoryItem.quantity > 0
    ).all()
    
    return [
        UserInventoryItemDto(
            id=item.id,
            itemType=item.item_type,
            itemName=item.item_type,
            quantity=item.quantity,
            expiresAt=None, # Todo: Expire logic
            status="ACTIVE",
        )
        for item in items
    ]


@router.post("/users/{user_id}/inventory/adjust")
def adjust_user_inventory(
    user_id: int,
    payload: dict = Body(...),
    db: Session = Depends(get_db),
    admin_info: tuple[int, str] = Depends(get_current_admin_info),
):
    admin_id, _ = admin_info
    item_type = payload.get("itemType") or payload.get("item_type")
    delta = payload.get("delta")
    note = payload.get("note")

    if not isinstance(item_type, str) or not item_type.strip():
        raise HTTPException(status_code=400, detail="MISSING_ITEM_TYPE")
    if not isinstance(delta, int) or delta == 0:
        raise HTTPException(status_code=400, detail="INVALID_DELTA")
    if note is not None and not isinstance(note, str):
        raise HTTPException(status_code=400, detail="INVALID_NOTE")

    clean_item_type = item_type.strip()
    clean_note = (note or "").strip()
    reason = "ADMIN_ADJUST" if not clean_note else f"ADMIN_ADJUST:{clean_note[:70]}"
    related_id = f"admin:{admin_id}"

    # 1. Block Vault adjustments here (handled in wallet adjust)
    if clean_item_type == "VAULT":
        raise HTTPException(status_code=400, detail="INVALID_ITEM_TYPE")

    # 2. Block GameWallet tokens here (handled in wallet adjust)
    if clean_item_type in GameTokenType.__members__:
        raise HTTPException(status_code=400, detail="INVALID_INVENTORY_ITEM")

    allowed_inventory_types = {
        "CHICKEN_GIFTICON_5000",
        "CHICKEN_GIFTICON_10000",
        "STARBUCKS_GIFTICON_2000",
        "STARBUCKS_GIFTICON_10000",
        "PIZZA_GIFTICON_5000",
        "PIZZA_GIFTICON_10000",
        "GOOGLE_GIFTICON_5000",
        "GOOGLE_GIFTICON_10000",
    }
    if clean_item_type not in allowed_inventory_types:
        raise HTTPException(status_code=400, detail="INVALID_INVENTORY_ITEM")

    # 3. Handle Regular Inventory Items (Gifticons, etc.)
    before_item = db.query(UserInventoryItem).filter(
        UserInventoryItem.user_id == user_id,
        UserInventoryItem.item_type == clean_item_type,
    ).first()
    before_qty = int(getattr(before_item, "quantity", 0) or 0)

    if delta > 0:
        item = V2AdminInventoryService.grant_item(
            db,
            user_id=user_id,
            item_type=clean_item_type,
            amount=delta,
            reason=reason,
            related_id=related_id,
            auto_commit=False,
        )
    else:
        # Check balance
        if before_qty < abs(delta):
             raise HTTPException(status_code=400, detail="INSUFFICIENT_INVENTORY_BALANCE")
             
        item = V2AdminInventoryService.consume_item(
            db,
            user_id=user_id,
            item_type=clean_item_type,
            amount=abs(delta),
            reason=reason,
            related_id=related_id,
            auto_commit=False,
        )

    V2AdminAuditService.log(
        db,
        admin_id,
        "INVENTORY_ADMIN_ADJUST",
        "USER",
        str(user_id),
        before={"item_type": clean_item_type, "quantity": before_qty},
        after={
            "item_type": item.item_type,
            "delta": int(delta),
            "quantity": int(item.quantity),
            "reason": reason,
            "note": clean_note,
            "related_id": related_id,
        },
    )

    db.commit()
    db.refresh(item)

    return {
        "success": True,
        "user_id": user_id,
        "item_type": item.item_type,
        "quantity": int(item.quantity),
    }


@router.get("/users/{user_id}/notes", response_model=List[UserNoteDto])
def get_user_notes(
    user_id: int,
    db: Session = Depends(get_db),
    admin_info: tuple[int, str] = Depends(get_current_admin_info),
):
    notes = (
        db.query(AdminAuditLog)
        .filter(AdminAuditLog.target_id == str(user_id), AdminAuditLog.action == "USER_NOTE")
        .order_by(AdminAuditLog.created_at.desc())
        .all()
    )

    return [
        UserNoteDto(
            id=note.id,
            userId=user_id,
            adminId=str(note.admin_id),
            adminNickname=f"Admin #{note.admin_id}",
            content=note.after_json.get("content", "") if note.after_json else "",
            createdAt=note.created_at,
        )
        for note in notes
    ]


@router.post("/users/notes")
def create_user_note(
    payload: CreateUserNoteRequest,
    db: Session = Depends(get_db),
    admin_info: tuple[int, str] = Depends(get_current_admin_info),
):
    admin_id, _ = admin_info

    V2AdminAuditService.log(
        db,
        admin_id,
        "USER_NOTE",
        "USER",
        str(payload.userId),
        before=None,
        after={"content": payload.content},
    )
    return {"success": True}


@router.get("/users/{user_id}/missions", response_model=List[UserMissionHistoryDto])
def get_user_missions(
    user_id: int,
    db: Session = Depends(get_db),
    admin_info: tuple[int, str] = Depends(get_current_admin_info),
):
    progress = (
        db.query(UserMissionProgress)
        .options(selectinload(UserMissionProgress.mission))
        .filter(UserMissionProgress.user_id == user_id)
        .limit(50)
        .all()
    )

    return [
        UserMissionHistoryDto(
            id=p.id,
            missionId=p.mission_id,
            missionTitle=p.mission.title if p.mission else "Unknown Mission",
            category=p.mission.category if p.mission else "DAILY",
            status="COMPLETED" if p.is_completed else "IN_PROGRESS",
            progress=p.current_value,
            maxProgress=p.mission.target_value if p.mission else 1,
            completedAt=p.completed_at,
            updatedAt=p.updated_at if hasattr(p, "updated_at") else p.created_at,
            rewardClaimed=p.is_claimed,
        )
        for p in progress
    ]


def _get_or_create_user_mission_progress(
    db: Session,
    *,
    user_id: int,
    mission_id: int,
) -> tuple[Mission, UserMissionProgress]:
    mission = db.query(Mission).filter(Mission.id == mission_id).first()
    if not mission:
        raise HTTPException(status_code=404, detail="MISSION_NOT_FOUND")

    service = V2MissionService(db)
    reset_date = service._get_reset_date_str(mission.category)

    progress = (
        db.query(UserMissionProgress)
        .filter(
            UserMissionProgress.user_id == user_id,
            UserMissionProgress.mission_id == mission_id,
            UserMissionProgress.reset_date == reset_date,
        )
        .first()
    )

    if not progress:
        progress = UserMissionProgress(
            user_id=user_id,
            mission_id=mission_id,
            reset_date=reset_date,
            current_value=0,
        )
        db.add(progress)
        db.flush()

    return mission, progress


@router.post("/users/{user_id}/missions/{mission_id}/complete")
def force_complete_mission(
    user_id: int,
    mission_id: int,
    db: Session = Depends(get_db),
    admin_info: tuple[int, str] = Depends(get_current_admin_info),
):
    admin_id, _ = admin_info

    mission, progress = _get_or_create_user_mission_progress(
        db, user_id=user_id, mission_id=mission_id
    )

    progress.is_completed = True
    progress.current_value = int(mission.target_value or 1)
    progress.completed_at = datetime.utcnow()
    db.commit()

    return {"success": True}


@router.post("/users/{user_id}/missions/{mission_id}/progress")
def update_user_mission_progress(
    user_id: int,
    mission_id: int,
    payload: UserMissionProgressUpdateRequest,
    db: Session = Depends(get_db),
    admin_info: tuple[int, str] = Depends(get_current_admin_info),
):
    admin_id, _ = admin_info

    mission, progress = _get_or_create_user_mission_progress(
        db, user_id=user_id, mission_id=mission_id
    )

    target_value = int(mission.target_value or 0)
    next_value = max(0, int(payload.currentValue))
    if target_value > 0 and next_value >= target_value:
        next_value = target_value
        progress.is_completed = True
        progress.completed_at = datetime.utcnow()
    else:
        progress.is_completed = False
        progress.is_claimed = False
        progress.approval_status = ApprovalStatus.NONE
        progress.completed_at = None

    progress.current_value = next_value
    db.commit()

    return {"success": True}


@router.post("/users/{user_id}/missions/{mission_id}/reset")
def reset_user_mission_progress(
    user_id: int,
    mission_id: int,
    db: Session = Depends(get_db),
    admin_info: tuple[int, str] = Depends(get_current_admin_info),
):
    admin_id, _ = admin_info

    _, progress = _get_or_create_user_mission_progress(
        db, user_id=user_id, mission_id=mission_id
    )

    progress.current_value = 0
    progress.is_completed = False
    progress.is_claimed = False
    progress.approval_status = ApprovalStatus.NONE
    progress.completed_at = None
    db.commit()

    return {"success": True}


@router.post("/users/{user_id}/missions/{mission_id}/claim", response_model=UserMissionRewardClaimResponse)
def claim_user_mission_reward(
    user_id: int,
    mission_id: int,
    db: Session = Depends(get_db),
    admin_info: tuple[int, str] = Depends(get_current_admin_info),
):
    admin_id, _ = admin_info

    service = V2MissionService(db)
    success, reward_type, reward_amount = service.claim_reward(user_id, mission_id)

    if success:
        return UserMissionRewardClaimResponse(
            success=True,
            message="OK",
            rewardType=reward_type,
            rewardAmount=reward_amount,
        )

    return UserMissionRewardClaimResponse(
        success=False,
        message=reward_type,
        rewardType=None,
        rewardAmount=None,
    )


@router.get("/users/{user_id}/segment")
def get_user_segment_info(
    user_id: int,
    db: Session = Depends(get_db),
    admin_info: tuple[int, str] = Depends(get_current_admin_info),
):
    seg = db.query(UserSegment).filter(UserSegment.user_id == user_id).first()
    if seg:
        return {"segment": seg.segment, "label": seg.segment}
    return {"segment": "UNKNOWN", "label": "미분류"}
