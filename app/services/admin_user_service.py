"""Admin CRUD service for users."""
from datetime import date
from fastapi import HTTPException, status
from sqlalchemy import select, and_
from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.models.user import User
from app.models.team_battle import TeamMember
from app.models.season_pass import SeasonPassConfig, SeasonPassLevel, SeasonPassProgress
from app.schemas.admin_user import AdminUserCreate, AdminUserUpdate


class AdminUserService:
    """Provide create/read/update/delete operations for users."""

    @staticmethod
    def _get_active_season(db: Session, today: date) -> SeasonPassConfig | None:
        return db.execute(
            select(SeasonPassConfig).where(
                and_(SeasonPassConfig.start_date <= today, SeasonPassConfig.end_date >= today, SeasonPassConfig.is_active == True)
            )
        ).scalar_one_or_none()

    @staticmethod
    def _get_or_create_progress(db: Session, user_id: int, season: SeasonPassConfig) -> SeasonPassProgress:
        progress = db.execute(
            select(SeasonPassProgress).where(
                and_(SeasonPassProgress.user_id == user_id, SeasonPassProgress.season_id == season.id)
            )
        ).scalar_one_or_none()
        if not progress:
            progress = SeasonPassProgress(
                user_id=user_id,
                season_id=season.id,
                current_xp=0,
                current_level=1,
            )
            db.add(progress)
            db.flush()
        return progress

    @staticmethod
    def _compute_level_from_xp(db: Session, season: SeasonPassConfig, xp: int) -> int:
        levels = (
            db.execute(
                select(SeasonPassLevel.level, SeasonPassLevel.required_xp)
                .where(SeasonPassLevel.season_id == season.id)
                .order_by(SeasonPassLevel.level.asc())
            )
            .all()
        )
        target = 1
        for lvl, req_xp in levels:
            if xp >= req_xp:
                target = lvl
            else:
                break
        # Clamp to season.max_level in case table is incomplete
        return min(target, season.max_level)

    @staticmethod
    def _enrich_user_with_xp(db: Session, user: User) -> User:
        today = date.today()
        active_season = AdminUserService._get_active_season(db, today)
        
        user.xp = 0
        user.season_level = 1
        
        if active_season:
            progress = db.execute(
                select(SeasonPassProgress).where(
                    and_(SeasonPassProgress.user_id == user.id, SeasonPassProgress.season_id == active_season.id)
                )
            ).scalar_one_or_none()
            if progress:
                user.xp = progress.current_xp
                user.season_level = progress.current_level
        return user

    @staticmethod
    def list_users(db: Session) -> list[User]:
        users = db.execute(select(User).order_by(User.id.desc())).scalars().all()
        return [AdminUserService._enrich_user_with_xp(db, u) for u in users]

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
            xp=payload.xp,
            status=payload.status,
        )
        if payload.password:
            user.password_hash = hash_password(payload.password)

        db.add(user)
        db.commit()
        db.refresh(user)
        
        # Initialize season progress if XP provided; season level is derived from XP
        if payload.xp is not None:
            today = date.today()
            active_season = AdminUserService._get_active_season(db, today)
            if active_season:
                progress = AdminUserService._get_or_create_progress(db, user.id, active_season)
                progress.current_xp = payload.xp
                progress.current_level = AdminUserService._compute_level_from_xp(db, active_season, payload.xp)
                user.level = progress.current_level  # Keep game level in sync with season level per request
                db.add(progress)
                db.add(user)
                db.commit()
                db.refresh(user)

        return AdminUserService._enrich_user_with_xp(db, user)

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
        if "xp" in update_data:
            user.xp = update_data["xp"]
        if "status" in update_data:
            user.status = update_data["status"]
        if "password" in update_data and update_data["password"]:
            user.password_hash = hash_password(update_data["password"])

        # Handle XP/Season Level update (XP is the source of truth; level auto-derived)
        if "xp" in update_data or "season_level" in update_data:
            today = date.today()
            active_season = AdminUserService._get_active_season(db, today)

            if active_season:
                progress = AdminUserService._get_or_create_progress(db, user.id, active_season)

                # Update XP first (if provided)
                if "xp" in update_data:
                    progress.current_xp = update_data["xp"]
                    progress.current_level = AdminUserService._compute_level_from_xp(db, active_season, progress.current_xp)
                    user.level = progress.current_level  # keep game level aligned with season level
                # If only season_level is provided (no xp), allow manual override but still sync game level
                elif "season_level" in update_data:
                    progress.current_level = update_data["season_level"]
                    user.level = progress.current_level

                db.add(progress)

        db.add(user)
        db.commit()
        db.refresh(user)
        return AdminUserService._enrich_user_with_xp(db, user)

    @staticmethod
    def delete_user(db: Session, user_id: int) -> None:
        user = db.get(User, user_id)
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="USER_NOT_FOUND")

        # `team_member.user_id` is not a FK, so deleting a user can leave orphaned
        # memberships that still occupy team slots / appear in counts.
        db.query(TeamMember).filter(TeamMember.user_id == user_id).delete(synchronize_session=False)
        db.delete(user)
        db.commit()
