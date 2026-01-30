"""Service layer for ops target list (crisis scenarios) module.

Based on spec: docs/06_ops/202601/20260113_ops_crisis_scenarios_spec.md
Implements 11 crisis scenarios detection and target list CRUD.
"""

from __future__ import annotations

from datetime import datetime, timedelta, date
from typing import Any, Dict, List, Optional, Tuple

from fastapi import HTTPException, status
from sqlalchemy import func, select, text
from sqlalchemy.orm import Session

from app.models.ops_plan import OpsPlan
from app.models.ops_target import OpsTargetList, OpsTargetMember
from app.v2.models.user import V2User
from app.models.external_ranking_daily_deposit_delta import ExternalRankingDailyDepositDelta
from app.models.external_ranking import ExternalRankingData
from app.models.feature import UserEventLog
from app.models.game_wallet import GameTokenType, UserGameWallet
from app.models.user_activity import UserActivity
from app.models.dice import DiceLog
from app.models.roulette import RouletteLog
from app.models.lottery import LotteryLog


# Scenario definitions
SCENARIOS = [
    {"id": "SCENARIO_01", "name": "불운한 뉴비", "level": "HIGH"},
    {"id": "SCENARIO_02", "name": "작심일일", "level": "MEDIUM"},
    {"id": "SCENARIO_03", "name": "아이쇼핑족", "level": "MEDIUM"},
    {"id": "SCENARIO_04", "name": "잠자는 금고 주인", "level": "HIGH"},
    {"id": "SCENARIO_05", "name": "돌아선 단골", "level": "HIGH"},
    {"id": "SCENARIO_06", "name": "끊긴 스트릭", "level": "MEDIUM"},
    {"id": "SCENARIO_07", "name": "정체된 등반가", "level": "MEDIUM"},
    {"id": "SCENARIO_08", "name": "지루해진 VIP", "level": "HIGH"},
    {"id": "SCENARIO_09", "name": "분노의 배팅러", "level": "HIGH"},
    {"id": "SCENARIO_10", "name": "체리피커 경고", "level": "LOW"},
    {"id": "SCENARIO_11", "name": "외부 VIP 대우", "level": "SPECIAL"},
]


