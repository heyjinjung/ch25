"""Admin Feed Configuration Endpoints."""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_current_admin_id  # Ensure admin auth
# from app.api.admin.deps import get_current_admin
from app.services.feed_service import FeedService
from app.services.vault2_service import Vault2Service
from app.schemas.admin_feed import FeedJackpotConfig, FeedConfigResponse

router = APIRouter(prefix="/feed", tags=["admin-feed"])

@router.get("/config", response_model=FeedConfigResponse)
def get_feed_config(
    db: Session = Depends(get_db),
    admin_id: int = Depends(get_current_admin_id),
) -> FeedConfigResponse:
    """Get current jackpot feed thresholds."""
    service = FeedService()
    config = service.get_jackpot_config(db)
    return FeedConfigResponse(**config)

@router.put("/config", response_model=FeedConfigResponse)
def update_feed_config(
    payload: FeedJackpotConfig,
    db: Session = Depends(get_db),
    admin_id: int = Depends(get_current_admin_id),
) -> FeedConfigResponse:
    """Update jackpot feed thresholds."""
    v2 = Vault2Service()
    current_admin_id = admin_id
    
    # Store as 'jackpot_config' in Vault2 default program
    v2.set_config_value(
        db, 
        key="jackpot_config", 
        value=payload.dict(), 
        admin_id=current_admin_id
    )
    
    return FeedConfigResponse(**payload.dict())
