"""Vault APIs (status + free fill once)."""

from datetime import datetime

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_current_user_id
from app.models.game_wallet import GameTokenType, UserGameWallet
from app.schemas.vault2 import VaultProgramResponse, VaultTopItem
from app.schemas.vault import VaultFillResponse, VaultStatusResponse
from app.services.vault2_service import Vault2Service
from app.services.vault_service import VaultService

from pydantic import BaseModel

router = APIRouter(prefix="/api/vault", tags=["vault"])
service = VaultService()
v2_service = Vault2Service()


def _deep_merge_dict(base: dict, override: dict) -> dict:
    out = dict(base)
    for key, value in override.items():
        if isinstance(value, dict) and isinstance(out.get(key), dict):
            out[key] = _deep_merge_dict(out[key], value)
        else:
            out[key] = value
    return out


@router.get("/status", response_model=VaultStatusResponse)
def status(db: Session = Depends(get_db), user_id: int = Depends(get_current_user_id)) -> VaultStatusResponse:
    now = datetime.utcnow()
    eligible, user, seeded = service.get_status(db=db, user_id=user_id, now=now)

    recommended_action = None
    cta_payload = None
    locked_balance = int(getattr(user, "vault_locked_balance", 0) or 0)
    expires_at = getattr(user, "vault_locked_expires_at", None)
    locked_unexpired = locked_balance > 0 and (expires_at is None or expires_at > now)

    ticket_token_types = (GameTokenType.DICE_TOKEN, GameTokenType.ROULETTE_COIN, GameTokenType.LOTTERY_TICKET)
    wallet_rows = (
        db.query(UserGameWallet)
        .filter(UserGameWallet.user_id == user_id, UserGameWallet.token_type.in_(ticket_token_types))
        .all()
    )
    balances = {row.token_type: int(row.balance or 0) for row in wallet_rows}
    total_tickets = sum(balances.values())

    if eligible and locked_unexpired:
        ticket_zero = all(balances.get(token_type, 0) <= 0 for token_type in ticket_token_types)
        if ticket_zero:
            recommended_action = "OPEN_VAULT_MODAL"
            cta_payload = {
                "reason": "TICKET_ZERO",
            }

    unlock_rules_json = None
    if eligible:
        computed = service.phase1_unlock_rules_json(now=now)
        program = v2_service.get_default_program(db, ensure=True)
        override = getattr(program, "unlock_rules_json", None)
        if isinstance(override, dict) and override:
            unlock_rules_json = _deep_merge_dict(computed, override)
        else:
            unlock_rules_json = computed

    ui_copy_json = None
    if eligible:
        hardcoded_ui_copy = {
            "title": "내 금고",
            "desc": "적립된 보관금은 특정 조건 달성 시 즉시 출금 가능한 캐시로 해금됩니다.",
        }
        program = v2_service.get_default_program(db, ensure=True)
        override = getattr(program, "ui_copy_json", None)
        if isinstance(override, dict) and override:
            ui_copy_json = _deep_merge_dict(hardcoded_ui_copy, override)
        else:
            ui_copy_json = hardcoded_ui_copy

    return VaultStatusResponse(
        eligible=eligible,
        vault_balance=user.vault_balance or 0,
        locked_balance=locked_balance,
        available_balance=int(getattr(user, "vault_available_balance", 0) or 0),
        cash_balance=user.cash_balance or 0,
        ticket_count=total_tickets,
        vault_fill_used_at=user.vault_fill_used_at,
        seeded=seeded,
        expires_at=expires_at,
        recommended_action=recommended_action,
        cta_payload=cta_payload,
        program_key=service.PROGRAM_KEY,
        unlock_rules_json=unlock_rules_json,
        accrual_multiplier=service.vault_accrual_multiplier(db, now) if eligible else 1.0,
        ui_copy_json=ui_copy_json,
        total_charge_amount=int(getattr(user, "total_charge_amount", 0) or 0),
    )


@router.post("/fill", response_model=VaultFillResponse)
def fill(db: Session = Depends(get_db), user_id: int = Depends(get_current_user_id)) -> VaultFillResponse:
    eligible, user, delta, used_at = service.fill_free_once(db=db, user_id=user_id)
    return VaultFillResponse(
        eligible=eligible,
        delta=delta,
        vault_balance_after=user.vault_balance or 0,
        vault_fill_used_at=used_at,
    )


@router.get("/programs", response_model=list[VaultProgramResponse])
def list_programs(db: Session = Depends(get_db)) -> list[VaultProgramResponse]:
    programs = v2_service.list_programs(db)
    return [
        VaultProgramResponse(
            key=p.key,
            name=p.name,
            duration_hours=int(p.duration_hours),
            expire_policy=getattr(p, "expire_policy", None),
            is_active=bool(getattr(p, "is_active", True)),
            unlock_rules_json=getattr(p, "unlock_rules_json", None),
            ui_copy_json=getattr(p, "ui_copy_json", None),
        )
        for p in programs
    ]


@router.get("/top", response_model=list[VaultTopItem])
def top(db: Session = Depends(get_db)) -> list[VaultTopItem]:
    rows = v2_service.top_statuses(db)
    return [
        VaultTopItem(
            user_id=status.user_id,
            program_key=program.key,
            state=status.state,
            locked_amount=int(status.locked_amount or 0),
            available_amount=int(getattr(status, "available_amount", 0) or 0),
            expires_at=status.expires_at,
            progress_json=getattr(status, "progress_json", None),
        )
        for status, program in rows
    ]


class VaultRequestSchema(BaseModel):
    id: int
    user_id: int
    amount: int
    status: str
    created_at: datetime
    processed_at: datetime | None = None
    admin_memo: str | None = None

    class Config:
        from_attributes = True

@router.get("/admin/requests", response_model=list[VaultRequestSchema])
def list_withdrawal_requests(
    status: str = "PENDING",
    db: Session = Depends(get_db),
    # admin auth omitted for MVP
):
    from app.models.vault_withdrawal_request import VaultWithdrawalRequest
    rows = (
        db.query(VaultWithdrawalRequest)
        .filter(VaultWithdrawalRequest.status == status)
        .order_by(VaultWithdrawalRequest.created_at.desc())
        .all()
    )
    return rows


class WithdrawRequestPayload(BaseModel):
    amount: int

class WithdrawResponse(BaseModel):
    request_id: int
    status: str
    amount: int
    balance_after: int


@router.post("/withdraw", response_model=WithdrawResponse)
def request_withdraw(
    payload: WithdrawRequestPayload,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id)
) -> WithdrawResponse:
    result = service.request_withdrawal(db, user_id=user_id, amount=payload.amount)
    return WithdrawResponse(
        request_id=result["request_id"],
        status=result["status"],
        amount=result["amount"],
        balance_after=result["balance_after"]
    )


class AdminProcessWithdrawalPayload(BaseModel):
    request_id: int
    action: str  # APPROVE, REJECT
    admin_memo: str | None = None

@router.post("/admin/process")
def admin_process_withdrawal(
    payload: AdminProcessWithdrawalPayload,
    db: Session = Depends(get_db),
    # In a real app, use Depends(get_current_admin)
    # For now, we assume the caller has admin rights or we use a header
    admin_id: int = 1 # Temporary hardcoded admin ID for MVP
):
    result = service.process_withdrawal(
        db, 
        request_id=payload.request_id, 
        action=payload.action, 
        admin_id=admin_id, 
        memo=payload.admin_memo
    )
    return result