class OpsTargetService:
    """Service for crisis scenario detection and target list management."""

    def __init__(self) -> None:
        self.now = datetime.utcnow

    # ========== Scenario Detection ==========

    def get_scenario_stats(self, db: Session) -> List[Dict[str, Any]]:
        """Get counts for all 11 crisis scenarios for dashboard radar."""
        results = []
        for scenario in SCENARIOS:
            count = self._get_scenario_count(db, scenario["id"])
            
            # Fetch sample users (nicknames)
            try:
                users = self.get_scenario_users(db, scenario["id"], limit=5)
                samples = [str(u["nickname"]) for u in users if u.get("nickname")]
            except Exception:
                samples = []

            results.append({
                "id": scenario["id"],
                "name": scenario["name"],
                "count": count,
                "level": scenario["level"],
                "samples": samples,
            })
        return results

    def _get_scenario_count(self, db: Session, scenario_id: str) -> int:
        """Get count for a specific scenario."""
        try:
            if scenario_id == "SCENARIO_01":
                count = self._count_scenario_01(db)
            elif scenario_id == "SCENARIO_02":
                count = self._count_scenario_02(db)
            elif scenario_id == "SCENARIO_03":
                count = self._count_scenario_03(db)
            elif scenario_id == "SCENARIO_04":
                count = self._count_scenario_04(db)
            elif scenario_id == "SCENARIO_05":
                count = self._count_scenario_05(db)
            elif scenario_id == "SCENARIO_06":
                count = self._count_scenario_06(db)
            elif scenario_id == "SCENARIO_07":
                count = self._count_scenario_07(db)
            elif scenario_id == "SCENARIO_08":
                count = self._count_scenario_08(db)
            elif scenario_id == "SCENARIO_09":
                count = self._count_scenario_09(db)
            elif scenario_id == "SCENARIO_10":
                count = self._count_scenario_10(db)
            elif scenario_id == "SCENARIO_11":
                count = self._count_scenario_11(db)
            else:
                count = 0

            if count > 0:
                return count

            # Fallback to latest target list count (recent detection/import)
            return self._get_latest_target_list_count(db, scenario_id=scenario_id)
        except Exception:
            return self._get_latest_target_list_count(db, scenario_id=scenario_id)

    def _get_latest_target_list_count(self, db: Session, *, scenario_id: str) -> int:
        """Fallback: use latest target list count for the scenario."""
        try:
            scenario_json = func.json_extract(OpsTargetList.source_params, "$.scenario_id")
            query = (
                select(func.coalesce(func.max(OpsTargetList.count_snapshot), 0))
                .where(
                    OpsTargetList.source_type == "SCENARIO",
                    scenario_json == scenario_id,
                )
            )
            return int(db.execute(query).scalar() or 0)
        except Exception:
            return 0

    def _subquery_deposit_sum(self, cutoff_date: date) -> Any:
        """Return subquery of deposit sum per user since cutoff_date (ExternalRankingDailyDepositDelta)."""
        return (
            select(
                ExternalRankingDailyDepositDelta.user_id.label("user_id"),
                func.coalesce(func.sum(ExternalRankingDailyDepositDelta.deposit_delta), 0).label("deposit_sum"),
            )
            .where(ExternalRankingDailyDepositDelta.kst_date >= cutoff_date)
            .group_by(ExternalRankingDailyDepositDelta.user_id)
            .subquery()
        )

    def _count_scenario_01(self, db: Session) -> int:
        """Scenario 1: Unlucky Newbie - Joined 24h, 10+ plays, 0 balance."""
        cutoff = self.now() - timedelta(days=1)
        
        # [PATCH 2026-01-17] Use internal logs for play_count (UserActivity is unreliable for Dice/Lottery)
        dice_count = select(func.count(DiceLog.id)).where(DiceLog.user_id == V2User.id).scalar_subquery()
        roulette_count = select(func.count(RouletteLog.id)).where(RouletteLog.user_id == V2User.id).scalar_subquery()
        lottery_count = select(func.count(LotteryLog.id)).where(LotteryLog.user_id == V2User.id).scalar_subquery()

        plays_total = (
            func.coalesce(dice_count, 0)
            + func.coalesce(roulette_count, 0) 
            + func.coalesce(lottery_count, 0)
        )
        
        query = (
            select(func.count(V2User.id))
            .select_from(V2User)
            .where(
                V2User.created_at >= cutoff,
                V2User.vault_locked_balance == 0,
                plays_total >= 10,
            )
        )
        result = db.execute(query).scalar() or 0
        return result

    def _count_scenario_02(self, db: Session) -> int:
        """Scenario 2: One-Day Tester - Played on D0, inactive on D+1, no deposit."""
        now = self.now()
        start = now - timedelta(days=2)
        end = now - timedelta(days=1)

        # [PATCH 2026-01-17] Use internal logs
        dice_count = select(func.count(DiceLog.id)).where(DiceLog.user_id == V2User.id).scalar_subquery()
        roulette_count = select(func.count(RouletteLog.id)).where(RouletteLog.user_id == V2User.id).scalar_subquery()
        lottery_count = select(func.count(LotteryLog.id)).where(LotteryLog.user_id == V2User.id).scalar_subquery()

        plays_total = (
            func.coalesce(dice_count, 0)
            + func.coalesce(roulette_count, 0) 
            + func.coalesce(lottery_count, 0)
        )

        query = (
            select(func.count(V2User.id))
            .select_from(V2User)
            .where(
                V2User.created_at >= start,
                V2User.created_at < end,
                V2User.total_charge_amount <= 0,
                # Played at least once on day0 (total plays >= 1 for new user)
                plays_total >= 1,
                # No login after D0
                V2User.last_login_at < end,
            )
        )
        return int(db.execute(query).scalar() or 0)

    def _count_scenario_03(self, db: Session) -> int:
        """Scenario 3: Window Shopper - free tickets exhausted, no deposit."""
        ticket_types = [
            GameTokenType.ROULETTE_COIN,
            GameTokenType.DICE_TOKEN,
            GameTokenType.LOTTERY_TICKET,
            GameTokenType.TRIAL_TOKEN,
        ]
        wallet_sub = (
            select(
                UserGameWallet.user_id,
                func.coalesce(func.sum(UserGameWallet.balance), 0).label("ticket_balance"),
            )
            .where(UserGameWallet.token_type.in_(ticket_types))
            .group_by(UserGameWallet.user_id)
            .subquery()
        )
        ticket_balance = func.coalesce(wallet_sub.c.ticket_balance, 0)
        query = (
            select(func.count(V2User.id))
            .select_from(V2User)
            .outerjoin(wallet_sub, wallet_sub.c.user_id == V2User.id)
            .where(
                V2User.total_charge_amount <= 0,
                ticket_balance <= 0,
            )
        )
        result = db.execute(query).scalar() or 0
        return result

    def _count_scenario_04(self, db: Session) -> int:
        """Scenario 4: Sleeping Vault - 7+ days inactive, balance > 10000."""
        cutoff = self.now() - timedelta(days=7)
        query = select(func.count(V2User.id)).where(
            V2User.last_login_at < cutoff,
            V2User.vault_locked_balance > 10000,
        )
        result = db.execute(query).scalar() or 0
        return result

    def _count_scenario_05(self, db: Session) -> int:
        """Scenario 5: Turning Regular - 30d active but 10d inactive."""
        now = self.now()
        active_cutoff = now - timedelta(days=30)
        inactive_cutoff = now - timedelta(days=10)
        login_sub = (
            select(
                UserEventLog.user_id,
                func.count(UserEventLog.id).label("login_count"),
            )
            .where(
                UserEventLog.event_name == "AUTH_LOGIN",
                UserEventLog.created_at >= active_cutoff,
            )
            .group_by(UserEventLog.user_id)
            .subquery()
        )
        query = (
            select(func.count(V2User.id))
            .select_from(V2User)
            .join(login_sub, login_sub.c.user_id == V2User.id)
            .where(
                login_sub.c.login_count >= 15,
                V2User.last_login_at.isnot(None),
                V2User.last_login_at < inactive_cutoff,
            )
        )
        result = db.execute(query).scalar() or 0
        return result

    def _count_scenario_06(self, db: Session) -> int:
        """Scenario 6: Broken Streak - had streak, now 72h inactive."""
        cutoff = self.now() - timedelta(hours=72)
        query = (
            select(func.count(V2User.id))
            .select_from(V2User)
            .where(
                V2User.login_streak >= 3,
                V2User.last_streak_updated_at.isnot(None),
                V2User.last_streak_updated_at < cutoff,
                V2User.last_login_at.isnot(None),
                V2User.last_login_at < cutoff,
            )
        )
        return int(db.execute(query).scalar() or 0)

    def _count_scenario_07(self, db: Session) -> int:
        """Scenario 7: Stuck Climber - mid-level, no progress 48h."""
        cutoff = self.now() - timedelta(hours=48)
        query = (
            select(func.count(V2User.id))
            .select_from(V2User)
            .where(
                V2User.level.between(4, 5),
                V2User.last_play_date.isnot(None),
                V2User.last_play_date < cutoff.date(),
                V2User.last_login_at.isnot(None),
                V2User.last_login_at >= cutoff - timedelta(days=2),  # still around recently
            )
        )
        return int(db.execute(query).scalar() or 0)

    def _count_scenario_08(self, db: Session) -> int:
        """Scenario 8: Bored VIP - high value, activity drop."""
        cutoff_play = self.now() - timedelta(hours=72)
        cutoff_deposit = self.now() - timedelta(days=7)
        cutoff_date = cutoff_deposit.date()
        deposit_sub = self._subquery_deposit_sum(cutoff_date)

        query = (
            select(func.count(V2User.id))
            .select_from(V2User)
            .join(deposit_sub, deposit_sub.c.user_id == V2User.id, isouter=True)
            .where(
                V2User.total_charge_amount >= 1_000_000,
                V2User.last_play_date.isnot(None),
                V2User.last_play_date < cutoff_play.date(),
                V2User.last_login_at.isnot(None),
                V2User.last_login_at < cutoff_play,
                V2User.first_deposit_at.isnot(None),
                deposit_sub.c.deposit_sum <= 0,  # 최근 7일 입금 없음/감소
            )
        )
        return int(db.execute(query).scalar() or 0)

    def _count_scenario_09(self, db: Session) -> int:
        """Scenario 9: Tilting Player - fallback to 0 (use target list fallback)."""
        return 0

    def _count_scenario_10(self, db: Session) -> int:
        """Scenario 10: Bonus Hunter - no deposits, collects rewards."""
        cutoff = self.now() - timedelta(days=7)
        cutoff_date = cutoff.date()
        deposit_sub = self._subquery_deposit_sum(cutoff_date)
        query = (
            select(func.count(V2User.id))
            .select_from(V2User)
            .join(deposit_sub, deposit_sub.c.user_id == V2User.id, isouter=True)
            .where(
                func.coalesce(deposit_sub.c.deposit_sum, 0) <= 0,
                V2User.last_free_ticket_claimed_at.isnot(None),
                V2User.last_free_ticket_claimed_at >= cutoff,
            )
        )
        return int(db.execute(query).scalar() or 0)

    def _count_scenario_11(self, db: Session) -> int:
        """Scenario 11: External VIP - External deposit 1M+, recent update."""
        cutoff = self.now() - timedelta(days=7)
        query = select(func.count(ExternalRankingData.id)).where(
            ExternalRankingData.deposit_amount >= 1000000,
            ExternalRankingData.updated_at >= cutoff,
            ExternalRankingData.user_id.isnot(None),
        )
        result = db.execute(query).scalar() or 0
        return result

    def get_scenario_users(
        self,
        db: Session,
        scenario_id: str,
        limit: int = 100,
        options: Optional[Dict[str, Any]] = None,
    ) -> List[Dict[str, Any]]:
        """Get users matching a specific scenario."""
        if scenario_id == "SCENARIO_01":
            return self._get_scenario_01_users(db, limit, options=options)
        elif scenario_id == "SCENARIO_02":
            return self._get_scenario_02_users(db, limit)
        elif scenario_id == "SCENARIO_03":
            return self._get_scenario_03_users(db, limit, options=options)
        elif scenario_id == "SCENARIO_04":
            return self._get_scenario_04_users(db, limit)
        elif scenario_id == "SCENARIO_05":
            return self._get_scenario_05_users(db, limit, options=options)
        elif scenario_id == "SCENARIO_06":
            return self._get_scenario_06_users(db, limit)
        elif scenario_id == "SCENARIO_07":
            return self._get_scenario_07_users(db, limit)
        elif scenario_id == "SCENARIO_08":
            return self._get_scenario_08_users(db, limit)
        elif scenario_id == "SCENARIO_09":
            return self._get_scenario_09_users(db, limit)
        elif scenario_id == "SCENARIO_10":
            return self._get_scenario_10_users(db, limit)
        elif scenario_id == "SCENARIO_11":
            return self._get_scenario_11_users(db, limit)
        else:
            return []

    def _get_scenario_01_users(
        self,
        db: Session,
        limit: int,
        options: Optional[Dict[str, Any]] = None,
    ) -> List[Dict[str, Any]]:
        """Get Scenario 1 users."""
        cutoff = self.now() - timedelta(days=1)
        
        dice_count = select(func.count(DiceLog.id)).where(DiceLog.user_id == V2User.id).scalar_subquery()
        roulette_count = select(func.count(RouletteLog.id)).where(RouletteLog.user_id == V2User.id).scalar_subquery()
        lottery_count = select(func.count(LotteryLog.id)).where(LotteryLog.user_id == V2User.id).scalar_subquery()

        plays_total = (
            func.coalesce(dice_count, 0)
            + func.coalesce(roulette_count, 0) 
            + func.coalesce(lottery_count, 0)
        )
        
        min_plays = int((options or {}).get("min_plays", 10))
        query = (
            select(V2User.id, V2User.nickname, plays_total.label("play_count"))
            .select_from(V2User)
            .where(
                V2User.created_at >= cutoff,
                V2User.vault_locked_balance == 0,
                plays_total >= min_plays,
            )
            .limit(limit)
        )
        results = db.execute(query).fetchall()
        return [
            {
                "user_id": r.id,
                "nickname": r.nickname,
                "data": {"play_count": int(r.play_count or 0)},
            }
            for r in results
        ]

    def _get_scenario_04_users(self, db: Session, limit: int) -> List[Dict[str, Any]]:
        """Get Scenario 4 users."""
        cutoff = self.now() - timedelta(days=7)
        query = select(V2User.id, V2User.nickname, V2User.vault_locked_balance).where(
            V2User.last_login_at < cutoff,
            V2User.vault_locked_balance > 10000,
        ).limit(limit)
        results = db.execute(query).fetchall()
        return [
            {
                "user_id": r.id,
                "nickname": r.nickname,
                "data": {"vault_balance": int(r.vault_locked_balance or 0)},
            }
            for r in results
        ]

    def _get_scenario_03_users(
        self,
        db: Session,
        limit: int,
        options: Optional[Dict[str, Any]] = None,
    ) -> List[Dict[str, Any]]:
        """Get Scenario 3 users (Window Shopper)."""
        ticket_types = [
            GameTokenType.ROULETTE_COIN,
            GameTokenType.DICE_TOKEN,
            GameTokenType.LOTTERY_TICKET,
            GameTokenType.TRIAL_TOKEN,
        ]
        wallet_sub = (
            select(
                UserGameWallet.user_id,
                func.coalesce(func.sum(UserGameWallet.balance), 0).label("ticket_balance"),
            )
            .where(UserGameWallet.token_type.in_(ticket_types))
            .group_by(UserGameWallet.user_id)
            .subquery()
        )
        ticket_balance = func.coalesce(wallet_sub.c.ticket_balance, 0)
        require_no_deposit = bool((options or {}).get("require_no_deposit", True))

        query = (
            select(V2User.id, V2User.nickname, V2User.total_charge_amount, ticket_balance.label("ticket_balance"))
            .select_from(V2User)
            .outerjoin(wallet_sub, wallet_sub.c.user_id == V2User.id)
            .where(
                ticket_balance <= 0,
                V2User.total_charge_amount <= 0 if require_no_deposit else True,
            )
            .limit(limit)
        )
        results = db.execute(query).fetchall()
        return [
            {
                "user_id": r.id,
                "nickname": r.nickname,
                "data": {
                    "ticket_balance": int(r.ticket_balance or 0),
                    "total_charge_amount": int(r.total_charge_amount or 0),
                },
            }
            for r in results
        ]

    def _get_scenario_05_users(
        self,
        db: Session,
        limit: int,
        options: Optional[Dict[str, Any]] = None,
    ) -> List[Dict[str, Any]]:
        """Get Scenario 5 users (Turning Regular)."""
        now = self.now()
        active_days = int((options or {}).get("active_days", 30))
        inactive_days = int((options or {}).get("inactive_days", 10))
        min_login_count = int((options or {}).get("min_login_count", 15))

        active_cutoff = now - timedelta(days=active_days)
        inactive_cutoff = now - timedelta(days=inactive_days)
        login_sub = (
            select(
                UserEventLog.user_id,
                func.count(UserEventLog.id).label("login_count"),
            )
            .where(
                UserEventLog.event_name == "AUTH_LOGIN",
                UserEventLog.created_at >= active_cutoff,
            )
            .group_by(UserEventLog.user_id)
            .subquery()
        )
        query = (
            select(V2User.id, V2User.nickname, V2User.last_login_at, login_sub.c.login_count)
            .select_from(V2User)
            .join(login_sub, login_sub.c.user_id == V2User.id)
            .where(
                login_sub.c.login_count >= min_login_count,
                V2User.last_login_at.isnot(None),
                V2User.last_login_at < inactive_cutoff,
            )
            .limit(limit)
        )
        results = db.execute(query).fetchall()
        return [
            {
                "user_id": r.id,
                "nickname": r.nickname,
                "data": {
                    "login_count_30d": int(r.login_count or 0),
                    "last_login_at": r.last_login_at,
                },
            }
            for r in results
        ]

    def _get_scenario_11_users(self, db: Session, limit: int) -> List[Dict[str, Any]]:
        """Get Scenario 11 users (External VIP)."""
        cutoff = self.now() - timedelta(days=7)
        query = (
            select(V2User.id, V2User.nickname, ExternalRankingData.deposit_amount)
            .join(ExternalRankingData, ExternalRankingData.user_id == V2User.id)
            .where(
                ExternalRankingData.deposit_amount >= 1000000,
                ExternalRankingData.updated_at >= cutoff,
            )
            .limit(limit)
        )
        results = db.execute(query).fetchall()
        return [
            {"user_id": r.id, "nickname": r.nickname, "data": {"external_deposit": r.deposit_amount}}
            for r in results
        ]

    def _get_scenario_02_users(self, db: Session, limit: int) -> List[Dict[str, Any]]:
        """Get Scenario 2 users (One-Day Tester)."""
        now = self.now()
        start = now - timedelta(days=2)
        end = now - timedelta(days=1)
        
        dice_count = select(func.count(DiceLog.id)).where(DiceLog.user_id == V2User.id).scalar_subquery()
        roulette_count = select(func.count(RouletteLog.id)).where(RouletteLog.user_id == V2User.id).scalar_subquery()
        lottery_count = select(func.count(LotteryLog.id)).where(LotteryLog.user_id == V2User.id).scalar_subquery()

        plays_total = (
            func.coalesce(dice_count, 0)
            + func.coalesce(roulette_count, 0) 
            + func.coalesce(lottery_count, 0)
        )

        query = (
            select(V2User.id, V2User.nickname, V2User.created_at)
            .select_from(V2User)
            .where(
                V2User.created_at >= start,
                V2User.created_at < end,
                V2User.total_charge_amount <= 0,
                plays_total >= 1,
                V2User.last_login_at < end,
            )
            .limit(limit)
        )
        results = db.execute(query).fetchall()
        return [
            {
                "user_id": r.id,
                "nickname": r.nickname,
                "data": {"created_at": r.created_at},
            }
            for r in results
        ]

    def _get_scenario_06_users(self, db: Session, limit: int) -> List[Dict[str, Any]]:
        """Get Scenario 6 users (Broken Streak)."""
        cutoff = self.now() - timedelta(hours=72)
        query = (
            select(V2User.id, V2User.nickname, V2User.login_streak)
            .select_from(V2User)
            .where(
                V2User.login_streak >= 3,
                V2User.last_streak_updated_at.isnot(None),
                V2User.last_streak_updated_at < cutoff,
                V2User.last_login_at.isnot(None),
                V2User.last_login_at < cutoff,
            )
            .limit(limit)
        )
        results = db.execute(query).fetchall()
        return [
            {
                "user_id": r.id,
                "nickname": r.nickname,
                "data": {"streak": r.login_streak},
            }
            for r in results
        ]

    def _get_scenario_07_users(self, db: Session, limit: int) -> List[Dict[str, Any]]:
        """Get Scenario 7 users (Stuck Climber)."""
        cutoff = self.now() - timedelta(hours=48)
        query = (
            select(V2User.id, V2User.nickname, V2User.level)
            .select_from(V2User)
            .where(
                V2User.level.between(4, 5),
                V2User.last_play_date.isnot(None),
                V2User.last_play_date < cutoff.date(),
                V2User.last_login_at.isnot(None),
                V2User.last_login_at >= cutoff - timedelta(days=2),
            )
            .limit(limit)
        )
        results = db.execute(query).fetchall()
        return [
            {
                "user_id": r.id,
                "nickname": r.nickname,
                "data": {"level": r.level},
            }
            for r in results
        ]

    def _get_scenario_08_users(self, db: Session, limit: int) -> List[Dict[str, Any]]:
        """Get Scenario 8 users (Bored VIP)."""
        cutoff_play = self.now() - timedelta(hours=72)
        cutoff_deposit = self.now() - timedelta(days=7)
        cutoff_date = cutoff_deposit.date()
        deposit_sub = self._subquery_deposit_sum(cutoff_date)

        query = (
            select(V2User.id, V2User.nickname, V2User.total_charge_amount)
            .select_from(V2User)
            .join(deposit_sub, deposit_sub.c.user_id == V2User.id, isouter=True)
            .where(
                V2User.total_charge_amount >= 1_000_000,
                V2User.last_play_date.isnot(None),
                V2User.last_play_date < cutoff_play.date(),
                V2User.last_login_at.isnot(None),
                V2User.last_login_at < cutoff_play,
                V2User.first_deposit_at.isnot(None),
                func.coalesce(deposit_sub.c.deposit_sum, 0) <= 0,
            )
            .limit(limit)
        )
        results = db.execute(query).fetchall()
        return [
            {
                "user_id": r.id,
                "nickname": r.nickname,
                "data": {"total_charge": r.total_charge_amount},
            }
            for r in results
        ]

    def _get_scenario_09_users(self, db: Session, limit: int) -> List[Dict[str, Any]]:
        """Get Scenario 9 users (Tilting Player)."""
        # Scenario 9 is currently a placeholder fallback to 0 in detection,
        # so we return empty list here to match _count_scenario_09 behavior.
        return []

    def _get_scenario_10_users(self, db: Session, limit: int) -> List[Dict[str, Any]]:
        """Get Scenario 10 users (Bonus Hunter)."""
        cutoff = self.now() - timedelta(days=7)
        cutoff_date = cutoff.date()
        deposit_sub = self._subquery_deposit_sum(cutoff_date)
        query = (
            select(V2User.id, V2User.nickname, V2User.last_free_ticket_claimed_at)
            .select_from(V2User)
            .join(deposit_sub, deposit_sub.c.user_id == V2User.id, isouter=True)
            .where(
                func.coalesce(deposit_sub.c.deposit_sum, 0) <= 0,
                V2User.last_free_ticket_claimed_at.isnot(None),
                V2User.last_free_ticket_claimed_at >= cutoff,
            )
            .limit(limit)
        )
        results = db.execute(query).fetchall()
        return [
            {
                "user_id": r.id,
                "nickname": r.nickname,
                "data": {"last_claimed_at": r.last_free_ticket_claimed_at},
            }
            for r in results
        ]

    # ========== Target List CRUD ==========

    def create_target_list(
        self,
        db: Session,
        *,
        plan_id: int,
        name: str,
        source_type: str,
        source_params: Optional[Dict[str, Any]] = None,
    ) -> OpsTargetList:
        """Create a new target list."""
        target_list = OpsTargetList(
            plan_id=plan_id,
            name=name,
            source_type=source_type,
            source_params=source_params or {},
            count_snapshot=0,
            is_processed=False,
            created_at=self.now(),
            updated_at=self.now(),
        )
        db.add(target_list)
        db.commit()
        db.refresh(target_list)
        return target_list

    def import_from_scenario(
        self,
        db: Session,
        *,
        plan_id: int,
        scenario_id: str,
        options: Optional[Dict[str, Any]] = None,
    ) -> Tuple[OpsTargetList, int]:
        """Import users from a scenario into a target list."""
        scenario = next((s for s in SCENARIOS if s["id"] == scenario_id), None)
        if not scenario:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unknown scenario: {scenario_id}",
            )

        # Create target list
        target_list = self.create_target_list(
            db,
            plan_id=plan_id,
            name=f"{datetime.now().strftime('%Y-%m-%d')} {scenario['name']}",
            source_type="SCENARIO",
            source_params={"scenario_id": scenario_id, "options": options},
        )

        # Get scenario users
        users = self.get_scenario_users(db, scenario_id, options=options)

        # Add members
        for user_data in users:
            member = OpsTargetMember(
                target_list_id=target_list.id,
                user_id=user_data["user_id"],
                status="PENDING",
                data=user_data.get("data"),
                result_status="NONE",
                created_at=self.now(),
                updated_at=self.now(),
            )
            db.add(member)

        # Update count
        target_list.count_snapshot = len(users)
        db.commit()
        db.refresh(target_list)

        return target_list, len(users)

    def get_target_list(self, db: Session, *, target_list_id: int) -> OpsTargetList:
        """Get a target list by ID."""
        target_list = db.get(OpsTargetList, target_list_id)
        if not target_list:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Target list not found",
            )
        return target_list

    def list_target_lists(self, db: Session, *, plan_id: int) -> List[OpsTargetList]:
        """List all target lists for a plan."""
        query = select(OpsTargetList).where(OpsTargetList.plan_id == plan_id)
        return list(db.execute(query).scalars().all())

    def get_target_members(
        self,
        db: Session,
        *,
        target_list_id: int,
        limit: int | None = None,
    ) -> List[OpsTargetMember]:
        """Get members of a target list (optionally limited, with nickname)."""
        max_limit = None
        if limit is not None:
            safe_limit = max(1, min(limit, 500))
            max_limit = safe_limit

        query = (
            select(OpsTargetMember, V2User.nickname)
            .join(V2User, V2User.id == OpsTargetMember.user_id, isouter=True)
            .where(OpsTargetMember.target_list_id == target_list_id)
            .order_by(OpsTargetMember.id.asc())
        )
        if max_limit is not None:
            query = query.limit(max_limit)

        rows = db.execute(query).all()
        members: List[OpsTargetMember] = []
        for member, nickname in rows:
            # Attach nickname for response_model serialization
            setattr(member, "nickname", nickname)
            members.append(member)
        return members

    def update_member_status(
        self,
        db: Session,
        *,
        member_id: int,
        status: Optional[str] = None,
        result_status: Optional[str] = None,
        converted_at: Optional[datetime] = None,
        conversion_value: Optional[int] = None,
    ) -> OpsTargetMember:
        """Update a member's status or result tracking fields."""
        member = db.get(OpsTargetMember, member_id)
        if not member:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Target member not found",
            )
        if status is not None:
            member.status = status
        if result_status is not None:
            member.result_status = result_status
        if converted_at is not None:
            member.converted_at = converted_at
        if conversion_value is not None:
            member.conversion_value = conversion_value
        member.updated_at = self.now()
        db.commit()
        db.refresh(member)
        return member

    # ========== Result Check ==========

    def check_results(
        self, db: Session, *, target_list_id: int
    ) -> Dict[str, Any]:
        """Check conversion results for a target list."""
        members = self.get_target_members(db, target_list_id=target_list_id)

        total = len(members)
        sent = sum(1 for m in members if m.status == "SENT")
        converted = sum(1 for m in members if m.converted_at is not None)
        total_value = sum(m.conversion_value or 0 for m in members)

        return {
            "target_list_id": target_list_id,
            "total_count": total,
            "sent_count": sent,
            "converted_count": converted,
            "conversion_rate": round(converted / sent, 2) if sent > 0 else 0.0,
            "total_conversion_value": total_value,
        }

    def delete_target_list(self, db: Session, *, target_list_id: int) -> None:
        """Delete a target list and its members."""
        target_list = self.get_target_list(db, target_list_id=target_list_id)
        db.delete(target_list)
        db.commit()
