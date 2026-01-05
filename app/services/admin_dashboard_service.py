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
        risk_count = db.query(func.count(User.id)).filter(
            User.last_login_at >= yesterday_start,
            User.last_login_at <= yesterday_end
        ).scalar() or 0
        
        churn_risk_count = 0
        if risk_count > 0:
             # Of those who were active yesterday, how many have NOT logged in since Today 00:00 KST?
             # Logic: logged in yesterday AND (last_login < today_start OR last_login is None)
             churn_risk_count = db.query(func.count(User.id)).filter(
                User.last_login_at >= yesterday_start,
                User.last_login_at <= yesterday_end,
                or_(User.last_login_at < today_start_utc, User.last_login_at == None)
             ).scalar() or 0

        # 2. Welcome Mission Retention (D-2 Joined -> Active D-1 (Yesterday))
        d2_date = kst_now.date() - timedelta(days=2)
        d2_start = datetime.combine(d2_date, time.min) - timedelta(hours=9)
        d2_end = datetime.combine(d2_date, time.max) - timedelta(hours=9)

        joined_d2 = db.query(func.count(User.id)).filter(
            User.created_at >= d2_start,
            User.created_at <= d2_end
        ).scalar() or 0

        retained_d1 = 0
        if joined_d2 > 0:
            retained_d1 = db.query(func.count(distinct(User.id))).filter(
                User.created_at >= d2_start,
                User.created_at <= d2_end,
                User.last_login_at >= yesterday_start, # Login Yesterday (D+1)
                User.last_login_at <= yesterday_end
            ).scalar() or 0

        welcome_retention_rate = (retained_d1 / joined_d2 * 100) if joined_d2 > 0 else 0.0

        # 3. External Ranking / Financials
        from app.models.external_ranking import ExternalRankingData
        ext_rank_stats = db.query(
            func.sum(ExternalRankingData.deposit_amount),
            func.sum(ExternalRankingData.play_count)
        ).first()
        external_ranking_deposit = int(ext_rank_stats[0] or 0)
        external_ranking_play_count = int(ext_rank_stats[1] or 0)

        # Today's Deposits (KST 00:00 ~ Now)
        deposit_stats = db.query(
            func.sum(UserCashLedger.delta),
            func.count(UserCashLedger.id)
        ).filter(
            UserCashLedger.created_at >= today_start_utc,
            UserCashLedger.delta > 0,
            or_(UserCashLedger.reason == "CHARGE", UserCashLedger.reason == "DEPOSIT")
        ).first()
        today_deposit_sum = int(deposit_stats[0] or 0)
        today_deposit_count = int(deposit_stats[1] or 0)

        # 4. Liabilities (Vault + Inventory)
        vault_stats = db.query(
            func.sum(User.vault_locked_balance + User.vault_available_balance)
        ).scalar() or 0
        total_vault_balance = int(vault_stats)
        
        # Inventory Liability (Simplified: Just count of valuable items for now, or 0 if complexity high)
        # Assuming minimal implementation for speed check:
        # Just distinct count of items or sum of quantity? Sum of quantity seems safest proxy.
        from app.models.inventory import UserInventoryItem
        inventory_count = db.query(func.sum(UserInventoryItem.quantity)).scalar() or 0
        total_inventory_liability = int(inventory_count)

        # 5. Activity (Today)
        # Active Users Today
        today_active_users = db.query(func.count(User.id)).filter(
            User.last_login_at >= today_start_utc
        ).scalar() or 0

        # Game Plays Today (Dice + Roulette + Lottery)
        dice_plays = db.query(func.count(DiceLog.id)).filter(DiceLog.created_at >= today_start_utc).scalar() or 0
        roulette_plays = db.query(func.count(RouletteLog.id)).filter(RouletteLog.created_at >= today_start_utc).scalar() or 0
        lottery_plays = db.query(func.count(LotteryLog.id)).filter(LotteryLog.created_at >= today_start_utc).scalar() or 0
        today_game_plays = dice_plays + roulette_plays + lottery_plays

        # Ticket Usage Today
        from app.models.game_wallet_ledger import UserGameWalletLedger
        from app.models.game_wallet import GameTokenType
        
        _ALLOWED_TOKENS = (
            GameTokenType.ROULETTE_COIN,
            GameTokenType.DICE_TOKEN,
            GameTokenType.LOTTERY_TICKET,
        )

        today_ticket_usage = db.query(func.coalesce(func.sum(UserGameWalletLedger.delta), 0)).filter(
            UserGameWalletLedger.created_at >= today_start_utc,
            UserGameWalletLedger.token_type.in_(_ALLOWED_TOKENS),
            UserGameWalletLedger.delta < 0
        ).scalar() or 0
        today_ticket_usage = int(abs(today_ticket_usage))

        # 6. Streak Counts
        streak_case = case(
            (User.play_streak >= 7, "LEGEND"),
            (User.play_streak >= 3, "HOT"),
            else_="NORMAL"
        )
        streak_query = db.query(streak_case, func.count(User.id)).group_by(streak_case).all()
        streak_counts = {"NORMAL": 0, "HOT": 0, "LEGEND": 0}
        for label, count in streak_query:
            if label in streak_counts:
                streak_counts[label] = count

        return {
            "welcome_retention_rate": float(welcome_retention_rate),
            "churn_risk_count": churn_risk_count,
            "external_ranking_deposit": external_ranking_deposit,
            "external_ranking_play_count": external_ranking_play_count,
            "today_deposit_sum": today_deposit_sum,
            "today_deposit_count": today_deposit_count,
            "total_vault_balance": total_vault_balance,
            "total_inventory_liability": total_inventory_liability,
            "today_active_users": today_active_users,
            "today_game_plays": today_game_plays,
            "today_ticket_usage": today_ticket_usage,
            "streak_counts": streak_counts
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

    def get_metric_details(self, db: Session, metric_key: str):
        """
        Return detailed list data for a specific metric.
        Format: [{"id": 1, "label": "Main Text", "sub_label": "Sub Text", "value": "Value", "tags": ["TAG"]}]
        """
        kst_now = self._get_kst_now()
        yesterday_start, yesterday_end = self._get_yesterday_kst_range(kst_now)
        today_start_utc = self._get_today_kst_start_in_utc(kst_now)
        
        results = []

        if metric_key == "churn_risk":
            # Users active yesterday but not today
            users = db.query(User).filter(
                User.last_login_at >= yesterday_start,
                User.last_login_at <= yesterday_end,
                or_(User.last_login_at < today_start_utc, User.last_login_at == None)
            ).all()
            
            for u in users:
                streak_tag = "LEGEND" if u.play_streak >= 7 else "HOT" if u.play_streak >= 3 else "NORMAL"
                results.append({
                    "id": u.id,
                    "label": u.nickname or f"User {u.id}",
                    "sub_label": f"Last Login: {u.last_login_at.strftime('%m-%d %H:%M') if u.last_login_at else 'Unknown'}",
                    "value": f"Streak: {u.play_streak}",
                    "tags": [streak_tag]
                })

        elif metric_key == "today_active":
            # Users active today (Limit 50)
            users = db.query(User).filter(
                User.last_login_at >= today_start_utc
            ).order_by(User.last_login_at.desc()).limit(50).all()

            for u in users:
                results.append({
                    "id": u.id,
                    "label": u.nickname or f"User {u.id}",
                    "sub_label": f"Lv.{u.level}",
                    "value": u.last_login_at.strftime('%H:%M:%S'),
                    "tags": ["ONLINE"]
                })

        elif metric_key == "today_deposit":
            # Deposits today
            txs = db.query(UserCashLedger, User).join(User).filter(
                UserCashLedger.created_at >= today_start_utc,
                UserCashLedger.delta > 0,
                or_(UserCashLedger.reason == "CHARGE", UserCashLedger.reason == "DEPOSIT")
            ).order_by(UserCashLedger.created_at.desc()).limit(50).all()

            for tx, u in txs:
                results.append({
                    "id": tx.id,
                    "label": u.nickname or f"User {u.id}",
                    "sub_label": tx.reason,
                    "value": f"+{tx.delta:,} KRW",
                    "tags": [tx.reason]
                })

        elif metric_key == "welcome_retention":
            # New Users D-2
            d2_date = kst_now.date() - timedelta(days=2)
            d2_start = datetime.combine(d2_date, time.min) - timedelta(hours=9)
            d2_end = datetime.combine(d2_date, time.max) - timedelta(hours=9)

            users = db.query(User).filter(
                User.created_at >= d2_start,
                User.created_at <= d2_end
            ).all()

            for u in users:
                # Check if retained (Active Yesterday)
                retained = False
                if u.last_login_at and yesterday_start <= u.last_login_at <= yesterday_end:
                    retained = True
                
                results.append({
                    "id": u.id,
                    "label": u.nickname or f"User {u.id}",
                    "sub_label": f"Joined: {u.created_at.strftime('%m-%d %H:%M')}",
                    "value": "Retained" if retained else "Lost",
                    "tags": ["RETAINED" if retained else "LOST"]
                })
        
        elif metric_key == "today_game_plays":
            # Recent Game Plays (Limit 50)
            # Combine reports from DiceLog, RouletteLog, LotteryLog
            # For simplicity, just showing DiceLog for now or union if possible.
            # Implementing simple Union for recent activity across all is complex in ORM without proper polymorphism.
            # We will show Dice Logs (most frequent) + Roulette Logs.
            
            # Dice
            dice_logs = db.query(DiceLog, User).join(User).filter(
                DiceLog.created_at >= today_start_utc
            ).order_by(DiceLog.created_at.desc()).limit(30).all()
            
            # Roulette
            roul_logs = db.query(RouletteLog, User).join(User).filter(
                RouletteLog.created_at >= today_start_utc
            ).order_by(RouletteLog.created_at.desc()).limit(20).all()

            # Merge and Sort
            combined = []
            for log, u in dice_logs:
                combined.append({
                    "obj": log, "user": u, "type": "DICE", "time": log.created_at
                })
            for log, u in roul_logs:
                combined.append({
                    "obj": log, "user": u, "type": "ROULETTE", "time": log.created_at
                })
            
            combined.sort(key=lambda x: x["time"], reverse=True)

            for item in combined:
                u = item["user"]
                log = item["obj"]
                
                val_str = ""
                if item["type"] == "DICE":
                    # DiceLog: result (WIN/LOSE), user_sum vs dealer_sum
                    val_str = f"{log.result} ({log.reward_amount:,} KRW)"
                elif item["type"] == "ROULETTE":
                    # RouletteLog: multiplier
                    mult = getattr(log, 'multiplier', 0)
                    val_str = f"x{mult} ({getattr(log, 'payout_amount', 0):,} KRW)"
                else:
                    val_str = "Played"

                results.append({
                    "id": log.id, # Potentially collision if IDs overlap, but fine for display list
                    "label": u.nickname or f"User {u.id}",
                    "sub_label": log.created_at.strftime('%H:%M:%S'),
                    "value": val_str,
                    "tags": [item["type"]]
                })

        elif metric_key == "external_ranking_deposit":
            from app.models.external_ranking import ExternalRankingData
            ranks = db.query(ExternalRankingData, User).join(User).order_by(
                ExternalRankingData.deposit_amount.desc()
            ).limit(50).all()

            for r, u in ranks:
                results.append({
                    "id": u.id,
                    "label": u.nickname or f"User {u.id}",
                    "sub_label": f"Updated: {r.updated_at.strftime('%m-%d')}",
                    "value": f"{r.deposit_amount:,} KRW",
                    "tags": ["RANKED"]
                })

        elif metric_key == "external_ranking_play_count":
            from app.models.external_ranking import ExternalRankingData
            ranks = db.query(ExternalRankingData, User).join(User).order_by(
                ExternalRankingData.play_count.desc()
            ).limit(50).all()

            for r, u in ranks:
                results.append({
                    "id": u.id,
                    "label": u.nickname or f"User {u.id}",
                    "sub_label": f"Updated: {r.updated_at.strftime('%m-%d')}",
                    "value": f"{r.play_count:,} Plays",
                    "tags": ["RANKED"]
                })
        
        elif metric_key == "total_vault_balance":
            users = db.query(User).filter(
                (User.vault_locked_balance + User.vault_available_balance) > 0
            ).order_by(
                (User.vault_locked_balance + User.vault_available_balance).desc()
            ).limit(50).all()

            for u in users:
                total = u.vault_locked_balance + u.vault_available_balance
                results.append({
                    "id": u.id,
                    "label": u.nickname or f"User {u.id}",
                    "sub_label": f"Locked: {u.vault_locked_balance:,}",
                    "value": f"{total:,} KRW",
                    "tags": ["VAULT"]
                })

        elif metric_key == "total_inventory_liability":
            from app.models.inventory import UserInventoryItem
            # Top holders of items
            items = db.query(UserInventoryItem, User).join(User).order_by(
                UserInventoryItem.quantity.desc()
            ).limit(50).all()

            for inv, u in items:
                results.append({
                    "id": inv.id,
                    "label": u.nickname or f"User {u.id}",
                    "sub_label": inv.item_type,
                    "value": f"Qty: {inv.quantity}",
                    "tags": ["ITEM"]
                })
        
        elif metric_key == "today_ticket_usage":
            from app.models.game_wallet_ledger import UserGameWalletLedger
            from app.models.game_wallet import GameTokenType
            _ALLOWED_TOKENS = (
                GameTokenType.ROULETTE_COIN,
                GameTokenType.DICE_TOKEN,
                GameTokenType.LOTTERY_TICKET,
            )

            # Top consumers today
            usage_logs = db.query(UserGameWalletLedger, User).join(User).filter(
                UserGameWalletLedger.created_at >= today_start_utc,
                UserGameWalletLedger.token_type.in_(_ALLOWED_TOKENS),
                UserGameWalletLedger.delta < 0
            ).order_by(UserGameWalletLedger.created_at.desc()).limit(50).all()

            for log, u in usage_logs:
                results.append({
                    "id": log.id,
                    "label": u.nickname or f"User {u.id}",
                    "sub_label": log.token_type.replace("_", " "),
                    "value": f"{abs(log.delta)} USED",
                    "tags": [log.reason or "USE"]
                })

        return results
