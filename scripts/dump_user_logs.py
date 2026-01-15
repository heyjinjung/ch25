
import sys
import os
import datetime
from sqlalchemy import create_engine, desc
from sqlalchemy.orm import sessionmaker

# Add parent directory to path
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from app.core.config import get_settings
from app.models.user import User
from app.models.roulette import RouletteLog
from app.models.dice import DiceLog
from app.models.vault_earn_event import VaultEarnEvent
from app.models.inventory import UserInventoryLedger
from app.models.game_wallet_ledger import UserGameWalletLedger
from app.models.feature import UserEventLog

def main():
    settings = get_settings()
    engine = create_engine(settings.database_url, pool_pre_ping=True)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()

    target_input = "103"
    if len(sys.argv) > 1:
        target_input = sys.argv[1]

    print(f"[*] Searching for user: {target_input}")
    
    user = None
    if target_input.isdigit():
        user = db.query(User).filter(User.id == int(target_input)).first()
    
    if not user:
        user = db.query(User).filter(User.nickname == target_input).first()

    if not user:
        print("[!] User not found.")
        return

    print(f"[*] Found User: ID={user.id}, Nickname={user.nickname}")

    logs = []

    # 1. Roulette Logs
    r_logs = db.query(RouletteLog).filter(RouletteLog.user_id == user.id).order_by(desc(RouletteLog.created_at)).all()
    for l in r_logs:
        logs.append({
            "ts": l.created_at,
            "type": "GAME_PLAY",
            "detail": f"GAME:ROULETTE:{l.id}\t+{l.reward_amount:,}\t{l.reward_type}\nROULETTE\n{{\n  \"segment_id\": {l.segment_id},\n  \"reward_type\": \"{l.reward_type}\",\n  \"reward_amount\": {l.reward_amount}\n}}"
        })

    # 2. Dice Logs
    d_logs = db.query(DiceLog).filter(DiceLog.user_id == user.id).order_by(desc(DiceLog.created_at)).all()
    for l in d_logs:
        sign = "+" if l.reward_amount > 0 else ("-" if l.reward_amount < 0 else "") # Dice lose usually negative in wallet, but log amount might be absolute?
        # DiceLog reward_amount is usually the payout. 
        # But wait, User provided logs show "-500".
        # Let's assume reward_amount is signed or logic handles it. 
        # Actually DiceLog usually stores RESULT. 
        # If user lost 500, detail should reflect it.
        logs.append({
            "ts": l.created_at,
            "type": "GAME_PLAY",
            "detail": f"GAME:DICE:{l.id}\t{sign}{l.reward_amount:,}\t{l.result} ({l.user_sum} vs {l.dealer_sum})\nDICE\n{{\n  \"mode\": \"NORMAL\",\n  \"result\": \"{l.result}\",\n  \"reward_amount\": {l.reward_amount}\n}}"
        })

    # 3. Vault Earn Events
    v_logs = db.query(VaultEarnEvent).filter(VaultEarnEvent.user_id == user.id).order_by(desc(VaultEarnEvent.created_at)).all()
    for l in v_logs:
         logs.append({
            "ts": l.created_at,
            "type": "VAULT_EARN",
            "detail": f"VAULT:EARN:{l.id}\t+{l.amount:,}\t{l.source} ({l.earn_type})"
        })

    # 4. Inventory Ledger
    i_logs = db.query(UserInventoryLedger).filter(UserInventoryLedger.user_id == user.id).order_by(desc(UserInventoryLedger.created_at)).all()
    for l in i_logs:
         logs.append({
            "ts": l.created_at,
            "type": "INVENTORY",
            "detail": f"INV:{l.item_type}\t{l.change_amount:+}\tAfter: {l.balance_after}\tReason: {l.reason}"
        })
    
    # Sort by timestamp desc
    logs.sort(key=lambda x: x["ts"], reverse=True)

    # Output to file
    filename = f"user_{user.id}_full_log.txt"
    with open(filename, "w", encoding="utf-8") as f:
        f.write(f"User Analysis Log: {user.nickname} (ID: {user.id})\n")
        f.write(f"Generated At: {datetime.datetime.now()}\n")
        f.write("-" * 80 + "\n")
        for log in logs:
            f.write(f"{log['ts']}\t{log['type']}\t{log['detail']}\n")
            f.write("-" * 40 + "\n")

    print(f"[*] Log extracted to {filename}")
    # Also print first 10 lines to stdout for immediate view
    print("[*] Preview (Top 5):")
    for log in logs[:5]:
         print(f"{log['ts']}  {log['type']}  {log['detail'].splitlines()[0]}")

if __name__ == "__main__":
    main()
