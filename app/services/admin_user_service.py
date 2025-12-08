"""Admin CRUD service for users."""
from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.models.user import User
from app.schemas.admin_user import AdminUserCreate, AdminUserUpdate


class AdminUserService:
    """Provide create/read/update/delete operations for users."""

    @staticmethod
    def list_users(db: Session) -> list[User]:
        return db.execute(select(User).order_by(User.id.desc())).scalars().all()

    @staticmethod
    def create_user(db: Session, payload: AdminUserCreate) -> User:
        if payload.user_id is not None and db.get(User, payload.user_id):
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="USER_ID_EXISTS")
        if db.query(User).filter(User.external_id == payload.external_id).first():
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="EXTERNAL_ID_EXISTS")

        user = User(
            id=payload.user_id,
            external_id=payload.external_id,
            nickname=payload.nickname,
            level=payload.level,
            status=payload.status,
        )
        if payload.password:
            user.password_hash = hash_password(payload.password)

        db.add(user)
        db.commit()
        db.refresh(user)
        return user

    @staticmethod
    def update_user(db: Session, user_id: int, payload: AdminUserUpdate) -> User:
        user = db.get(User, user_id)
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="USER_NOT_FOUND")

        update_data = payload.model_dump(exclude_unset=True)
        if "external_id" in update_data:
            if (
                db.query(User)
                .filter(User.external_id == update_data["external_id"], User.id != user_id)
                .first()
            ):
                raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="EXTERNAL_ID_EXISTS")
            user.external_id = update_data["external_id"]
        if "nickname" in update_data:
            user.nickname = update_data["nickname"]
        if "level" in update_data:
            user.level = update_data["level"]
        if "status" in update_data:
            user.status = update_data["status"]
        if "password" in update_data and update_data["password"]:
            user.password_hash = hash_password(update_data["password"])

        db.add(user)
        db.commit()
        db.refresh(user)
        return user

    @staticmethod
    def delete_user(db: Session, user_id: int) -> None:
        user = db.get(User, user_id)
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="USER_NOT_FOUND")
        db.delete(user)
        db.commit()
