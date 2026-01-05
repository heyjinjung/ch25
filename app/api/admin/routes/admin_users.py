"""Admin user CRUD endpoints."""
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload

from app.api.deps import get_current_admin_id, get_db
from app.core.config import get_settings
from app.models.user import User
from app.schemas.admin_user import AdminUserCreate, AdminUserResponse, AdminUserUpdate
from app.schemas.admin_user_summary import AdminUserResolveResponse
from app.services.admin_user_service import AdminUserService
from app.services.admin_user_identity_service import build_admin_user_summary, resolve_user_summary

router = APIRouter(prefix="/admin/api/users", tags=["admin-users"])


@router.get("", response_model=List[AdminUserResponse])
@router.get("/", response_model=List[AdminUserResponse])
def list_users(
    db: Session = Depends(get_db),
    # q param for search
    q: str | None = None
) -> List[AdminUserResponse]:
    # Support both /admin/api/users and /admin/api/users/ to avoid redirect-induced CORS noise
    users = AdminUserService.list_users(db, q)
    return [
        AdminUserResponse.model_validate(u).model_copy(update={"summary": build_admin_user_summary(u)})
        for u in users
    ]


@router.get("/resolve", response_model=AdminUserResolveResponse)
def resolve_user(identifier: str, db: Session = Depends(get_db)) -> AdminUserResolveResponse:
    summary = resolve_user_summary(db, identifier)
    return AdminUserResolveResponse(identifier=identifier, user=summary)


@router.post("", response_model=AdminUserResponse, status_code=201)
@router.post("/", response_model=AdminUserResponse, status_code=201)
def create_user(payload: AdminUserCreate, db: Session = Depends(get_db)) -> AdminUserResponse:
    # Accept both trailing and non-trailing slash
    user = AdminUserService.create_user(db, payload)
    user_full = (
        db.query(User)
        .options(joinedload(User.admin_profile))
        .filter(User.id == user.id)
        .first()
    )
    user_full = user_full or user
    return AdminUserResponse.model_validate(user_full).model_copy(update={"summary": build_admin_user_summary(user_full)})


@router.put("/{user_id}", response_model=AdminUserResponse)
def update_user(user_id: int, payload: AdminUserUpdate, db: Session = Depends(get_db)) -> AdminUserResponse:
    user = AdminUserService.update_user(db, user_id, payload)
    user_full = (
        db.query(User)
        .options(joinedload(User.admin_profile))
        .filter(User.id == user.id)
        .first()
    )
    user_full = user_full or user
    return AdminUserResponse.model_validate(user_full).model_copy(update={"summary": build_admin_user_summary(user_full)})


@router.delete("/{user_id}", status_code=204)
def delete_user(user_id: int, db: Session = Depends(get_db)) -> None:
    AdminUserService.delete_user(db, user_id)


@router.post("/{user_id}/purge", status_code=204)
def purge_user(
    user_id: int,
    db: Session = Depends(get_db),
    admin_id: int = Depends(get_current_admin_id),
) -> None:
    """Hard purge a user and all related records for test resets.

    NOTE: This is a destructive operation.
    """
    AdminUserService.purge_user(db, user_id=user_id, admin_id=admin_id)

