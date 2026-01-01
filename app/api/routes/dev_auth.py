"""Development-only authentication endpoints for local testing."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.core.config import get_settings
from app.core.security import create_access_token
from app.models.game_wallet import GameTokenType
from app.models.user import User
from app.services.game_wallet_service import GameWalletService
from app.services.inventory_service import InventoryService

router = APIRouter()


class GrantGameTokensPayload(dict):
    pass


@router.post("/create-test-user")
async def create_test_user(db: Session = Depends(get_db)):
    """
    Create a test user for development.
    Only works in non-production environments.
    Creates/updates a real DB user so the issued token is valid for API calls.
    """
    settings = get_settings()
    
    # Security check: only allow in development
    if settings.env not in ["local", "development", "dev"]:
        raise HTTPException(status_code=403, detail="Dev endpoints disabled in production")
    
    external_id = "dev_test_user"
    user = db.query(User).filter(User.external_id == external_id).one_or_none()
    if user is None:
        user = User(
            external_id=external_id,
            nickname="개발 테스트 유저",
            level=10,
            vault_locked_balance=100000,
            vault_balance=100000,
            cash_balance=25000,
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    access_token = create_access_token(user_id=int(user.id))
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": int(user.id),
            "external_id": user.external_id,
            "nickname": user.nickname,
            "level": int(user.level),
            "vault_balance": int(user.vault_balance),
            "cash_balance": int(user.cash_balance),
        },
        "message": "Test token created successfully. Use this token in Authorization header: Bearer <token>",
    }


@router.post("/grant-game-tokens")
async def grant_game_tokens(payload: dict, db: Session = Depends(get_db)):
    """Dev-only: grant game wallet tokens to a user by external_id.

    Payload: { "external_id": "..." (optional, default dev_test_user), "token_type": "DIAMOND", "amount": 1000 }
    """
    settings = get_settings()
    if settings.env not in ["local", "development", "dev"]:
        raise HTTPException(status_code=403, detail="Dev endpoints disabled in production")

    external_id = (payload.get("external_id") or "dev_test_user").strip()
    token_type_raw = payload.get("token_type")
    amount = payload.get("amount")

    if not external_id:
        raise HTTPException(status_code=400, detail="MISSING_EXTERNAL_ID")
    if not token_type_raw:
        raise HTTPException(status_code=400, detail="MISSING_TOKEN_TYPE")
    if not isinstance(amount, int) or amount <= 0:
        raise HTTPException(status_code=400, detail="INVALID_AMOUNT")

    user = db.query(User).filter(User.external_id == external_id).one_or_none()
    if user is None:
        raise HTTPException(status_code=404, detail="USER_NOT_FOUND")

    try:
        token_type = GameTokenType(str(token_type_raw))
    except Exception as exc:
        raise HTTPException(status_code=400, detail="INVALID_TOKEN_TYPE") from exc

    # Align with Phase 2 rules: DIAMOND is an inventory item (SoT), not a wallet token.
    if token_type == GameTokenType.DIAMOND:
        item = InventoryService.grant_item(
            db,
            user_id=int(user.id),
            item_type="DIAMOND",
            amount=amount,
            reason="DEV_GRANT",
            related_id=None,
            auto_commit=True,
        )
        return {
            "success": True,
            "user_id": int(user.id),
            "external_id": user.external_id,
            "token_type": token_type.value,
            "amount": amount,
            "granted_to": "inventory",
            "item_type": item.item_type,
            "balance_after": int(item.quantity),
        }

    wallet_service = GameWalletService()
    new_balance = wallet_service.grant_tokens(
        db,
        user_id=int(user.id),
        token_type=token_type,
        amount=amount,
        reason="DEV_GRANT",
    )
    return {
        "success": True,
        "user_id": int(user.id),
        "external_id": user.external_id,
        "token_type": token_type.value,
        "amount": amount,
        "granted_to": "wallet",
        "balance_after": int(new_balance),
    }


@router.get("/test-auth")
async def test_auth():
    """
    Test endpoint to verify dev mode is enabled.
    """
    settings = get_settings()
    
    if settings.env not in ["local", "development", "dev"]:
        raise HTTPException(status_code=403, detail="Dev endpoints disabled in production")
    
    return {
        "status": "ok",
        "env": settings.env,
        "message": "Dev mode is enabled. You can use /api/dev/create-test-user to get a test token.",
    }
