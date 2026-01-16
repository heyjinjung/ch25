from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_current_user
from app.models.user import User
from app.schemas.exchange import CraftRequest, CraftResponse
from app.services.exchange_service import ExchangeService

router = APIRouter(prefix="/api/exchange", tags=["exchange"])

@router.post("/craft", response_model=CraftResponse)
def craft_key(
    payload: CraftRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    service = ExchangeService()
    result = service.craft_key(db, current_user.id, payload.target_token_type)
    return result
