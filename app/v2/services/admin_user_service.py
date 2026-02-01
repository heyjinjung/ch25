from datetime import date, datetime
import hashlib
import logging
import re
from typing import Any, Optional
from fastapi import HTTPException
from sqlalchemy import func, select, String
from sqlalchemy.orm import Session, joinedload

from app.core.security import hash_password
from app.v2.models import AdminUserProfile
from app.schemas.admin_user import AdminUserCreate
from app.v2.models.user import V2User
from app.v2.schemas.v2_admin_user_summary import AdminUserSummary
from app.v2.services.admin_audit_service import V2AdminAuditService

_TG_EXTERNAL_ID_RE = re.compile(r"^tg_(\d+)_", re.IGNORECASE)
logger = logging.getLogger("uvicorn.error")

class V2AdminUserService:
    @staticmethod
    def _clean_telegram_username(value: str | None) -> str | None:
        if value is None:
            return None
        cleaned = str(value).strip().lstrip("@").strip()
        return cleaned or None

    @staticmethod
    def _identifier_kind(raw: str) -> str:
        s = (raw or "").strip()
        if not s:
            return "empty"
        if s.isdigit():
            return "numeric"
        if _TG_EXTERNAL_ID_RE.match(s):
            return "tg_external_id"
        if s.startswith("@"):
            return "username"
        return "text"

    @staticmethod
    def _identifier_fingerprint(raw: str) -> str:
        s = (raw or "").strip().lower()
        if not s:
            return ""
        return hashlib.sha256(s.encode("utf-8")).hexdigest()[:10]

    @staticmethod
    def create_user(db: Session, payload: AdminUserCreate) -> V2User:
        """Create a user with V2 standard logic."""
        # Simple existence check
        if payload.user_id is not None and db.get(V2User, payload.user_id):
            raise HTTPException(status_code=409, detail="USER_ID_EXISTS")
            
        if db.query(V2User).filter(V2User.cc_id == payload.cc_id).first():
            raise HTTPException(status_code=409, detail="EXTERNAL_ID_EXISTS")

        nickname = payload.nickname or payload.telegram_username or payload.cc_id
        telegram_username = V2AdminUserService._clean_telegram_username(payload.telegram_username)

        user = V2User(
            id=payload.user_id,
            external_id=payload.cc_id,
            nickname=nickname,
            level=payload.level or 1,
            xp=payload.xp or 0,
            status=payload.status or "ACTIVE",
            telegram_id=payload.telegram_id,
            telegram_username=telegram_username,
        )
        if payload.password:
            user.password_hash = hash_password(payload.password)

        db.add(user)
        db.flush()
        
        return user

    @staticmethod
    def derive_tg_id(user: V2User) -> Optional[int]:
        if getattr(user, "telegram_id", None):
            try:
                return int(user.telegram_id)
            except Exception:
                pass

        admin_profile = getattr(user, "admin_profile", None)
        if admin_profile and getattr(admin_profile, "telegram_id", None):
            raw = str(admin_profile.telegram_id).strip()
            if raw.isdigit():
                try:
                    return int(raw)
                except Exception:
                    pass

        external_id = (getattr(user, "external_id", "") or "").strip()
        m = _TG_EXTERNAL_ID_RE.match(external_id)
        if m:
            try:
                return int(m.group(1))
            except Exception:
                pass
        return None

    @staticmethod
    def build_summary(user: V2User) -> AdminUserSummary:
        admin_profile = getattr(user, "admin_profile", None)
        return AdminUserSummary(
            id=int(user.id),
            cc_id=str(user.external_id),
            nickname=(user.nickname or None),
            tg_id=V2AdminUserService.derive_tg_id(user),
            tg_username=(user.telegram_username or None),
            real_name=(getattr(admin_profile, "real_name", None) if admin_profile else None),
            phone_number=(getattr(admin_profile, "phone_number", None) if admin_profile else None),
            tags=(list(getattr(admin_profile, "tags", None) or []) if admin_profile else None),
            memo=(getattr(admin_profile, "memo", None) if admin_profile else None),
        )

    @staticmethod
    def resolve_user_id(db: Session, identifier: str) -> int:
        raw = (identifier or "").strip()
        if not raw:
            raise HTTPException(status_code=400, detail="IDENTIFIER_REQUIRED")

        if raw.isdigit():
            val = int(raw)
            V2User_id = db.execute(select(V2User.id).where(V2User.id == val)).scalar_one_or_none()
            if V2User_id is not None:
                return int(V2User_id)
            V2User_id = db.execute(select(V2User.id).where(V2User.telegram_id == val)).scalar_one_or_none()
            if V2User_id is not None:
                return int(V2User_id)
            raise HTTPException(status_code=404, detail="USER_NOT_FOUND")

        # Text search (Username, Nickname, RealName, CCID)
        clean = (raw or "").strip().lstrip("@").strip()

        # Try exact matches
        # 1. Nickname
        match = db.execute(select(V2User.id).where(func.lower(V2User.nickname) == func.lower(clean))).scalar_one_or_none()
        if match: return int(match)

        # 2. Telegram Username
        match = db.execute(select(V2User.id).where(func.lower(V2User.telegram_username) == func.lower(clean))).scalar_one_or_none()
        if match: return int(match)

        # 3. External ID
        match = db.execute(select(V2User.id).where(func.lower(V2User.external_id) == func.lower(clean))).scalar_one_or_none()
        if match: return int(match)

        # 4. Real Name
        record = db.execute(
            select(V2User.id).join(AdminUserProfile).where(func.lower(AdminUserProfile.real_name) == func.lower(clean))
        ).scalar_one_or_none()
        if record: return int(record)

        raise HTTPException(status_code=404, detail="USER_NOT_FOUND")

    @staticmethod
    def resolve_summary(db: Session, identifier: str) -> AdminUserSummary:
        user_id = V2AdminUserService.resolve_user_id(db, identifier)
        user = db.execute(
            select(V2User).options(joinedload(V2User.admin_profile)).where(V2User.id == user_id)
        ).scalar_one_or_none()
        if not user:
            raise HTTPException(status_code=404, detail="USER_NOT_FOUND")
        return V2AdminUserService.build_summary(user)

    # ─────────────────────────────────────────────────────────────────
    # User Delete / Purge (V2 Native - 배포 후 V1 일괄 삭제)
    # ─────────────────────────────────────────────────────────────────

    @staticmethod
    def delete_user(db: Session, user_id: int, *, admin_id: int = 0) -> None:
        """일반 유저 삭제 (CASCADE 의존, TeamMember만 명시 정리)"""
        from app.v2.models import TeamMember

        v2_user = db.get(V2User, user_id)
        if not v2_user:
            raise HTTPException(status_code=404, detail="USER_NOT_FOUND")

        # SoT 기반 삭제 정보 추출
        target_ext_id = str(v2_user.cc_id)
        target_nickname = v2_user.nickname

        before = {
            "user_id": int(user_id),
            "external_id": target_ext_id,
            "nickname": target_nickname,
        }

        # TeamMember 명시 정리 (orphaned 방지)
        db.query(TeamMember).filter(TeamMember.user_id == user_id).delete(synchronize_session=False)

        # V2 전용 데이터 삭제 (CASCADE 미보장 대비)
        from app.v2.models.v2_user_segment import V2UserSegment
        db.query(V2UserSegment).filter(V2UserSegment.user_id == user_id).delete(synchronize_session=False)

        # V2 유저 테이블 삭제
        db.delete(v2_user)

        V2AdminAuditService.log(
            db,
            admin_id=admin_id,
            action="DELETE_USER",
            target_type="User",
            target_id=str(user_id),
            before=before,
            after=None,
        )
        db.commit()

    @staticmethod
    def purge_user(db: Session, *, user_id: int, admin_id: int = 0) -> None:
        """유저 + 연관 데이터 전체 강제 삭제 (테스트 리셋용, 파괴적 연산)

        NOTE: API 레이어에서 권한 게이팅 필수
        """
        v2_user = db.get(V2User, user_id)
        if not v2_user:
            raise HTTPException(status_code=404, detail="USER_NOT_FOUND")

        target_ext_id = str(v2_user.cc_id)
        target_nickname = v2_user.nickname
        target_telegram_id = v2_user.telegram_id

        before = {
            "user_id": int(user_id),
            "external_id": target_ext_id,
            "nickname": target_nickname,
        }

        # ─── 연관 테이블 방어적 삭제 (CASCADE 미보장 대비) ───
        from app.v2.models import (
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
        from app.v2.models import UserLevelProgress, UserLevelRewardLog, UserXpEventLog
        from app.v2.models.v2_user_segment import V2UserSegment as V2UserSegmentRecord
        from app.v2.models import UserSegment
        from app.v2.models import DiceLog
        from app.v2.models import RouletteLog
        from app.v2.models import LotteryLog
        from app.v2.models import AdminUserProfile
        from app.v2.models import TelegramLinkCode
        try:
            from app.v2.models import TelegramUnlinkRequest
        except Exception:
            TelegramUnlinkRequest = None  # type: ignore

        from app.v2.models.auth_event import V2UserAuthEvent
        from app.v2.models.refresh_token import V2UserRefreshToken
        from app.v2.models.v2_user_deposit_evidence import V2UserDepositEvidence
        from app.v2.models.v2_shop_order import V2ShopOrder
        from app.v2.models.v2_user_retention_state import V2UserRetentionState

        # Game Wallet / Tokens
        db.query(UserGameWalletLedger).filter(UserGameWalletLedger.user_id == user_id).delete(synchronize_session=False)
        db.query(UserGameWallet).filter(UserGameWallet.user_id == user_id).delete(synchronize_session=False)
        db.query(TrialTokenBucket).filter(TrialTokenBucket.user_id == user_id).delete(synchronize_session=False)
        db.query(UserCashLedger).filter(UserCashLedger.user_id == user_id).delete(synchronize_session=False)

        # Mission
        db.query(UserMissionProgress).filter(UserMissionProgress.user_id == user_id).delete(synchronize_session=False)

        # Inventory
        db.query(UserInventoryLedger).filter(UserInventoryLedger.user_id == user_id).delete(synchronize_session=False)
        db.query(UserInventoryItem).filter(UserInventoryItem.user_id == user_id).delete(synchronize_session=False)

        # Level / XP
        db.query(UserLevelRewardLog).filter(UserLevelRewardLog.user_id == user_id).delete(synchronize_session=False)
        db.query(UserXpEventLog).filter(UserXpEventLog.user_id == user_id).delete(synchronize_session=False)
        db.query(UserLevelProgress).filter(UserLevelProgress.user_id == user_id).delete(synchronize_session=False)

        # Segmentation (Legacy & V2)
        db.query(UserSegment).filter(UserSegment.user_id == user_id).delete(synchronize_session=False)
        db.query(V2UserSegmentRecord).filter(V2UserSegmentRecord.user_id == user_id).delete(synchronize_session=False)

        # Game Logs
        db.query(DiceLog).filter(DiceLog.user_id == user_id).delete(synchronize_session=False)
        db.query(RouletteLog).filter(RouletteLog.user_id == user_id).delete(synchronize_session=False)
        db.query(LotteryLog).filter(LotteryLog.user_id == user_id).delete(synchronize_session=False)

        # Vault
        db.query(VaultEarnEvent).filter(VaultEarnEvent.user_id == user_id).delete(synchronize_session=False)
        db.query(VaultWithdrawalRequest).filter(VaultWithdrawalRequest.user_id == user_id).delete(synchronize_session=False)
        db.query(VaultStatus).filter(VaultStatus.user_id == user_id).delete(synchronize_session=False)
        db.query(V2UserDepositEvidence).filter(V2UserDepositEvidence.user_id == user_id).delete(synchronize_session=False)

        # Activity
        db.query(UserActivityEvent).filter(UserActivityEvent.user_id == user_id).delete(synchronize_session=False)
        db.query(UserActivity).filter(UserActivity.user_id == user_id).delete(synchronize_session=False)

        # Ranking
        db.query(ExternalRankingRewardLog).filter(ExternalRankingRewardLog.user_id == user_id).delete(synchronize_session=False)
        db.query(ExternalRankingData).filter(ExternalRankingData.user_id == user_id).delete(synchronize_session=False)
        db.query(RankingDaily).filter(RankingDaily.user_id == user_id).delete(synchronize_session=False)

        # Season Pass
        db.query(SeasonPassRewardLog).filter(SeasonPassRewardLog.user_id == user_id).delete(synchronize_session=False)
        db.query(SeasonPassStampLog).filter(SeasonPassStampLog.user_id == user_id).delete(synchronize_session=False)
        db.query(SeasonPassProgress).filter(SeasonPassProgress.user_id == user_id).delete(synchronize_session=False)

        # Team Battle
        db.query(TeamEventLog).filter(TeamEventLog.user_id == user_id).delete(synchronize_session=False)
        db.query(TeamMember).filter(TeamMember.user_id == user_id).delete(synchronize_session=False)

        # Messaging
        db.query(AdminMessageInbox).filter(AdminMessageInbox.user_id == user_id).delete(synchronize_session=False)

        # V2 Auth / Tokens
        db.query(V2UserAuthEvent).filter(V2UserAuthEvent.user_id == user_id).delete(synchronize_session=False)
        db.query(V2UserRefreshToken).filter(V2UserRefreshToken.user_id == user_id).delete(synchronize_session=False)
        db.query(V2ShopOrder).filter(V2ShopOrder.user_id == user_id).delete(synchronize_session=False)
        db.query(V2UserRetentionState).filter(V2UserRetentionState.user_id == user_id).delete(synchronize_session=False)

        # Idempotency / Telegram
        db.query(UserIdempotencyKey).filter(UserIdempotencyKey.user_id == user_id).delete(synchronize_session=False)
        db.query(TelegramLinkCode).filter(TelegramLinkCode.user_id == int(user_id)).delete(synchronize_session=False)

        # Telegram Unlink Requests (optional table)
        if TelegramUnlinkRequest is not None:
            from sqlalchemy import inspect
            inspector = inspect(db.bind)
            if inspector.has_table(TelegramUnlinkRequest.__tablename__):
                db.query(TelegramUnlinkRequest).filter(
                    (TelegramUnlinkRequest.current_user_id == user_id)
                    | (TelegramUnlinkRequest.requester_user_id == user_id)
                    | (TelegramUnlinkRequest.processed_by == user_id)
                ).delete(synchronize_session=False)
                if target_telegram_id is not None:
                    db.query(TelegramUnlinkRequest).filter(
                        TelegramUnlinkRequest.telegram_id == str(int(target_telegram_id))
                    ).delete(synchronize_session=False)

        # Admin Profile
        db.query(AdminUserProfile).filter(AdminUserProfile.user_id == user_id).delete(synchronize_session=False)

        # Finally, delete the V2User
        db.delete(v2_user)

        # Safety net: sqlite FK quirks
        db.query(TelegramLinkCode).filter(TelegramLinkCode.user_id == int(user_id)).delete(synchronize_session=False)
        db.query(UserGameWalletLedger).filter(UserGameWalletLedger.user_id == int(user_id)).delete(synchronize_session=False)

        V2AdminAuditService.log(
            db,
            admin_id=admin_id,
            action="PURGE_USER",
            target_type="User",
            target_id=str(user_id),
            before=before,
            after=None,
        )
        db.commit()
        logger.info(f"[V2] User {user_id} purged by admin {admin_id}")
