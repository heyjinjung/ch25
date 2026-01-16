import sys
import os
import csv
from datetime import datetime, timedelta

# Add project root
sys.path.append(os.getcwd())

from sqlalchemy import func
from app.db.session import SessionLocal
from app.models.user import User
from app.models.user_activity import UserActivity
from app.models.game_wallet import UserGameWallet, GameTokenType
from app.models.external_ranking_daily_deposit_delta import ExternalRankingDailyDepositDelta

def get_kst_now():
    return datetime.utcnow() + timedelta(hours=9)

def analyze():
    db = SessionLocal()
    kst_now = get_kst_now()
    today_date = kst_now.date()
    
    print(f"=== RETENTION REPORT V3 (Liquidity Deep Dive) ===")
    print(f"Date(KST): {today_date}")
    
    # 1. Money Flow (External)
    today_deposits = db.query(
        ExternalRankingDailyDepositDelta.user_id,
        ExternalRankingDailyDepositDelta.deposit_delta
    ).filter(
        ExternalRankingDailyDepositDelta.kst_date == today_date,
        ExternalRankingDailyDepositDelta.deposit_delta > 0
    ).all()
    
    total_deposit_krw = sum(d.deposit_delta for d in today_deposits)
    # If script sees 2.6M but user says 3.85M, we trust the logic but note the gap.
    # We will use the user's 3.85M for narrative if needed, but script prints actual DB sum.
    print(f"💰 Today Deposit (DB): {total_deposit_krw:,} KRW")

    # 2. Ammo Check (Tickets in Hand)
    # Fetch all wallets for key tokens
    target_tokens = [
        GameTokenType.ROULETTE_COIN, 
        GameTokenType.DICE_TOKEN, 
        GameTokenType.LOTTERY_TICKET
    ]
    
    wallets = db.query(UserGameWallet).filter(
        UserGameWallet.balance > 0,
        UserGameWallet.token_type.in_(target_tokens)
    ).all()
    
    total_ammo_count = sum(w.balance for w in wallets)
    # Estimate Ammo Value (1 Ticket = 1000 KRW)
    total_ammo_value = total_ammo_count * 1000
    
    print(f"🔫 Total Ammo in Wallets: {total_ammo_count:,} Tickets (~{total_ammo_value:,} KRW)")
    
    # 3. Liquidity Gap Analysis
    # Deposited: ~3,850,000 (User Input)
    # Played: ~223,000 (223 tickets)
    # Holding: ? (From DB)
    
    # Let's map wallet by user
    user_wallet_map = {}
    for w in wallets:
        if w.user_id not in user_wallet_map:
            user_wallet_map[w.user_id] = 0
        user_wallet_map[w.user_id] += w.balance

    # 4. User-Level Drill Down (Who is hoarding?)
    # Users who deposited TODAY
    today_depositor_ids = [d.user_id for d in today_deposits]
    
    print("\n[🕵️ Depositor Tracking (Where did the money go?)]")
    for uid, amt in today_deposits:
        user = db.query(User).get(uid)
        held_tickets = user_wallet_map.get(uid, 0)
        
        # Check Activity
        activity = db.query(UserActivity).filter(UserActivity.user_id == uid).first()
        last_play = activity.last_play_at if activity else None
        last_play_kst = (last_play + timedelta(hours=9)).date() if last_play else "Never"
        
        status = "❓ Unknown"
        if held_tickets > 5:
            if last_play_kst == today_date:
                status = "🐢 Slow Play (Holding)"
            else:
                status = "🛑 Hoarding (No Play)"
        elif held_tickets <= 5:
            if last_play_kst == today_date:
                status = "🔥 Burned (Active)"
            else:
                status = "💸 No Ammo (Conversion Fail?)"
                
        print(f"User {user.nickname}: Deposit +{amt:,} -> Held {held_tickets} Tickets. LastPlay: {last_play_kst} [{status}]")

    # 5. Global Balance Check (Vault vs Wallet)
    # Is the money stuck in Vault?
    # We check Total Vault Balance vs Total Wallet Value
    total_vault_locked = db.query(func.sum(User.vault_locked_balance)).scalar() or 0
    
    print(f"\n[🏦 System Asset Check]")
    print(f"Total Vault Locked: {total_vault_locked:,} KRW (Stuck)")
    print(f"Total Wallet Value: {total_ammo_value:,} KRW (Liquid)")
    
    if total_vault_locked > total_ammo_value * 10:
        print("=> 🚨 CRITICAL: Assets are 90%+ Locked in Vault. Users have no liquidity.")
    elif total_ammo_value > 2000000:
        print("=> ⚠️ WARNING: High Liquidity but Low Play. Game is boring?")
    else:
        print("=> ℹ️ Balanced or Low Volume.")

if __name__ == "__main__":
    analyze()
