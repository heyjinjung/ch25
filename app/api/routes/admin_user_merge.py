"""Admin API for merging duplicate user accounts."""

from datetime import datetime
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api import deps
from app.models.user import User

router = APIRouter(prefix="/api/admin/user", tags=["admin-user"])


class MergeRequest(BaseModel):
    source_user_id: int  # User to be merged (will be deactivated)
    target_user_id: int  # User to keep (will receive merged data)
    reason: str = "Admin merge"


class MergePreview(BaseModel):
    source_user: dict
    target_user: dict
    affected_tables: dict[str, int]  # Table name -> affected row count
    balance_changes: dict[str, dict]  # Balance type -> {source, target, merged}
    warnings: list[str]


class MergeResult(BaseModel):
    success: bool
    merged_at: datetime
    source_user_id: int
    target_user_id: int
    affected_rows: dict[str, int]
    audit_log_id: int | None = None


def _get_user_summary(user: User) -> dict:
    return {
        "id": user.id,
        "external_id": user.external_id,
        "nickname": user.nickname,
        "telegram_id": user.telegram_id,
        "level": user.level,
        "cash_balance": user.cash_balance or 0,
        "vault_locked_balance": user.vault_locked_balance or 0,
        "created_at": str(user.created_at) if user.created_at else None,
    }


def _count_related_rows(db: Session, user_id: int) -> dict[str, int]:
    """Count rows in related tables for a user."""
    from sqlalchemy import text
    
    tables = [
        ("user_game_wallet", "user_id"),
        ("user_game_wallet_ledger", "user_id"),
        ("user_cash_ledger", "user_id"),
        ("user_mission_progress", "user_id"),
        ("season_pass_progress", "user_id"),
        ("vault_withdrawal_request", "user_id"),
        ("external_ranking_data", "user_id"),
    ]
    
    counts = {}
    for table, column in tables:
        try:
            result = db.execute(text(f"SELECT COUNT(*) FROM {table} WHERE {column} = :uid"), {"uid": user_id})
            counts[table] = result.scalar() or 0
        except Exception:
            counts[table] = -1  # Table might not exist
    
    return counts


@router.post("/merge/dry-run", response_model=MergePreview)
def merge_dry_run(
    payload: MergeRequest,
    db: Session = Depends(deps.get_db),
    admin_id: int = Depends(deps.get_current_admin_id),
) -> MergePreview:
    """Preview the impact of merging two user accounts."""
    source = db.query(User).filter(User.id == payload.source_user_id).first()
    target = db.query(User).filter(User.id == payload.target_user_id).first()
    
    if not source:
        raise HTTPException(status_code=404, detail="SOURCE_USER_NOT_FOUND")
    if not target:
        raise HTTPException(status_code=404, detail="TARGET_USER_NOT_FOUND")
    if source.id == target.id:
        raise HTTPException(status_code=400, detail="CANNOT_MERGE_SAME_USER")
    
    warnings = []
    
    # Check for telegram_id conflicts
    if source.telegram_id and target.telegram_id:
        if source.telegram_id != target.telegram_id:
            warnings.append(f"TELEGRAM_ID_CONFLICT: source={source.telegram_id}, target={target.telegram_id}")
    
    # Count affected rows
    source_counts = _count_related_rows(db, source.id)
    target_counts = _count_related_rows(db, target.id)
    
    affected = {table: source_counts.get(table, 0) for table in source_counts}
    
    # Balance changes
    balance_changes = {
        "cash_balance": {
            "source": source.cash_balance or 0,
            "target": target.cash_balance or 0,
            "policy": "ADD_TO_TARGET",
        },
        "vault_locked_balance": {
            "source": source.vault_locked_balance or 0,
            "target": target.vault_locked_balance or 0,
            "policy": "ADD_TO_TARGET",
        },
    }
    
    return MergePreview(
        source_user=_get_user_summary(source),
        target_user=_get_user_summary(target),
        affected_tables=affected,
        balance_changes=balance_changes,
        warnings=warnings,
    )


@router.post("/merge/execute", response_model=MergeResult)
def merge_execute(
    payload: MergeRequest,
    db: Session = Depends(deps.get_db),
    admin_id: int = Depends(deps.get_current_admin_id),
) -> MergeResult:
    """Execute account merge. Source user will be deactivated."""
    from sqlalchemy import text
    
    source = db.query(User).filter(User.id == payload.source_user_id).with_for_update().first()
    target = db.query(User).filter(User.id == payload.target_user_id).with_for_update().first()
    
    if not source:
        raise HTTPException(status_code=404, detail="SOURCE_USER_NOT_FOUND")
    if not target:
        raise HTTPException(status_code=404, detail="TARGET_USER_NOT_FOUND")
    if source.id == target.id:
        raise HTTPException(status_code=400, detail="CANNOT_MERGE_SAME_USER")
    
    now = datetime.utcnow()
    affected = {}
    
    # 1. Transfer balances
    target.cash_balance = (target.cash_balance or 0) + (source.cash_balance or 0)
    target.vault_locked_balance = (target.vault_locked_balance or 0) + (source.vault_locked_balance or 0)
    source.cash_balance = 0
    source.vault_locked_balance = 0
    
    # 2. Transfer telegram_id if target doesn't have one
    if not target.telegram_id and source.telegram_id:
        target.telegram_id = source.telegram_id
        target.telegram_username = source.telegram_username
        source.telegram_id = None
        source.telegram_username = None
    
    # 3. Reassign foreign key references
    tables_to_update = [
        ("user_game_wallet", "user_id"),
        ("user_game_wallet_ledger", "user_id"),
        ("user_cash_ledger", "user_id"),
        ("user_mission_progress", "user_id"),
        ("season_pass_progress", "user_id"),
        ("vault_withdrawal_request", "user_id"),
    ]
    
    for table, column in tables_to_update:
        try:
            result = db.execute(
                text(f"UPDATE {table} SET {column} = :target WHERE {column} = :source"),
                {"target": target.id, "source": source.id}
            )
            affected[table] = result.rowcount
        except Exception as e:
            affected[table] = f"ERROR: {str(e)}"
    
    # 4. Mark source user as merged
    source.status = "MERGED"
    source.nickname = f"[MERGED>{target.id}] {source.nickname}"
    
    try:
        db.commit()
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"MERGE_FAILED: {str(exc)}")
    
    return MergeResult(
        success=True,
        merged_at=now,
        source_user_id=source.id,
        target_user_id=target.id,
        affected_rows=affected,
    )
