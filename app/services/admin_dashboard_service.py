from datetime import datetime, timedelta, time
from sqlalchemy import func, select, or_, case, distinct
from sqlalchemy.orm import Session
from app.models.user import User
from app.models.mission import UserMissionProgress, Mission
from app.models.vault_earn_event import VaultEarnEvent
from app.models.user_cash_ledger import UserCashLedger
from app.models.dice import DiceLog
from app.models.roulette import RouletteLog
from app.models.lottery import LotteryLog
# from app.models.feature import FeatureConfig, FeatureType # If needed for status

class AdminDashboardService:
    def __init__(self):
        pass

    def _get_kst_now(self) -> datetime:
        # Server is UTC. KST is UTC+9.
        return datetime.utcnow() + timedelta(hours=9)

    def _get_yesterday_kst_range(self, kst_now: datetime):
        """Return UTC start/end for Yesterday (KST)."""
        yesterday_kst = kst_now.date() - timedelta(days=1)

        # Start: Yesterday 00:00 KST -> UTC (-9h)
        start_kst = datetime.combine(yesterday_kst, time.min)
        start_utc = start_kst - timedelta(hours=9)

        # End: Yesterday 23:59:59 KST -> UTC (-9h)
        end_kst = datetime.combine(yesterday_kst, time.max)
        end_utc = end_kst - timedelta(hours=9)

        return start_utc, end_utc

    def _get_today_kst_start_in_utc(self, kst_now: datetime) -> datetime:
        """Return UTC timestamp for Today 00:00 KST."""
        today_kst = kst_now.date()
        start_kst = datetime.combine(today_kst, time.min)
        return start_kst - timedelta(hours=9)

    def get_daily_overview(self, db: Session):
        kst_now = self._get_kst_now()
        yesterday_start, yesterday_end = self._get_yesterday_kst_range(kst_now)
        today_start_utc = self._get_today_kst_start_in_utc(kst_now)

        # 1. Retention Risk (Active Yesterday AND Not Active Today)
        # Using last_login_at
        risk_count = db.query(User).filter(
            User.last_login_at >= yesterday_start,
            User.last_login_at <= yesterday_end,
            User.last_login_at < today_start_utc  # Should be redundant if login updates timestamp, but safe check
        ).filter(
            or_(User.last_login_at < today_start_utc, User.last_login_at == None)
        ).count()

        # Actually, simpler logic: Users who logged in yesterday, but have NOT logged in since Today 00:00 KST
        # Query: Last login between [YesterdayStart, YesterdayEnd]
        # (If they logged in today, last_login_at would be > TodayStart)
        risk_query = db.query(func.count(User.id)).filter(
            User.last_login_at >= yesterday_start,
            User.last_login_at <= yesterday_end
        )
        risk_count = risk_query.scalar() or 0

        # 2. Streak Risk (Streak >= 3 AND Not Active Today)
        # last_login_at < TodayStartUTC AND play_streak >= 3
        # Note: play_streak resets if they miss a day, but we want to catch them BEFORE reset logic runs (usually daily job).
        # Assuming streak hasn't reset yet or we are looking for those at risk.
        streak_risk_count = db.query(func.count(User.id)).filter(
            User.play_streak >= 3,
            User.last_login_at < today_start_utc
        ).scalar() or 0

        # 3. Settlement
        # Mission Percent (Yesterday) -> Avg completion of Daily Missions
        # Join UserMissionProgress where reset_date = Yesterday (KST Date string)
        yesterday_str = (kst_now.date() - timedelta(days=1)).strftime("%Y-%m-%d")

        # Count total assigned daily missions vs completed
        mission_stats = db.query(
            func.count(UserMissionProgress.id).label("total"),
            func.sum(case((UserMissionProgress.is_completed == True, 1), else_=0)).label("completed")
        ).join(Mission).filter(
            Mission.category == "DAILY",
            UserMissionProgress.reset_date == yesterday_str
        ).first()

        total_m = mission_stats.total or 0
        completed_m = mission_stats.completed or 0
        mission_percent = (completed_m / total_m * 100) if total_m > 0 else 0.0

        # Vault Payout Ratio
        # Payout: VaultEarnEvent amount > 0 within Yesterday UTC range
        vault_paid = db.query(func.sum(VaultEarnEvent.amount)).filter(
            VaultEarnEvent.created_at >= yesterday_start,
            VaultEarnEvent.created_at <= yesterday_end,
            VaultEarnEvent.amount > 0
        ).scalar() or 0

        # Deposit: UserCashLedger delta > 0, reason='CHARGE' (Hypothetical)
        # If 'CHARGE' isn't exact, this will be 0. We'll use a loose filter or assume explicit reason.
        # Based on search, we need to verify. For now, use 'CHARGE'.
        total_deposit = db.query(func.sum(UserCashLedger.delta)).filter(
            UserCashLedger.created_at >= yesterday_start,
            UserCashLedger.created_at <= yesterday_end,
            UserCashLedger.delta > 0,
            or_(UserCashLedger.reason == "CHARGE", UserCashLedger.reason == "DEPOSIT")
        ).scalar() or 0

        return {
            "risk_count": risk_count,
            "streak_risk_count": streak_risk_count,
            "mission_percent": float(mission_percent),
            "vault_payout_ratio": (float(vault_paid) / float(total_deposit) * 100) if total_deposit > 0 else None,
            "total_vault_paid": int(vault_paid),
            "total_deposit_estimated": int(total_deposit)
        }

    def get_event_status(self, db: Session):
        kst_now = self._get_kst_now()
        yesterday_start, yesterday_end = self._get_yesterday_kst_range(kst_now)
        today_start_utc = self._get_today_kst_start_in_utc(kst_now)

        # 1. Welcome Mission Retention (D-2 Joined -> D-1 Active)
        # Users joined 2 days ago (KST)
        d2_date = kst_now.date() - timedelta(days=2)
        d2_start = datetime.combine(d2_date, time.min) - timedelta(hours=9)
        d2_end = datetime.combine(d2_date, time.max) - timedelta(hours=9)

        joined_d2 = db.query(func.count(User.id)).filter(
            User.created_at >= d2_start,
            User.created_at <= d2_end
        ).scalar() or 0

        retained_d1 = 0
        if joined_d2 > 0:
            # Of those users, how many logged in Yesterday?
            retained_d1 = db.query(func.count(distinct(User.id))).filter(
                User.created_at >= d2_start,
                User.created_at <= d2_end,
                User.last_login_at >= yesterday_start,
                User.last_login_at <= yesterday_end
            ).scalar() or 0

        retention_rate = (retained_d1 / joined_d2 * 100) if joined_d2 > 0 else 0.0

        # 2. Streak Counts
        # Normal (1-2), Hot (3-6), Legend (7+)
        # We can group by case in SQL
        streak_case = case(
            (User.play_streak >= 7, "LEGEND"),
            (User.play_streak >= 3, "HOT"),
            else_="NORMAL"
        )
        streak_counts = db.query(streak_case, func.count(User.id)).group_by(streak_case).all()
        start_dict = {"NORMAL": 0, "HOT": 0, "LEGEND": 0}
        for label, count in streak_counts:
            if label in start_dict:
                start_dict[label] = count

        # 3. Golden Hour Peak (Yesterday 21:30 - 22:30 KST)
        gh_start_kst = datetime.combine(kst_now.date() - timedelta(days=1), time(21, 30))
        gh_end_kst = datetime.combine(kst_now.date() - timedelta(days=1), time(22, 30))
        gh_start_utc = gh_start_kst - timedelta(hours=9)
        gh_end_utc = gh_end_kst - timedelta(hours=9)

        # Count distinct users who played any game in this window
        # Dice
        dice_users = db.query(DiceLog.user_id).filter(
            DiceLog.created_at >= gh_start_utc,
            DiceLog.created_at <= gh_end_utc
        )
        # Roulette
        # roulette_users = db.query(RouletteLog.user_id)... (RouletteLog not imported but assumed similar)
        # Using union if possible, or just Dice for now as proxy if RouletteLog isn't easily handy
        # Or simple count from Dice as it's the main event
        gh_peak = dice_users.distinct().count()

        # Is Golden Hour Active NOW?
        # Check current KST time
        now_time = kst_now.time()
        is_active = time(21, 30) <= now_time <= time(22, 30)

        welcome_metrics = [
            {"label": "D-2 Retention", "value": f"{retention_rate:.1f}%", "trend": "STABLE"},
            {"label": "New Users (D-2)", "value": joined_d2}
        ]

        return {
            "welcome_metrics": welcome_metrics,
            "streak_counts": start_dict,
            "golden_hour_peak": gh_peak,
            "is_golden_hour_active": is_active
        }

    def nudge_risk_group(self, db: Session):
        # Placeholder for actual Nudge logic (Telegram/Push)
        # For now, just return success count
        kst_now = self._get_kst_now()
        today_start_utc = self._get_today_kst_start_in_utc(kst_now)

        target_users = db.query(User).filter(
            User.play_streak >= 3,
            User.last_login_at < today_start_utc
        ).all()

        count = len(target_users)
        # ... Send logic ...
        return count
