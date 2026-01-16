
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.session import SessionLocal
from app.models.user import User
from app.models.mission import UserMissionProgress, Mission
from app.models.game_wallet_ledger import UserGameWalletLedger
from app.models.feature import UserEventLog
import json

def check_user_welcome_rewards(user_id):
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            print(f"User {user_id} not found")
            return

        print(f"Checking rewards for User {user_id} ({user.external_id})")
        
        # Check mission progress
        progress = db.query(UserMissionProgress).join(Mission).filter(
            UserMissionProgress.user_id == user_id,
            Mission.logic_key == 'NEW_USER_WELCOME_TICKET'
        ).first()
        
        if progress:
            print(f"Mission 'NEW_USER_WELCOME_TICKET' status: completed={progress.is_completed}, claimed={progress.is_claimed}")
        else:
            print("Mission 'NEW_USER_WELCOME_TICKET' progress not found")

        # Check Event Logs
        logs = db.query(UserEventLog).filter(
            UserEventLog.user_id == user_id,
            UserEventLog.event_name.like("%reward%")
        ).all()
        print("\nEvent Logs:")
        for log in logs:
            print(f"- {log.event_name}: {log.meta_json}")

        # Check Wallet Ledger
        ledger = db.query(UserGameWalletLedger).filter(
            UserGameWalletLedger.user_id == user_id
        ).order_by(UserGameWalletLedger.created_at.desc()).limit(10).all()
        print("\nWallet Ledger (Last 10):")
        for entry in ledger:
            print(f"- {entry.token_type}: {entry.delta} (Reason: {entry.reason}, Label: {entry.label})")

    finally:
        db.close()

if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1:
        check_user_welcome_rewards(int(sys.argv[1]))
    else:
        # Try to find a recent user
        db = SessionLocal()
        last_user = db.query(User).order_by(User.id.desc()).first()
        db.close()
        if last_user:
            check_user_welcome_rewards(last_user.id)
