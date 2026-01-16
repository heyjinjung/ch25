from __future__ import annotations

from datetime import datetime, timedelta, timezone, time
from zoneinfo import ZoneInfo
from typing import Optional

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models.feature import UserEventLog
from app.models.user import User
from app.models.season_pass import SeasonPassLevel, SeasonPassProgress
from app.models.user_activity import UserActivity
from app.models.vault_earn_event import VaultEarnEvent
from app.models.vault_ledger import VaultLedger
from app.services.notification_service import NotificationService
from app.services.season_pass_service import SeasonPassService
from app.services.vault_service import VaultService


class NudgeService:
    def __init__(self, db: Session):
        self.db = db
        self.settings = get_settings()
        self.notifier = NotificationService()
        self.tz = ZoneInfo(getattr(self.settings, "timezone", "Asia/Seoul"))

    # ---------- utilities ----------
    def _operational_play_date(self, now_kst: datetime) -> datetime.date:
        reset_hour_raw = getattr(self.settings, "streak_day_reset_hour_kst", 9)
        reset_hour = 9 if reset_hour_raw is None else int(reset_hour_raw)
        if now_kst.hour < reset_hour:
            return (now_kst.date() - timedelta(days=1))
        return now_kst.date()

    def _hours_to_reset(self, now_kst: datetime) -> float:
        reset_hour_raw = getattr(self.settings, "streak_day_reset_hour_kst", 9)
        reset_hour = 9 if reset_hour_raw is None else int(reset_hour_raw)
        today_reset = datetime.combine(now_kst.date(), time(hour=reset_hour, tzinfo=self.tz))
        if now_kst >= today_reset:
            today_reset += timedelta(days=1)
        delta = today_reset - now_kst
        return delta.total_seconds() / 3600

    def _has_nudged(self, user_id: int, event_name: str, period_key: str) -> bool:
        return (
            self.db.query(UserEventLog)
            .filter(
                UserEventLog.user_id == user_id,
                UserEventLog.event_name == event_name,
                UserEventLog.meta_json["period_key"].as_string() == period_key,
            )
            .first()
            is not None
        )

    def _mark_nudged(self, user_id: int, event_name: str, period_key: str, meta: Optional[dict] = None) -> None:
        meta_payload = meta.copy() if meta else {}
        meta_payload["period_key"] = period_key
        self.db.add(
            UserEventLog(
                user_id=user_id,
                feature_type="NUDGE",
                event_name=event_name,
                meta_json=meta_payload,
            )
        )
        self.db.commit()

    # ---------- nudge scenarios ----------
    def nudge_streak_pre_reset(self, user: User, now_kst: datetime) -> bool:
        if not user.telegram_id:
            return False

        op_day = self._operational_play_date(now_kst)
        hours_left = self._hours_to_reset(now_kst)
        if not (3.0 <= hours_left <= 4.0):
            return False

        last_play = getattr(user, "last_play_date", None)
        if last_play == op_day:
            return False  # 이미 오늘 플레이함

        streak_days = int(getattr(user, "play_streak", 0) or 0)
        if streak_days <= 0:
            return False

        period_key = op_day.isoformat()
        event_name = "nudge.streak.pre_reset"
        if self._has_nudged(user.id, event_name, period_key):
            return False

        text = (
            f"🔥 <b>연승을 이어가세요!</b>\n\n"
            f"오늘 아직 플레이하지 않았습니다.\n"
            f"현재 연속 {streak_days}일, 리셋까지 약 {hours_left:.1f}시간 남았어요.\n"
            f"연승 유지까지 한 판! 놓치면 기록이 초기화돼요."
        )
        self.notifier.send_text_sync(chat_id=int(user.telegram_id), text=text)
        self._mark_nudged(user.id, event_name, period_key, {"streak_days": streak_days, "hours_left": hours_left})
        return True

    def nudge_season_final_push(self, user: User, now_kst: datetime) -> bool:
        if not user.telegram_id:
            return False

        svc = SeasonPassService()
        season = svc.get_current_season(self.db, now_kst)
        if not season:
            return False

        end_dt = datetime.combine(season.end_date, time(23, 59, 59, tzinfo=self.tz))
        hours_left = (end_dt - now_kst).total_seconds() / 3600
        if hours_left > 24 or hours_left <= 0:
            return False

        status = svc.get_status(self.db, user_id=user.id, now=now_kst)
        progress = status.get("progress", {})
        levels = status.get("levels", [])
        current_xp = int(progress.get("current_xp", 0) or 0)
        next_req = int(progress.get("next_level_xp", 0) or 0)
        max_level = int(status.get("season", {}).get("max_level", 0) or 0)
        current_level = int(progress.get("current_level", 1) or 1)

        if next_req <= current_xp or current_level >= max_level:
            return False

        remaining = next_req - current_xp
        ratio = current_xp / next_req if next_req else 0
        if ratio < 0.9:
            return False

        period_key = f"season:{season.id}"
        event_name = "nudge.season.final_push"
        if self._has_nudged(user.id, event_name, period_key):
            return False

        text = (
            f"⏳ <b>시즌 종료 임박!</b>\n\n"
            f"다음 레벨까지 {remaining} XP 남았습니다.\n"
            f"시즌 배지까지 한 단계! 마감 전 도전하세요."
        )
        self.notifier.send_text_sync(chat_id=int(user.telegram_id), text=text)
        self._mark_nudged(user.id, event_name, period_key, {"remaining_xp": remaining, "hours_left": hours_left})
        return True

    def nudge_vault_withdraw_ready(self, user: User, now_utc: datetime) -> bool:
        if not user.telegram_id:
            return False

        now = now_utc if now_utc.tzinfo else now_utc.replace(tzinfo=timezone.utc)
        today = now.date()

        # Balance/availability check
        vs = VaultService()
        reserved = vs.get_withdrawal_reserved_amount(db=self.db, user_id=user.id)
        total = int(getattr(user, "vault_locked_balance", 0) or 0)
        available = max(total - reserved, 0)
        if available < 10_000:
            return False

        # Withdrawal conditions
        from app.models.user_activity import UserActivity

        activity = self.db.query(UserActivity).filter(UserActivity.user_id == user.id).first()
        deposit_today = bool(activity and activity.last_charge_at and activity.last_charge_at.date() == today)

        three_days_ago = now - timedelta(days=3)
        recent_play_count = (
            self.db.query(func.count(VaultEarnEvent.id))
            .filter(
                VaultEarnEvent.user_id == user.id,
                VaultEarnEvent.earn_type == "GAME_PLAY",
                VaultEarnEvent.created_at >= three_days_ago,
            )
            .scalar()
            or 0
        )
        play_ok = recent_play_count >= 30

        today_start = datetime(now.year, now.month, now.day, tzinfo=timezone.utc)
        spend_today_neg = (
            self.db.query(func.sum(VaultLedger.amount))
            .filter(
                VaultLedger.user_id == user.id,
                VaultLedger.amount < 0,
                VaultLedger.created_at >= today_start,
            )
            .scalar()
            or 0
        )
        spend_today = abs(spend_today_neg)
        spend_ok = spend_today >= 10_000

        missing = []
        if not deposit_today:
            missing.append("입금")
        if not play_ok:
            missing.append("플레이 30회(3일)")
        if not spend_ok:
            missing.append("당일 소비 1만원")

        if len(missing) != 1:
            return False

        period_key = today.isoformat()
        event_name = "nudge.vault.withdraw_ready"
        if self._has_nudged(user.id, event_name, period_key):
            return False

        missing_text = missing[0]
        text = (
            f"💰 <b>출금 준비 완료까지 1단계!</b>\n\n"
            f"남은 요건: {missing_text}\n"
            f"요건 충족 후 바로 출금 신청 가능합니다."
        )
        self.notifier.send_text_sync(chat_id=int(user.telegram_id), text=text)
        self._mark_nudged(
            user.id,
            event_name,
            period_key,
            {"available": available, "missing": missing_text, "plays_3d": recent_play_count, "spend_today": spend_today},
        )
        return True

    # ---------- entry point ----------
    def run_all_for_user(self, user: User, now: Optional[datetime] = None) -> dict:
        now_dt = now or datetime.utcnow()
        now_kst = now_dt.astimezone(self.tz if now_dt.tzinfo else self.tz)

        results = {
            "streak": False,
            "season": False,
            "vault": False,
        }

        try:
            results["streak"] = self.nudge_streak_pre_reset(user, now_kst)
        except Exception:
            pass

        try:
            results["season"] = self.nudge_season_final_push(user, now_kst)
        except Exception:
            pass

        try:
            results["vault"] = self.nudge_vault_withdraw_ready(user, now_dt)
        except Exception:
            pass

        return results

    def run_all(self, users: Optional[list[User]] = None, now: Optional[datetime] = None) -> dict:
        now_dt = now or datetime.utcnow()
        if users is None:
            users = self.db.query(User).filter(User.telegram_id.isnot(None)).all()
        summary = {"streak": 0, "season": 0, "vault": 0}
        for u in users:
            res = self.run_all_for_user(u, now=now_dt)
            for k, v in res.items():
                if v:
                    summary[k] += 1
        return summary
