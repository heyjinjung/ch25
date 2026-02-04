"""Admin CRUD for CC deposit data.

V2 location (Source of Truth). Legacy import paths should re-export from here.
NOTE: Season Pass 연동 제거됨 (2026-01-26) - V2 정책: 단일 레벨 시스템만 사용
"""
from datetime import date, datetime, timedelta, timezone
import logging
from typing import Iterable

from fastapi import HTTPException, status
from sqlalchemy import delete, select, func
from sqlalchemy.orm import Session

from app.v2.models import ExternalRankingData
from app.v2.models import ExternalRankingDailyDepositDelta
from app.v2.models import UserActivity
from app.schemas.cc_deposit import CCDepositCreate, CCDepositUpdate
from app.v2.models.user import V2User
from app.v2.services.vault_service import V2VaultService
from app.v2.services.level_xp_service import V2LevelXPService
from app.core.config import get_settings


logger = logging.getLogger(__name__)


class V2AdminCCDepositService:
    """Manage CC deposit data rows (deposit amount, play count).
    
    Refactored for V2 standards.
    """

    STEP_AMOUNT = 100_000
    XP_PER_STEP = 20
    MAX_STEPS_PER_DAY = 50




    @staticmethod
    def _kst_today() -> date:
        try:
            from zoneinfo import ZoneInfo

            return datetime.now(ZoneInfo("Asia/Seoul")).date()
        except Exception:
            return datetime.utcnow().date()


    @staticmethod
    def _try_resolve_unique_user_id(
        db: Session,
        where_clause,
        *,
        ambiguous_detail: str,
    ) -> int | None:
        ids = db.execute(select(V2User.id).where(where_clause).limit(2)).scalars().all()
        if not ids:
            return None
        if len(ids) > 1:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=ambiguous_detail)
        return int(ids[0])

    @staticmethod
    def _resolve_user_id(
        db: Session,
        payload_user_id: int | None,
        external_id: str | None,
        telegram_username: str | None = None,
    ) -> int:
        if payload_user_id:
            return payload_user_id

        candidates: list[str] = []
        if external_id:
            candidates.append(external_id)
        if telegram_username:
            candidates.append(telegram_username)

        for raw in candidates:
            key = str(raw or "").strip()
            if not key:
                continue

            # 1) External ID / CC ID (case-insensitive exact)
            user_id = V2AdminCCDepositService._try_resolve_unique_user_id(
                db,
                func.lower(V2User.cc_id) == key.lower(),
                ambiguous_detail="USER_AMBIGUOUS (CC ID)",
            )
            if user_id is not None:
                return user_id

            # 2) Telegram username (case-insensitive exact, leading '@' allowed)
            clean_tg = key.lstrip("@").strip()
            if clean_tg:
                user_id = V2AdminCCDepositService._try_resolve_unique_user_id(
                    db,
                    func.lower(V2User.telegram_username) == clean_tg.lower(),
                    ambiguous_detail="USER_AMBIGUOUS (Telegram Username)",
                )
                if user_id is not None:
                    return user_id

            # 3) Internal nickname (case-insensitive exact)
            user_id = V2AdminCCDepositService._try_resolve_unique_user_id(
                db,
                func.lower(V2User.nickname) == key.lower(),
                ambiguous_detail="USER_AMBIGUOUS (Nickname)",
            )
            if user_id is not None:
                return user_id

        if candidates:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="USER_NOT_FOUND (External ID, Telegram Username, or Nickname)",
            )

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="USER_REQUIRED (ID, External ID, Telegram Username, or Nickname)",
        )

    @staticmethod
    def _merge_user_telegram_username(db: Session, user_id: int, telegram_username: str | None) -> None:
        if not telegram_username:
            return
        clean = telegram_username.strip().lstrip("@").strip()
        if not clean:
            return
        user = db.query(V2User).filter(V2User.id == user_id).first()
        if not user:
            return
        if user.telegram_username != clean:
            user.telegram_username = clean
            db.add(user)

    @staticmethod
    def list_all(db: Session) -> list[ExternalRankingData]:
        return db.execute(select(ExternalRankingData).order_by(ExternalRankingData.deposit_amount.desc())).scalars().all()

    @staticmethod
    def get_by_user(db: Session, user_id: int) -> ExternalRankingData:
        row = (
            db.execute(select(ExternalRankingData).where(ExternalRankingData.user_id == user_id))
            .scalars()
            .first()
        )
        if not row:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="CC_DEPOSIT_NOT_FOUND")
        return row

    @staticmethod
    def upsert_many(db: Session, data: Iterable[CCDepositCreate], now: datetime | None = None) -> list[ExternalRankingData]:
        from zoneinfo import ZoneInfo
        vault_service = V2VaultService()
        level_xp = V2LevelXPService()
        settings = get_settings()

        if now is None:
            now = datetime.utcnow()

        # Derive KST date from now (assumed UTC if naive) for baseline tracking
        kst = ZoneInfo(getattr(settings, "timezone", "Asia/Seoul"))
        now_tz = now.replace(tzinfo=timezone.utc) if now.tzinfo is None else now
        today = now_tz.astimezone(kst).date()
        step_amount = int(getattr(settings, "external_ranking_deposit_step_amount", V2AdminCCDepositService.STEP_AMOUNT))
        xp_per_step = int(getattr(settings, "external_ranking_deposit_xp_per_step", V2AdminCCDepositService.XP_PER_STEP))
        cooldown_minutes = max(settings.external_ranking_deposit_cooldown_minutes, 0)

        existing_by_user = {row.user_id: row for row in db.execute(select(ExternalRankingData)).scalars().all()}
        # Snapshot pre-update values per user to compute deltas correctly later
        prev_snapshot: dict[int, dict] = {
            row.user_id: {
                "deposit_amount": row.deposit_amount,
                "deposit_remainder": row.deposit_remainder or 0,
                "daily_base_deposit": row.daily_base_deposit or 0,
                "updated_at": row.updated_at,
            }
            for row in existing_by_user.values()
        }
        results: list[ExternalRankingData] = []

        for payload in data:
            user_id = V2AdminCCDepositService._resolve_user_id(
                db,
                payload.user_id,
                payload.cc_id,
                getattr(payload, "telegram_username", None),
            )
            V2AdminCCDepositService._merge_user_telegram_username(
                db,
                user_id,
                getattr(payload, "telegram_username", None),
            )
            row = existing_by_user.get(user_id)
            prev_deposit = row.deposit_amount if row else 0
            prev_play = row.play_count if row else 0

            # Daily baseline reset happens before overwriting with today's totals
            if row and row.last_daily_reset != today:
                row.daily_base_deposit = row.deposit_amount
                row.daily_base_play = row.play_count
                row.deposit_remainder = 0
                row.last_daily_reset = today

            if row:
                row.user_id = user_id
                row.deposit_amount = payload.deposit_amount
                row.play_count = payload.play_count
                row.memo = payload.memo
            else:
                row = ExternalRankingData(
                    user_id=user_id,
                    deposit_amount=payload.deposit_amount,
                    play_count=payload.play_count,
                    memo=payload.memo,
                    daily_base_deposit=0,
                    daily_base_play=0,
                    last_daily_reset=today,
                )
                db.add(row)
                existing_by_user[user_id] = row
            
            # V2 SoT: v2_user.total_charge_amount도 함께 업데이트
            v2_user = db.get(V2User, user_id)
            if v2_user:
                v2_user.total_charge_amount = payload.deposit_amount
            
            results.append(row)

        db.commit()
        for row in results:
            db.refresh(row)

        # Personalization hook: if deposit_amount increased (vs pre-update snapshot), treat as "charge" update.
        # We don't have per-transaction charge logs in this codebase; the best available timestamp is row.updated_at.
        deposit_delta_by_user: dict[int, int] = {}
        for row in results:
            snap = prev_snapshot.get(row.user_id, {"deposit_amount": 0})
            prev_amount = int(snap.get("deposit_amount") or 0)
            new_amount = int(row.deposit_amount or 0)
            if new_amount > prev_amount:
                deposit_delta = new_amount - prev_amount
                logger.info(
                    "cc_deposit increased: user_id=%s prev=%s new=%s delta=%s",
                    row.user_id,
                    prev_amount,
                    new_amount,
                    deposit_delta,
                )
                activity = db.query(UserActivity).filter(UserActivity.user_id == row.user_id).first()
                if not activity:
                    activity = UserActivity(user_id=row.user_id)
                    db.add(activity)
                activity.last_charge_at = row.updated_at

                deposit_delta_by_user[row.user_id] = deposit_delta_by_user.get(row.user_id, 0) + int(deposit_delta)

                # Vault unlock hook: deposit increase acts as "verification charge" trigger.
                # All deposit increases trigger signal.
                vault_service.handle_deposit_increase_signal(
                    db,
                    user_id=row.user_id,
                    deposit_delta=deposit_delta,
                    prev_amount=prev_amount,
                    new_amount=new_amount,
                    now=now,
                    commit=False,
                )
                logger.info(
                    "cc_deposit -> vault signal dispatched: user_id=%s prev=%s new=%s delta=%s",
                    row.user_id,
                    prev_amount,
                    new_amount,
                    deposit_delta,
                )

                # Whale Check (First 500k + 7D 3M累计)
                user = db.query(V2User).filter(V2User.id == row.user_id).first()
                if user:
                    V2AdminCCDepositService._check_whale_qualification(
                        db, user=user, current_external_total=new_amount, now=now
                    )

        # Record daily deposit deltas for operational KPIs (KST calendar date)
        if deposit_delta_by_user:
            kst_date = today
            existing = {
                r.user_id: r
                for r in db.execute(
                    select(ExternalRankingDailyDepositDelta).where(
                        ExternalRankingDailyDepositDelta.kst_date == kst_date,
                        ExternalRankingDailyDepositDelta.user_id.in_(list(deposit_delta_by_user.keys())),
                    )
                )
                .scalars()
                .all()
            }
            for user_id, delta in deposit_delta_by_user.items():
                row = existing.get(user_id)
                if row:
                    row.deposit_delta = int(row.deposit_delta or 0) + int(delta)
                    db.add(row)
                else:
                    db.add(
                        ExternalRankingDailyDepositDelta(
                            user_id=int(user_id),
                            kst_date=kst_date,
                            deposit_delta=int(delta),
                        )
                    )
        db.commit()

        # NOTE: Season Pass 로직 제거 (2026-01-26)
        # V2 정책: Season Pass 폐기, 단일 레벨 시스템(level_xp)만 사용
        # 아래 로직은 XP 적립만 수행 (이전 Season Pass 연동은 제거됨)

        for row in results:
            snap = prev_snapshot.get(
                row.user_id,
                {"deposit_amount": 0, "deposit_remainder": 0, "daily_base_deposit": 0, "updated_at": None},
            )

            baseline = max(snap.get("deposit_amount", 0), row.daily_base_deposit or 0)
            deposit_delta = max(row.deposit_amount - baseline, 0)
            total_for_step = snap.get("deposit_remainder", 0) + deposit_delta
            deposit_steps = total_for_step // step_amount
            remainder = total_for_step % step_amount

            if deposit_steps > 0 and cooldown_minutes > 0 and snap.get("updated_at"):
                if now - snap["updated_at"] < timedelta(minutes=cooldown_minutes):
                    row.deposit_remainder = remainder
                    continue

            if deposit_steps > 0 and xp_per_step > 0 and deposit_delta > 0:
                xp_to_add = deposit_steps * xp_per_step
                # V2 정책: level_xp.add_xp만 사용 (단일 레벨 시스템)
                level_xp.add_xp(
                    db,
                    user_id=row.user_id,
                    delta=xp_to_add,
                    source="CC_DEPOSIT",
                    meta={"deposit_steps": int(deposit_steps), "xp_per_step": int(xp_per_step), "deposit_delta": int(deposit_delta)},
                )

                # Mission progress update: CC_DEPOSIT 미션 진행 업데이트
                # deposit_steps 단위로 미션 카운트 (입금 횟수 기준)
                try:
                    from app.v2.services.mission_service import V2MissionService
                    mission_service = V2MissionService(db)
                    mission_service.update_progress(
                        user_id=row.user_id,
                        action_type="CC_DEPOSIT",
                        delta=1  # 입금 1회로 카운트
                    )
                    logger.info(
                        "cc_deposit -> mission progress updated: user_id=%s action=CC_DEPOSIT delta=1",
                        row.user_id
                    )
                except Exception as e:
                    logger.warning(
                        "cc_deposit -> mission progress update failed: user_id=%s error=%s",
                        row.user_id,
                        str(e)
                    )

            row.deposit_remainder = remainder

        # XP 적립 후 DB 커밋 (User.level 동기화 포함)
        db.commit()

        # NOTE: Weekly TOP10 Stamp 로직 제거 (2026-01-26)
        # Season Pass 폐기로 인해 TOP10 스탬프 기능도 함께 제거
        # 필요 시 별도 보상 시스템으로 대체 예정

        return results

    @staticmethod
    def update(db: Session, user_id: int, payload: CCDepositUpdate) -> ExternalRankingData:
        row = V2AdminCCDepositService.get_by_user(db, user_id)
        data = payload.model_dump(exclude_unset=True)
        if ("cc_id" in data) or ("telegram_username" in data):
            row.user_id = V2AdminCCDepositService._resolve_user_id(
                db,
                None,
                data.get("cc_id"),
                data.get("telegram_username"),
            )
            V2AdminCCDepositService._merge_user_telegram_username(db, row.user_id, data.get("telegram_username"))
        for key, value in data.items():
            if key == "cc_id":
                continue
            if key == "telegram_username":
                continue
            setattr(row, key, value)
        db.add(row)
        db.commit()
        db.refresh(row)
        return row

    @staticmethod
    def delete(db: Session, user_id: int) -> None:
        result = db.execute(delete(ExternalRankingData).where(ExternalRankingData.user_id == user_id))
        if result.rowcount == 0:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="CC_DEPOSIT_NOT_FOUND")
        db.commit()

    @staticmethod
    def _check_whale_qualification(db: Session, *, user: V2User, current_external_total: int, now: datetime):
        from app.core.notifications import send_ops_notification
        from app.v2.models import AdminUserProfile

        # 1. Capture First Deposit (CC)
        if not user.first_deposit_at:
            user.first_deposit_at = now
            user.first_deposit_amount = current_external_total
            db.add(user)
        
        # 2. Whale Qualification Logic
        is_big_start = (user.first_deposit_amount or 0) >= 500_000
        days_diff = (now.date() - user.first_deposit_at.date()).days
        is_high_roller = (days_diff <= 7) and (current_external_total >= 3_000_000)

        if is_big_start and is_high_roller:
            profile = db.query(AdminUserProfile).filter(AdminUserProfile.user_id == user.id).first()
            if not profile:
                profile = AdminUserProfile(user_id=user.id)
                db.add(profile)
            
            tags = list(profile.tags or [])
            if "#WHALE_REWARDED" not in tags:
                # Reward: +500 XP
                from app.v2.services.season_pass_service import V2SeasonPassService
                V2SeasonPassService().add_bonus_xp(db, user_id=user.id, xp_amount=500, now=now, commit=False)
                
                tags.append("#WHALE_REWARDED")
                profile.tags = tags
                db.add(profile)
                
                msg = (
                    f"🐋 **CC Deposit Whale Detected!**\n"
                    f"- UserID: `{user.id}` (Nickname: `{user.nickname or user.external_id}`)\n"
                    f"- First CC Deposit: `{user.first_deposit_amount or 0:,}원`\n"
                    f"- Current Total: `{current_external_total:,}원`\n"
                    f"- Action: VIP 라운지 케어 필요 (+500 XP 지급됨)"
                )
                send_ops_notification(msg, channel="admin")


class AdminExternalRankingService(V2AdminCCDepositService):
    "Backward-compatible alias."
    pass
