import sys
import os
from datetime import datetime
from zoneinfo import ZoneInfo
from sqlalchemy import create_engine, text
import pandas as pd

# DB 연결 정보 (로컬 기준, 필요시 환경변수로 대체)
DB_URL = os.environ.get("DB_URL", "mysql+pymysql://xmasuser:2026@localhost:3306/xmas_event")
engine = create_engine(DB_URL)

# 집계 기간
PERIODS = [
    ("2026-01-01", "2026-01-14", "2026년 1월 1일~14일"),
    ("2026-01-15", "2026-01-15", "2026년 1월 15일")
]

# 1. 로그인 유저 수 (user_activity 기준)
def get_login_users(start, end):
    sql = text("""
        SELECT COUNT(DISTINCT user_id) AS login_users
        FROM user_activity
        WHERE last_login_at >= :start AND last_login_at < DATE_ADD(:end, INTERVAL 1 DAY)
    """)
    with engine.connect() as conn:
        return conn.execute(sql, {"start": start, "end": end}).scalar()

# 2. 외부랭킹입금내역 (external_ranking_data)
def get_external_ranking():
    sql = text("""
        SELECT u.nickname, e.deposit_amount
        FROM external_ranking_data e
        JOIN user u ON e.user_id = u.id
        ORDER BY e.deposit_amount DESC
    """)
    with engine.connect() as conn:
        return pd.read_sql(sql, conn)

# 3. 유저별 게임플레이횟수 (user_event_log, event_name='GAME_PLAY')
def get_game_play_counts(start, end):
    sql = text("""
        SELECT u.nickname, COUNT(*) AS play_count
        FROM user_event_log l
        JOIN user u ON l.user_id = u.id
        WHERE l.event_name = 'GAME_PLAY'
          AND l.created_at >= :start AND l.created_at < DATE_ADD(:end, INTERVAL 1 DAY)
        GROUP BY l.user_id
        ORDER BY play_count DESC
    """)
    with engine.connect() as conn:
        return pd.read_sql(sql, conn)

# 4. 금고적립액 (user.vault_locked_balance)
def get_vault_balances():
    sql = text("""
        SELECT nickname, vault_locked_balance
        FROM user
        WHERE vault_locked_balance > 0
        ORDER BY vault_locked_balance DESC
    """)
    with engine.connect() as conn:
        return pd.read_sql(sql, conn)

# 5. 인벤토리 지급내역 (user_inventory_ledger, credit만)
def get_inventory_grants(start, end):
    sql = text("""
        SELECT u.nickname, l.item_type, SUM(l.amount) AS total_granted
        FROM user_inventory_ledger l
        JOIN user u ON l.user_id = u.id
        WHERE l.amount > 0
          AND l.created_at >= :start AND l.created_at < DATE_ADD(:end, INTERVAL 1 DAY)
        GROUP BY l.user_id, l.item_type
        ORDER BY total_granted DESC
    """)
    with engine.connect() as conn:
        return pd.read_sql(sql, conn)

if __name__ == "__main__":
    for start, end, label in PERIODS:
        print(f"==== {label} ====")
        print(f"[1] 로그인 유저 수: {get_login_users(start, end)}")
        print(f"[2] 외부랭킹입금내역 (누적)")
        print(get_external_ranking().head(10))
        print(f"[3] 유저별 게임플레이횟수")
        print(get_game_play_counts(start, end).head(10))
        print(f"[4] 금고적립액 (누적)")
        print(get_vault_balances().head(10))
        print(f"[5] 인벤토리 지급내역")
        print(get_inventory_grants(start, end).head(10))
        print("\n")
