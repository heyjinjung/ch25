"""Development-only authentication endpoints for local testing."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.core.config import get_settings
from app.core.security import create_access_token
from app.models.user import User

router = APIRouter()


@router.post("/create-test-user")
async def create_test_user(db: Session = Depends(get_db)):
    """
    Create a test user for development.
    Only works in non-production environments.
    """
    settings = get_settings()
    
    # Security check: only allow in development
    if settings.env not in ["local", "development", "dev"]:
        raise HTTPException(status_code=403, detail="Dev endpoints disabled in production")
    
    # Check if test user already exists
    test_user = db.query(User).filter(User.external_id == "dev_test_user").first()
    
    if not test_user:
        # Create new test user
        test_user = User(
            external_id="dev_test_user",
            nickname="개발 테스트 유저",
            level=10,
            xp=5000,
            vault_balance=100000,
            vault_locked_balance=50000,
            cash_balance=25000,
            telegram_id=999999999,
            telegram_username="dev_tester",
        )
        db.add(test_user)
        db.commit()
        db.refresh(test_user)
    
    # Generate access token
    access_token = create_access_token(subject=str(test_user.id))
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": test_user.id,
            "external_id": test_user.external_id,
            "nickname": test_user.nickname,
            "level": test_user.level,
            "vault_balance": test_user.vault_balance,
            "cash_balance": test_user.cash_balance,
        },
        "message": "Test user created/retrieved successfully. Use this token in Authorization header: Bearer <token>",
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
