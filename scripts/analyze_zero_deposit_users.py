
import sys
import os
from datetime import datetime, date
from sqlalchemy import create_engine, select, or_
from sqlalchemy.orm import sessionmaker

# Add app to path
sys.path.append(os.getcwd())

from app.core.config import get_settings
from app.models.user import User

# Setup DB
settings = get_settings()
engine = create_engine(settings.database_url)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def analyze_zero_deposit_users():
    db = SessionLocal()
    try:
        # Criteria:
        # 1. Total Charge == 0
        # 2. Active in 2026-01 (Login or Play)
        start_date = datetime(2026, 1, 1)
        
        stmt = select(User).where(
            User.total_charge_amount == 0,
            or_(
                User.last_login_at >= start_date,
                User.last_play_date >= start_date.date()
            )
        ).order_by(User.last_login_at.desc())
        
        users = db.execute(stmt).scalars().all()
        
        print(f"## 🚨 무입금 활동 유저 리스트 (Zero-Deposit Active Users)")
        print(f"> **기준**: 2026-01-01 이후 접속/플레이 이력이 있는 무입금 유저 (총 {len(users)}명)")
        print("")
        print("| ID | 닉네임 | 레벨 | 금고잔액 | 최근접속 | 최근플레이 | 비고 |")
        print("|:---|:---|:---|---:|:---|:---|:---|")
        
        for u in users:
            last_login = u.last_login_at.strftime('%Y-%m-%d %H:%M') if u.last_login_at else "-"
            last_play = str(u.last_play_date) if u.last_play_date else "-"
            vault = f"{u.vault_locked_balance:,}원"
            
            note = ""
            if u.vault_locked_balance >= 30000:
                note = "⚠️한도초과"
            elif u.vault_locked_balance >= 10000:
                note = "잠재고객"
            
            print(f"| {u.id} | {u.nickname} | {u.level} | {vault} | {last_login} | {last_play} | {note} |")

    finally:
        db.close()

if __name__ == "__main__":
    analyze_zero_deposit_users()
