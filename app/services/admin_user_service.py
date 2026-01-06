"""Admin CRUD service for users."""
from datetime import date
from fastapi import HTTPException, status
from sqlalchemy import select, and_
from sqlalchemy.orm import Session, joinedload

from app.core.security import hash_password
from app.services.audit_service import AuditService
from app.models.user import User
from app.models.team_battle import TeamMember
from app.models.season_pass import SeasonPassConfig, SeasonPassLevel, SeasonPassProgress
from app.schemas.admin_user import AdminUserCreate, AdminUserUpdate


class AdminUserService:
    """Provide create/read/update/delete operations for users."""

    @staticmethod
    def _clean_telegram_username(value: str | None) -> str | None:
        if value is None:
            return None
        cleaned = str(value).strip().lstrip("@").strip()
        return cleaned or None

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
    def list_users(db: Session, q: str | None = None) -> list[User]:
        stmt = (
            select(User)
            .options(joinedload(User.admin_profile))
            .order_by(User.id.desc())
        )

        if q and q.strip():
            # Search Logic:
            # 1. Exact ID (numeric)
            # 2. Telegram Username (ILIKE) -> This is the priority requested
            # 3. Nickname (ILIKE)
            # 4. Real Name (ILIKE via admin_profile)
            # 5. External ID (ILIKE)
            # 6. Tags (ILIKE via admin_profile)
            # 7. Telegram ID (exact match; numeric)
            
            term = f"%{q.strip()}%"
            from sqlalchemy import or_, cast, String
            from app.models.admin_user_profile import AdminUserProfile
            
            # Note: We need to join admin_profile to search its fields
            stmt = stmt.outerjoin(User.admin_profile)
            
            conditions = [
                User.telegram_username.ilike(term),
                User.nickname.ilike(term),
                User.external_id.ilike(term),
                AdminUserProfile.real_name.ilike(term),
                AdminUserProfile.tags.ilike(term),
            ]
            
            if q.strip().isdigit():
                conditions.append(cast(User.id, String) == q.strip())
                # Allow searching by raw Telegram numeric ID copied from Telegram UI.
                # This is an exact match (not ILIKE) to avoid partial collisions.
                conditions.append(cast(User.telegram_id, String) == q.strip())
                # Some ops flows store telegram_id under admin_profile as string.
                conditions.append(cast(AdminUserProfile.telegram_id, String) == q.strip())
                
            stmt = stmt.where(or_(*conditions))

        users = db.execute(stmt).scalars().all()
        return [AdminUserService._enrich_user_with_xp(db, u) for u in users]

    @staticmethod
    def create_user(db: Session, payload: AdminUserCreate) -> User:
        if payload.user_id is not None and db.get(User, payload.user_id):
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="USER_ID_EXISTS")
        if db.query(User).filter(User.external_id == payload.external_id).first():
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="EXTERNAL_ID_EXISTS")

        # Set nickname: prefer provided nickname; else fall back to telegram_username if present; else external_id
        nickname = None
        if payload.nickname and str(payload.nickname).strip():
            nickname = str(payload.nickname).strip()
        elif payload.telegram_username and str(payload.telegram_username).strip():
            nickname = AdminUserService._clean_telegram_username(payload.telegram_username) or str(payload.telegram_username).strip()
        else:
            nickname = payload.external_id

        telegram_username = AdminUserService._clean_telegram_username(getattr(payload, "telegram_username", None))

        user = User(
            id=payload.user_id,
            external_id=payload.external_id,
            nickname=nickname,
            level=payload.level,
            xp=payload.xp,
            status=payload.status,
            telegram_id=getattr(payload, "telegram_id", None),
            telegram_username=telegram_username,
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
        if "telegram_id" in update_data:
            user.telegram_id = update_data["telegram_id"]
        if "telegram_username" in update_data:
            user.telegram_username = AdminUserService._clean_telegram_username(update_data["telegram_username"])
        if "login_streak" in update_data:
            user.login_streak = update_data["login_streak"]
        if "last_streak_updated_at" in update_data:
            user.last_streak_updated_at = update_data["last_streak_updated_at"]

        # Keep legacy admin_profile.telegram_id (string) aligned when we can.
        # Source of truth is user.telegram_id.
        if "admin_profile" in update_data and update_data["admin_profile"]:
            prof = update_data["admin_profile"]
            # If profile telegram_id is given and user.telegram_id was not explicitly updated,
            # try to sync user.telegram_id from it (numeric only).
            if "telegram_id" in prof and "telegram_id" not in update_data:
                raw = prof.get("telegram_id")
                raw_s = str(raw).strip() if raw is not None else ""
                if raw_s.isdigit():
                    user.telegram_id = int(raw_s)

            # If user.telegram_id was updated, mirror it into profile.telegram_id.
            if "telegram_id" in update_data:
                prof["telegram_id"] = str(user.telegram_id) if user.telegram_id is not None else None
        elif "telegram_id" in update_data and user.admin_profile is not None:
            user.admin_profile.telegram_id = str(user.telegram_id) if user.telegram_id is not None else None

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

        # Handle Admin Profile (CRM) update
        if "admin_profile" in update_data and update_data["admin_profile"]:
            from app.services.user_segment_service import UserSegmentService
            UserSegmentService.upsert_user_profile(db, user_id, update_data["admin_profile"])

        db.add(user)
        db.commit()
        db.refresh(user)
        return AdminUserService._enrich_user_with_xp(db, user)

    @staticmethod
    def delete_user(db: Session, user_id: int) -> None:
        user = db.get(User, user_id)
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="USER_NOT_FOUND")

        # Note: Most related tables use ON DELETE CASCADE at the DB level.
        # We perform an explicit cleanup for TeamMember just in case,
        # as orphaned memberships can cause logical issues in team counts.
        db.query(TeamMember).filter(TeamMember.user_id == user_id).delete(synchronize_session=False)

        db.delete(user)
        db.commit()

    @staticmethod
    def purge_user(db: Session, *, user_id: int, admin_id: int = 0) -> None:
        """Hard purge a user and related records.

        Motivation: make a specific account reusable for end-to-end tests
        (e.g., Telegram linking) even when DB cascades are incomplete.

        NOTE: This is destructive and should be gated at the API layer.
        """
        user = db.get(User, user_id)
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="USER_NOT_FOUND")

        before = {
            "user_id": int(user.id),
            "external_id": str(user.external_id),
            "telegram_id": int(user.telegram_id) if user.telegram_id is not None else None,
        }

        # Explicit cleanup for tables that often matter for test re-runs.
        # (Even if many have ON DELETE CASCADE, we delete defensively.)
        from app.models import (
            AdminMessageInbox,
            ExternalRankingData,
            ExternalRankingRewardLog,
            RankingDaily,
            SeasonPassProgress,
            SeasonPassRewardLog,
            SeasonPassStampLog,
            TeamEventLog,
            TeamMember,
            TrialTokenBucket,
            UserActivity,
            UserActivityEvent,
            UserCashLedger,
            UserEventLog,
            UserGameWallet,
            UserGameWalletLedger,
            UserIdempotencyKey,
            UserInventoryItem,
            UserInventoryLedger,
            UserMissionProgress,
            VaultEarnEvent,
            VaultWithdrawalRequest,
            VaultStatus,
        )
        from app.models.level_xp import UserLevelProgress, UserLevelRewardLog, UserXpEventLog
        from app.models.user_segment import UserSegment
        from app.models.dice import DiceLog
        from app.models.roulette import RouletteLog
        from app.models.lottery import LotteryLog
        from app.models.admin_user_profile import AdminUserProfile
        from app.models.telegram_link_code import TelegramLinkCode
        try:
            from app.models.telegram_unlink_request import TelegramUnlinkRequest
        except Exception:
            TelegramUnlinkRequest = None  # type: ignore

        # Delete children first.
        db.query(UserGameWalletLedger).filter(UserGameWalletLedger.user_id == user_id).delete(synchronize_session=False)
        db.query(UserGameWallet).filter(UserGameWallet.user_id == user_id).delete(synchronize_session=False)
        db.query(TrialTokenBucket).filter(TrialTokenBucket.user_id == user_id).delete(synchronize_session=False)
        db.query(UserCashLedger).filter(UserCashLedger.user_id == user_id).delete(synchronize_session=False)
        db.query(UserMissionProgress).filter(UserMissionProgress.user_id == user_id).delete(synchronize_session=False)

        db.query(UserInventoryLedger).filter(UserInventoryLedger.user_id == user_id).delete(synchronize_session=False)
        db.query(UserInventoryItem).filter(UserInventoryItem.user_id == user_id).delete(synchronize_session=False)

        # Level/XP system
        db.query(UserLevelRewardLog).filter(UserLevelRewardLog.user_id == user_id).delete(synchronize_session=False)
        db.query(UserXpEventLog).filter(UserXpEventLog.user_id == user_id).delete(synchronize_session=False)
        db.query(UserLevelProgress).filter(UserLevelProgress.user_id == user_id).delete(synchronize_session=False)

        # Segmentation
        db.query(UserSegment).filter(UserSegment.user_id == user_id).delete(synchronize_session=False)

        # Level/XP system
        db.query(UserLevelRewardLog).filter(UserLevelRewardLog.user_id == user_id).delete(synchronize_session=False)
        db.query(UserXpEventLog).filter(UserXpEventLog.user_id == user_id).delete(synchronize_session=False)
        db.query(UserLevelProgress).filter(UserLevelProgress.user_id == user_id).delete(synchronize_session=False)

        db.query(DiceLog).filter(DiceLog.user_id == user_id).delete(synchronize_session=False)
        db.query(RouletteLog).filter(RouletteLog.user_id == user_id).delete(synchronize_session=False)
        db.query(LotteryLog).filter(LotteryLog.user_id == user_id).delete(synchronize_session=False)

        db.query(VaultEarnEvent).filter(VaultEarnEvent.user_id == user_id).delete(synchronize_session=False)
        db.query(VaultWithdrawalRequest).filter(VaultWithdrawalRequest.user_id == user_id).delete(synchronize_session=False)
        db.query(VaultStatus).filter(VaultStatus.user_id == user_id).delete(synchronize_session=False)

        db.query(UserActivityEvent).filter(UserActivityEvent.user_id == user_id).delete(synchronize_session=False)
        db.query(UserActivity).filter(UserActivity.user_id == user_id).delete(synchronize_session=False)

        db.query(ExternalRankingRewardLog).filter(ExternalRankingRewardLog.user_id == user_id).delete(synchronize_session=False)
        db.query(ExternalRankingData).filter(ExternalRankingData.user_id == user_id).delete(synchronize_session=False)
        db.query(RankingDaily).filter(RankingDaily.user_id == user_id).delete(synchronize_session=False)

        db.query(SeasonPassRewardLog).filter(SeasonPassRewardLog.user_id == user_id).delete(synchronize_session=False)
        db.query(SeasonPassStampLog).filter(SeasonPassStampLog.user_id == user_id).delete(synchronize_session=False)
        db.query(SeasonPassProgress).filter(SeasonPassProgress.user_id == user_id).delete(synchronize_session=False)

        db.query(TeamEventLog).filter(TeamEventLog.user_id == user_id).delete(synchronize_session=False)
        db.query(TeamMember).filter(TeamMember.user_id == user_id).delete(synchronize_session=False)

        db.query(AdminMessageInbox).filter(AdminMessageInbox.user_id == user_id).delete(synchronize_session=False)

        db.query(UserIdempotencyKey).filter(UserIdempotencyKey.user_id == user_id).delete(synchronize_session=False)
        db.query(TelegramLinkCode).filter(TelegramLinkCode.user_id == user_id).delete(synchronize_session=False)

        # Telegram unlink requests can reference users by several columns (SET NULL FK),
        # but we delete them to fully reset Telegram flows.
        if TelegramUnlinkRequest is not None:
            from sqlalchemy import inspect

            inspector = inspect(db.bind)
            if inspector.has_table(TelegramUnlinkRequest.__tablename__):
                db.query(TelegramUnlinkRequest).filter(
                    (TelegramUnlinkRequest.current_user_id == user_id)
                    | (TelegramUnlinkRequest.requester_user_id == user_id)
                    | (TelegramUnlinkRequest.processed_by == user_id)
                ).delete(synchronize_session=False)
                if user.telegram_id is not None:
                    db.query(TelegramUnlinkRequest).filter(
                        TelegramUnlinkRequest.telegram_id == str(int(user.telegram_id))
                    ).delete(synchronize_session=False)

        # Profile row might exist even if user deletion is blocked in some DBs.
        db.query(AdminUserProfile).filter(AdminUserProfile.user_id == user_id).delete(synchronize_session=False)

        # Finally, delete the user.
        db.delete(user)

        AuditService.record_admin_audit(
            db,
            admin_id=admin_id,
            action="PURGE_USER",
            target_type="User",
            target_id=str(user_id),
            before=before,
            after=None,
        )
        db.commit()
