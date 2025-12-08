"""Admin user CRUD endpoints."""
from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.schemas.admin_user import AdminUserCreate, AdminUserResponse, AdminUserUpdate
from app.services.admin_user_service import AdminUserService

router = APIRouter(prefix="/admin/api/users", tags=["admin-users"])


@router.get("/", response_model=List[AdminUserResponse])
def list_users(db: Session = Depends(get_db)) -> List[AdminUserResponse]:
    users = AdminUserService.list_users(db)
    return [AdminUserResponse.model_validate(u) for u in users]


@router.post("/", response_model=AdminUserResponse, status_code=201)
def create_user(payload: AdminUserCreate, db: Session = Depends(get_db)) -> AdminUserResponse:
    user = AdminUserService.create_user(db, payload)
    return AdminUserResponse.model_validate(user)


@router.put("/{user_id}", response_model=AdminUserResponse)
def update_user(user_id: int, payload: AdminUserUpdate, db: Session = Depends(get_db)) -> AdminUserResponse:
    user = AdminUserService.update_user(db, user_id, payload)
    return AdminUserResponse.model_validate(user)


@router.delete("/{user_id}", status_code=204)
def delete_user(user_id: int, db: Session = Depends(get_db)) -> None:
    AdminUserService.delete_user(db, user_id)
