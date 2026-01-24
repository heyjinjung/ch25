from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.models.game_wallet import GameTokenType, UserGameWallet
from app.v2.api.deps import get_current_user_id
from app.v2.services.vault_service import V2VaultService
from app.v2.services.user_service import V2UserService

router = APIRouter(prefix="/vault", tags=["Vault"])
service = V2VaultService()

class VaultWithdrawRequest(BaseModel):
    amount: int
    protocol_key: str | None = None

@router.get("/status")
def get_v2_vault_status(
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id)
):
    try:
        now = datetime.utcnow()
        # V2VaultService.get_vault_info handles everything: SoT sync, eligibility, targets, ticketCount, and CC deposit status.
        return service.get_vault_info(db=db, user_id=user_id, now=now)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/withdraw")
def v2_withdraw(
    payload: VaultWithdrawRequest,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id)
):
    try:
        legacy_user_id = V2UserService.ensure_legacy_user_id(db, user_id)
        result = service.request_withdrawal(db=db, user_id=legacy_user_id, amount=int(payload.amount))
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
