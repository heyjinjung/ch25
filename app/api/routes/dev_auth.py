"""Development-only authentication endpoints for local testing."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.core.config import get_settings
from app.core.security import create_access_token
from app.models.user import User

router = APIRouter(prefix="/api/dev", tags=["dev"])


@router.post("/create-test-user")
async def create_test_user():
    """
    Create a test user for development.
    Only works in non-production environments.
    Returns a mock token without database access.
    """
    settings = get_settings()
    
    # Security check: only allow in development
    if settings.env not in ["local", "development", "dev"]:
        raise HTTPException(status_code=403, detail="Dev endpoints disabled in production")
    
    # Generate mock access token (user_id = 1 for dev)
    access_token = create_access_token(subject="1")
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": 1,
            "external_id": "dev_test_user",
            "nickname": "개발 테스트 유저",
            "level": 10,
            "vault_balance": 100000,
            "cash_balance": 25000,
        },
        "message": "Test token created successfully. Use this token in Authorization header: Bearer <token>",
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
