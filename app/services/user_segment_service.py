
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
            
        db.commit()
        db.refresh(profile)
        return profile

    @staticmethod
    def get_computed_segments(db: Session, user_id: int) -> List[str]:
        """Calculate dynamic segments for a user."""
        segments = []
        
        # 1. Whale Check (Lifetime Accrual)
        total_accrued = db.query(func.sum(VaultEarnEvent.amount))\
            .filter(VaultEarnEvent.user_id == user_id)\
            .scalar() or 0
        
        if total_accrued >= WHALE_ACCRUAL_THRESHOLD:
            segments.append("WHALE")

        # 2. Cash-Outer Check (Withdrawal Freq/Amt)
        # Check last 30 days
        thirty_days_ago = datetime.utcnow() - timedelta(days=30)
        
        # Count unlocks (using VAULT_UNLOCK reason in ledger as proxy for "Cash Out intention")
        # Or better: check VaultStatus events if available, but Ledger is safer for historical data?
        # Actually, Ledger reason="VAULT_UNLOCK" is good.
        
        unlock_stats = db.query(
            func.count(UserCashLedger.id),
            func.sum(UserCashLedger.delta)
        ).filter(
            UserCashLedger.user_id == user_id,
            UserCashLedger.reason == "VAULT_UNLOCK",
            UserCashLedger.created_at >= thirty_days_ago
        ).first()
        
        unlock_count = unlock_stats[0] or 0
        unlock_amount = unlock_stats[1] or 0 # delta is positive for unlock? 
        # Wait, unlock adds to cash, so delta is positive.
        
        if unlock_count >= CASHOUT_FREQ_THRESHOLD or unlock_amount >= CASHOUT_AMOUNT_THRESHOLD:
            segments.append("CASH_OUTER")

        # 3. Paying User (Total Vault Unlock > 0)
        # Lifetime check
        lifetime_unlock = db.query(func.sum(UserCashLedger.delta))\
            .filter(
                UserCashLedger.user_id == user_id,
                UserCashLedger.reason == "VAULT_UNLOCK"
            ).scalar() or 0
            
        if lifetime_unlock > 0:
            segments.append("PAYING_USER")
        else:
            # Check for Potential Purchaser
            # Active (login < 3 days) + No Unlock
            user = db.query(User).filter(User.id == user_id).first()
            if user and user.last_login_at and user.last_login_at > (datetime.utcnow() - timedelta(days=3)):
                segments.append("POTENTIAL_PURCHASER")

        # 4. Empty Tank (Opportunity)
        # Active < 24h + Balance < 1000
        user = db.query(User).filter(User.id == user_id).first()
        if user and user.last_login_at and user.last_login_at > (datetime.utcnow() - timedelta(hours=24)):
            total_balance = (user.cash_balance or 0) + (user.vault_balance or 0) # Simplification
            if total_balance < EMPTY_TANK_THRESHOLD:
                segments.append("EMPTY_TANK")

        return segments

    @staticmethod
    def get_overall_stats(db: Session) -> Dict[str, Any]:
        """Get aggregated CRM stats for dashboard."""
        
        # 1. Total Users
        total_users = db.query(func.count(User.id)).scalar() or 0
        
        # 2. Active Users (Login < 7 days)
        active_threshold = datetime.utcnow() - timedelta(days=7)
        active_users = db.query(func.count(User.id)).filter(User.last_login_at >= active_threshold).scalar() or 0
        
        # 3. Paying Users (At least one Vault Unlock)
        # Efficient count distinct
        paying_users = db.query(func.count(func.distinct(UserCashLedger.user_id)))\
            .filter(UserCashLedger.reason == "VAULT_UNLOCK")\
            .scalar() or 0
            
        # 4. Whales (Total Earned >= Threshold)
        # Group by user having sum(amount)
        # This might be heavy if table is huge, but necessary for exact count.
        whale_count = db.query(VaultEarnEvent.user_id)\
            .group_by(VaultEarnEvent.user_id)\
            .having(func.sum(VaultEarnEvent.amount) >= WHALE_ACCRUAL_THRESHOLD)\
            .count()
            
        # 5. Conversion Rate
        conversion_rate = 0.0
        if active_users > 0:
            conversion_rate = round((paying_users / total_users) * 100, 2) if total_users > 0 else 0
            
        # 6. Retention (Simple Day 1 vs Day 7 proxy or just Active %)
        # Let's just return Active Rate for now
        retention_rate = round((active_users / total_users) * 100, 2) if total_users > 0 else 0
        
        # 7. Empty Tank (Opportunity)
        # Active in last 24h AND balance < 1000
        active_24h = datetime.utcnow() - timedelta(hours=24)
        empty_tank_count = db.query(func.count(User.id))\
            .filter(
                User.last_login_at >= active_24h,
                (func.coalesce(User.cash_balance, 0) + func.coalesce(User.vault_balance, 0)) < EMPTY_TANK_THRESHOLD
            ).scalar() or 0

        return {
            "total_users": total_users,
            "active_users": active_users,
            "paying_users": paying_users,
            "whale_count": whale_count,
            "conversion_rate": conversion_rate,
            "retention_rate": retention_rate, 
            "empty_tank_count": empty_tank_count
        }
