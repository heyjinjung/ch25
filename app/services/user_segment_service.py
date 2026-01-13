
"""Service for User Segmentation and CRM Profiles.

Unifies dynamic computed segments (Whales, Cash-Outers) with manual admin profiles.
"""
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional

from sqlalchemy.orm import Session
from sqlalchemy import func, desc

from app.models.user import User
from app.models.admin_user_profile import AdminUserProfile
from app.models.vault_earn_event import VaultEarnEvent
from app.models.vault2 import VaultStatus
from app.models.user_cash_ledger import UserCashLedger
from app.models.external_ranking import ExternalRankingData
from app.models.external_ranking_daily_deposit_delta import ExternalRankingDailyDepositDelta
from app.models.roulette import RouletteLog
from app.models.dice import DiceLog
from app.models.segment_rule import SegmentRule
from app.services.segment_rules_engine import SegmentContext, matches_condition

# Thresholds
WHALE_ACCRUAL_THRESHOLD = 1_000_000
CASHOUT_FREQ_THRESHOLD = 10
CASHOUT_AMOUNT_THRESHOLD = 500_000
EMPTY_TANK_THRESHOLD = 1000

class UserSegmentService:
    @staticmethod
    def get_user_profile(db: Session, user_id: int) -> Optional[AdminUserProfile]:
        return db.query(AdminUserProfile).filter(AdminUserProfile.user_id == user_id).first()

    @staticmethod
    def upsert_user_profile(
        db: Session, 
        user_id: int, 
        profile_data: Dict[str, Any]
    ) -> AdminUserProfile:
        profile = UserSegmentService.get_user_profile(db, user_id)
        if not profile:
            profile = AdminUserProfile(user_id=user_id)
            db.add(profile)
        
        # Update fields
        if "external_id" in profile_data:
            profile.external_id = profile_data["external_id"]
        if "real_name" in profile_data:
            profile.real_name = profile_data["real_name"]
        if "phone_number" in profile_data:
            profile.phone_number = profile_data["phone_number"]
        if "telegram_id" in profile_data:
            profile.telegram_id = profile_data["telegram_id"]
        if "memo" in profile_data:
            profile.memo = profile_data["memo"]
        if "tags" in profile_data:
            # Simple overwrite or merge logic could go here. For now, overwrite.
            profile.tags = profile_data["tags"]
        
        # New Metrics
        if "total_active_days" in profile_data:
            profile.total_active_days = profile_data["total_active_days"]
        if "days_since_last_charge" in profile_data:
            profile.days_since_last_charge = profile_data["days_since_last_charge"]
        if "last_active_date_str" in profile_data:
            profile.last_active_date_str = profile_data["last_active_date_str"]
            
        db.commit()
        db.refresh(profile)
        return profile

    @staticmethod
    def resolve_and_sync_user_from_import(
        db: Session, 
        row_data: Dict[str, Any],
        default_password: str = "1234"
    ) -> Dict[str, Any]:
        """
        Process a single import row:
        1. Resolve User (ID -> External ID -> Telegram Username)
        2. Create User if missing (Auto-generate External ID if only Username provided)
        3. Sync Identity (Update User.telegram_username)
        4. Upsert Admin Profile
        
        Returns dict with keys: 'success' (bool), 'error' (str), 'user_id' (int)
        """
        from app.core.security import hash_password # Local import to avoid circular dep if any
        
        # Helper to find key case-insensitively
        def get_val(keys, target_key):
            if target_key in keys: return row_data[target_key]
            for k in keys:
                if k.strip().lower() == target_key.lower(): return row_data[k]
            return None

        keys = row_data.keys()
        
        # --- EXTRACT KEY FIELDS ---
        user_id_str = get_val(keys, "user_id")
        ext_id = get_val(keys, "external_id") 
        if not ext_id:
            for k in keys:
                if "external_id" in k.lower():
                    ext_id = row_data[k]
                    break
        
        telegram_raw = get_val(keys, "telegram") or get_val(keys, "telegram_id") or get_val(keys, "텔레그램") or get_val(keys, "username")
        
        was_created = False
        
        # --- 1. RESOLVE USER TARGET ---
        target_user = None
        
        # A. Try User ID
        if user_id_str and str(user_id_str).strip():
            try:
                target_user = db.query(User).filter(User.id == int(user_id_str)).first()
            except:
                pass
        
        # B. Try External ID
        if not target_user and ext_id and str(ext_id).strip():
            target_user = db.query(User).filter(User.external_id == str(ext_id).strip()).first()

        # C. Try Telegram Username (Refactor: Frame Switch)
        if not target_user and telegram_raw and str(telegram_raw).strip():
            clean_tg = str(telegram_raw).strip().lstrip("@")
            target_user = db.query(User).filter(User.telegram_username == clean_tg).first()

        # --- 2. CREATE USER IF MISSING ---
        if not target_user:
            clean_ext_id = str(ext_id).strip() if ext_id else None
            clean_tg = str(telegram_raw).strip().lstrip("@") if telegram_raw else None
            
            if clean_ext_id or clean_tg:
                # Determine external_id fallback
                # If only telegram username is known, generate a unique external_id
                final_ext_id = clean_ext_id if clean_ext_id else f"tg_{clean_tg}_{datetime.utcnow().timestamp()}"
                final_nickname = clean_tg if clean_tg else final_ext_id
                
                target_user = User(
                    external_id=final_ext_id,
                    nickname=final_nickname,
                    telegram_username=clean_tg, 
                    password_hash=hash_password(default_password),
                    level=1, 
                    xp=0, 
                    status="active"
                )
                db.add(target_user)
                try:
                    db.commit()
                    db.refresh(target_user)
                    was_created = True
                except Exception as e:
                    db.rollback()
                    return {"success": False, "error": f"Create User Failed: {str(e)}"}
            else:
                return {"success": False, "error": "Skipped - No resolvable ID"}
        
        # --- 3. SYNC CORE IDENTITY ---
        if telegram_raw and str(telegram_raw).strip():
            clean_tg = str(telegram_raw).strip().lstrip("@")
            if target_user.telegram_username != clean_tg:
                target_user.telegram_username = clean_tg
                db.add(target_user)
                try:
                    db.commit()
                    db.refresh(target_user)
                except Exception as e:
                    db.rollback() 
                    print(f"WARN: Failed to sync telegram_username for user {target_user.id}: {e}")

        # --- 4. EXTRACT PROFILE DATA ---
        tags_raw = get_val(keys, "tags") or get_val(keys, "태그")
        memo_raw = get_val(keys, "memo") or get_val(keys, "메모")
        real_name_raw = get_val(keys, "real_name") or get_val(keys, "이름") or get_val(keys, "실명")
        phone_raw = get_val(keys, "phone") or get_val(keys, "phone_number") or get_val(keys, "전화번호")
        
        total_active_days_str = get_val(keys, "총 이용일수") or get_val(keys, "total_active_days")
        days_since_charge_str = get_val(keys, "마지막 충전 후 경과일") or get_val(keys, "days_since_last_charge")
        last_active_str = get_val(keys, "최근 이용일") or get_val(keys, "last_active_date_str")

        # Process Tags
        tags_list = []
        if tags_raw:
             tags_list = [t.strip() for t in str(tags_raw).split(",") if t.strip()]
        
        # [Audit] Add CSV_IMPORT tag for new users
        # print(f"DEBUG: resolving tags. was_created={was_created}, user={target_user.id}")
        if was_created:
            if "CSV_IMPORT" not in tags_list:
                tags_list.append("CSV_IMPORT")

        profile_data = {
            "external_id": target_user.external_id, # Always use current user's ext ID
            "real_name": real_name_raw,
            "phone_number": phone_raw, 
            "telegram_id": telegram_raw, # Store original raw input in profile
            "memo": memo_raw,
            "tags": tags_list
        }
        
        if total_active_days_str:
            try:
                profile_data["total_active_days"] = int(str(total_active_days_str).replace(",","").strip())
            except:
                pass
        
        if days_since_charge_str:
            try:
                profile_data["days_since_last_charge"] = int(str(days_since_charge_str).replace(",","").strip())
            except:
                pass

        if last_active_str:
            profile_data["last_active_date_str"] = str(last_active_str).strip()

        # REMOVED: Redundant tags overwrite that wiped CSV_IMPORT
        # if tags_raw:
        #    profile_data["tags"] = [t.strip() for t in tags_raw.split(",") if t.strip()]
        
        UserSegmentService.upsert_user_profile(db, target_user.id, profile_data)
        
        return {"success": True, "user_id": target_user.id}

    @staticmethod
    def get_computed_segments(db: Session, user_id: int) -> List[str]:
        """Calculate dynamic segments for a user using database-driven rules."""
        from app.services.admin_segment_rule_service import AdminSegmentRuleService
        
        # 1. Fetch enabled rules ordered by priority
        rules = AdminSegmentRuleService.list_enabled_rules(db)
        if not rules:
            return []

        # 2. Collect user metrics once
        ctx = UserSegmentService._build_segment_context(db, user_id)
        if not ctx:
            return []

        segments = set()
        for rule in rules:
            try:
                if matches_condition(rule.condition_json, ctx):
                    segments.add(rule.segment)
            except Exception:
                # Specific rule error shouldn't block entire calculation
                continue
        
        return list(segments)

    @staticmethod
    def _build_segment_context(db: Session, user_id: int) -> Optional[SegmentContext]:
        """Collect all base metrics for a user and build a SegmentContext."""
        from app.models.user_activity import UserActivity
        from app.services.admin_segment_service import _days_since, _max_dt
        
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            return None

        now = datetime.utcnow()
        act = db.query(UserActivity).filter(UserActivity.user_id == user_id).first()
        ext = db.query(ExternalRankingData).filter(ExternalRankingData.user_id == user_id).first()
        profile = db.query(AdminUserProfile).filter(AdminUserProfile.user_id == user_id).first()

        last_login_at = getattr(act, "last_login_at", None) if act else user.last_login_at
        last_charge_at = getattr(act, "last_charge_at", None) if act else None
        last_play_at = getattr(act, "last_play_at", None) if act else None
        last_active_at = _max_dt(last_login_at, last_charge_at, last_play_at)

        return SegmentContext(
            last_login_at=last_login_at,
            last_charge_at=last_charge_at,
            last_play_at=last_play_at,
            last_active_at=last_active_at,
            days_since_last_login=_days_since(now, last_login_at),
            days_since_last_charge=_days_since(now, last_charge_at),
            days_since_last_play=_days_since(now, last_play_at),
            days_since_last_active=_days_since(now, last_active_at),
            deposit_amount=getattr(ext, "deposit_amount", 0) if ext else 0,
            roulette_plays=getattr(act, "roulette_plays", 0) if act else 0,
            dice_plays=getattr(act, "dice_plays", 0) if act else 0,
            lottery_plays=getattr(act, "lottery_plays", 0) if act else 0,
            total_play_duration=getattr(act, "total_play_duration", 0) if act else 0,
            # Expanded metrics
            level=user.level or 1,
            xp=user.xp or 0,
            cash_balance=float(user.cash_balance or 0),
            vault_balance=float(user.vault_balance or 0),
            login_streak=user.login_streak or 0,
        )

    @staticmethod
    def get_users_by_segment(db: Session, segment_type: str, limit: int = 100) -> List[int]:
        """Get user IDs belonging to a specific segment.
        
        Prioritizes the persistent UserSegment table for standard 5-tier segments.
        Falls back to dynamic calculation for special/operational filters.
        """
        now = datetime.utcnow()
        active_24h = now - timedelta(hours=24)
        active_7d = now - timedelta(days=7)
        inactive_30d = now - timedelta(days=30)

        # 1. Standard 5-tier segments (Source of Truth: UserSegment table)
        # Standard Segments: VIP, ACTIVE, AT_RISK, DORMANT, NEW
        standard_segments = ["VIP", "ACTIVE", "AT_RISK", "DORMANT", "NEW"]
        
        if segment_type in standard_segments:
            return [
                r[0] for r in db.query(UserSegment.user_id)
                .filter(UserSegment.segment == segment_type)
                .limit(limit)
                .all()
            ]

        # 2. Dynamic / Operational / Special Filters
        query = db.query(User.id)

        if segment_type == "TOTAL_USERS":
            pass # No filter
        elif segment_type == "ACTIVE_USERS":
            query = query.filter(User.last_login_at >= active_7d)
        elif segment_type == "PAYING_USERS" or segment_type == "CONVERTED":
            query = query.join(ExternalRankingData, User.id == ExternalRankingData.user_id)\
                         .filter(ExternalRankingData.deposit_amount > 0)
        elif segment_type == "WHALE":
            # NOTE: WHALE is a dynamic filter. Persistent VIPs might be different.
            query = query.join(VaultEarnEvent, User.id == VaultEarnEvent.user_id)\
                         .group_by(User.id)\
                         .having(func.sum(VaultEarnEvent.amount) >= WHALE_ACCRUAL_THRESHOLD)
        elif segment_type == "EMPTY_TANK":
            query = query.filter(
                User.last_login_at >= active_24h,
                (func.coalesce(User.cash_balance, 0) + func.coalesce(User.vault_balance, 0)) < EMPTY_TANK_THRESHOLD
            )
        elif segment_type.startswith("CHARGE_"):
            risk = segment_type.split("_")[1]
            query = query.join(AdminUserProfile, User.id == AdminUserProfile.user_id)
            if risk == "LOW":
                query = query.filter(AdminUserProfile.days_since_last_charge < 7)
            elif risk == "MEDIUM":
                query = query.filter(AdminUserProfile.days_since_last_charge >= 7, AdminUserProfile.days_since_last_charge < 30)
            elif risk == "HIGH":
                query = query.filter(AdminUserProfile.days_since_last_charge >= 30)
        
        return [r[0] for r in query.limit(limit).all()]

    @staticmethod
    def get_overall_stats(db: Session) -> Dict[str, Any]:
        """Get aggregated CRM stats for dashboard."""
        
        # 1. Total Users
        total_users = db.query(func.count(User.id)).scalar() or 0
        now = datetime.utcnow()
        
        # 2. Active Users (Login < 7 days)
        active_threshold = now - timedelta(days=7)
        active_users = db.query(func.count(User.id)).filter(User.last_login_at >= active_threshold).scalar() or 0
        
        # 3. Paying Users (Converted = External Ranking Data with deposit > 0)
        paying_users = db.query(func.count(ExternalRankingData.id))\
            .filter(ExternalRankingData.deposit_amount > 0)\
            .scalar() or 0
            
        # 4. Whales (Total Earned >= Threshold)
        whale_count = db.query(VaultEarnEvent.user_id)\
            .group_by(VaultEarnEvent.user_id)\
            .having(func.sum(VaultEarnEvent.amount) >= WHALE_ACCRUAL_THRESHOLD)\
            .count()
            
        # 5. Conversion Rate
        conversion_rate = 0.0
        if total_users > 0:
            conversion_rate = round((paying_users / total_users) * 100, 2)
            
        # 6. Retention (Simple Day 1 vs Day 7 proxy or just Active %)
        retention_rate = round((active_users / total_users) * 100, 2) if total_users > 0 else 0
        
        # 7. Empty Tank (Opportunity)
        active_24h = now - timedelta(hours=24)
        empty_tank_count = db.query(func.count(User.id))\
            .filter(
                User.last_login_at >= active_24h,
                (func.coalesce(User.cash_balance, 0) + func.coalesce(User.vault_balance, 0)) < EMPTY_TANK_THRESHOLD
            ).scalar() or 0

        # --- Advanced KPIs ---
        
        # 8. Churn Rate (Inactive > 30 days)
        inactive_threshold = now - timedelta(days=30)
        # Users who haven't logged in for 30 days (or never)
        churned_users = db.query(func.count(User.id)).filter(
            (User.last_login_at < inactive_threshold) | (User.last_login_at == None)
        ).scalar() or 0
        churn_rate = round((churned_users / total_users) * 100, 2) if total_users > 0 else 0

        # 9. LTV (Lifetime Value) Proxy: Avg VaultEarnEvent amount per user
        total_value = db.query(func.sum(VaultEarnEvent.amount)).scalar() or 0
        ltv = round(total_value / total_users, 2) if total_users > 0 else 0

        # 10. ARPU (Removed as requested)
        arpu = 0.0

        # 11. New User Growth (7 days)
        week_ago = now - timedelta(days=7)
        new_users_7d = db.query(func.count(User.id)).filter(User.created_at >= week_ago).scalar() or 0
        new_user_growth = round((new_users_7d / total_users) * 100, 2) if total_users > 0 else 0

        # 12. Message Open Rate
        # Lazy import to avoid circular dependency at module level if any
        from app.models.admin_message import AdminMessage
        msg_stats = db.query(
            func.sum(AdminMessage.recipient_count), 
            func.sum(AdminMessage.read_count)
        ).first()
        total_sent = msg_stats[0] or 0
        total_reads = msg_stats[1] or 0
        message_open_rate = round((total_reads / total_sent) * 100, 2) if total_sent > 0 else 0

        # 13. Segmentation (Activity Frequency)
        daily_count = db.query(func.count(User.id)).filter(User.last_login_at >= active_24h).scalar() or 0
        weekly_count = db.query(func.count(User.id)).filter(User.last_login_at >= active_threshold, User.last_login_at < active_24h).scalar() or 0
        monthly_count = db.query(func.count(User.id)).filter(User.last_login_at >= inactive_threshold, User.last_login_at < active_threshold).scalar() or 0
        dormant_count = db.query(func.count(User.id)).filter(
            (User.last_login_at < inactive_threshold) | (User.last_login_at == None)
        ).scalar() or 0
        
        segments = {
            "DAILY": daily_count,
            "WEEKLY": weekly_count,
            "MONTHLY": monthly_count,
            "DORMANT": dormant_count
        }

        # 14. NEW: Imported Profile Metrics (from AdminUserProfile)
        # Average Active Days (from CSV imported data)
        avg_active_days_result = db.query(func.avg(AdminUserProfile.total_active_days)).filter(
            AdminUserProfile.total_active_days != None
        ).scalar()
        
        avg_active_days = 0
        if avg_active_days_result:
            avg_active_days = round(float(avg_active_days_result), 1)
        else:
            # Fallback: Avg Tenure (Days since created_at)
            # MySQL: DATEDIFF(NOW(), created_at)
            # SQLite: julian day diff? kept simple for now
            try:
                # Attempt MySQL syntax first
                avg_tenure = db.query(func.avg(func.datediff(func.now(), User.created_at))).scalar()
                if avg_tenure:
                    avg_active_days = round(float(avg_tenure), 1)
            except:
                # Fallback for SQLite or other DBs if datediff fails
                pass

        # 15. Charge Risk Segments (based on days_since_last_charge)
        # Low Risk: < 7 days, Medium: 7-30 days, High: > 30 days
        charge_low_risk = db.query(func.count(AdminUserProfile.user_id)).filter(
            AdminUserProfile.days_since_last_charge != None,
            AdminUserProfile.days_since_last_charge < 7
        ).scalar() or 0
        
        charge_medium_risk = db.query(func.count(AdminUserProfile.user_id)).filter(
            AdminUserProfile.days_since_last_charge != None,
            AdminUserProfile.days_since_last_charge >= 7,
            AdminUserProfile.days_since_last_charge < 30
        ).scalar() or 0
        
        charge_high_risk = db.query(func.count(AdminUserProfile.user_id)).filter(
            AdminUserProfile.days_since_last_charge != None,
            AdminUserProfile.days_since_last_charge >= 30
        ).scalar() or 0

        charge_risk_segments = {
            "LOW": charge_low_risk,      # < 7 days
            "MEDIUM": charge_medium_risk, # 7-30 days
            "HIGH": charge_high_risk      # > 30 days
        }

        # 16. Tag Distribution (count users per tag)
        # Get all profiles with tags
        profiles_with_tags = db.query(AdminUserProfile).filter(
            AdminUserProfile.tags != None
        ).all()
        
        tag_counts = {}
        for profile in profiles_with_tags:
            if profile.tags:
                for tag in profile.tags:
                    tag_counts[tag] = tag_counts.get(tag, 0) + 1

        # 17. NEW: Game & Vault KPIs (2026-01-03)
        roulette_spins = db.query(func.count(RouletteLog.id)).scalar() or 0
        dice_rolls = db.query(func.count(DiceLog.id)).scalar() or 0
        
        avg_vault_result = db.query(func.avg(User.vault_locked_balance)).filter(
            User.vault_locked_balance > 0
        ).scalar()
        avg_vault_balance = round(float(avg_vault_result), 0) if avg_vault_result else 0.0

        # 18. NEW: Financial KPIs (2026-01-03)
        financial_stats = db.query(
            func.sum(ExternalRankingData.deposit_amount),
            func.sum(ExternalRankingData.play_count)
        ).first()
        total_deposit_amount = int(financial_stats[0] or 0)
        total_play_count = int(financial_stats[1] or 0)

        # 18.1 운영형 외부 입금액 (KST 오늘/최근 7일 델타)
        try:
            from zoneinfo import ZoneInfo

            kst_today = datetime.now(ZoneInfo("Asia/Seoul")).date()
        except Exception:
            kst_today = datetime.utcnow().date()

        last7_start = kst_today - timedelta(days=6)
        today_deposit_amount = int(
            db.query(func.sum(ExternalRankingDailyDepositDelta.deposit_delta))
            .filter(ExternalRankingDailyDepositDelta.kst_date == kst_today)
            .scalar()
            or 0
        )
        last7d_deposit_amount = int(
            db.query(func.sum(ExternalRankingDailyDepositDelta.deposit_delta))
            .filter(ExternalRankingDailyDepositDelta.kst_date >= last7_start)
            .scalar()
            or 0
        )

        return {
            "total_users": total_users,
            "active_users": active_users,
            "paying_users": paying_users,
            "whale_count": whale_count,
            "conversion_rate": conversion_rate,
            "retention_rate": retention_rate, 
            "empty_tank_count": empty_tank_count,
            "churn_rate": churn_rate,
            "ltv": ltv,
            "arpu": arpu,
            "new_user_growth": new_user_growth,
            "message_open_rate": message_open_rate,
            "segments": segments,
            # New Imported Data KPIs
            "avg_active_days": avg_active_days,
            "charge_risk_segments": charge_risk_segments,
            "tag_counts": tag_counts,
            # New Game/Vault KPIs
            "roulette_spins": roulette_spins,
            "dice_rolls": dice_rolls,
            "avg_vault_balance": avg_vault_balance,
            # New Financial KPIs
            "total_deposit_amount": total_deposit_amount,
            "today_deposit_amount": today_deposit_amount,
            "last7d_deposit_amount": last7d_deposit_amount,
            "total_play_count": total_play_count
        }

