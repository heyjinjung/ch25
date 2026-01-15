
import os
import sys
from sqlalchemy import create_engine, text
from pprint import pprint
import datetime

# DB Connection
DATABASE_URL = "mysql+pymysql://root:2026@localhost:3307/xmas_event"
engine = create_engine(DATABASE_URL)

def analyze_segments():
    with engine.connect() as conn:
        print("--- Segment Analysis Report ---")
        now = datetime.datetime.now()
        
        # 1. VIP (Deposit >= 100,000)
        print("\n[1. VIP Targets] (Deposit >= 100,000)")
        query_vip = text("""
            SELECT id, nickname, total_charge_amount, telegram_username, external_id
            FROM user
            WHERE total_charge_amount >= 100000
            ORDER BY total_charge_amount DESC
        """)
        vips = conn.execute(query_vip).fetchall()
        for r in vips:
            amount = r.total_charge_amount or 0
            print(f"- {r.nickname} (Dep: {amount:,}) - @{r.telegram_username}")
            
        # 2. Churned/Sleeper (Last login > 3 days ago, Vault > 0)
        print("\n[2. Churned/Sleeper] (No login 3 days, Vault > 0)")
        query_churn = text("""
            SELECT id, nickname, vault_locked_balance, last_login_at, telegram_username
            FROM user
            WHERE last_login_at < DATE_SUB(NOW(), INTERVAL 3 DAY)
            AND vault_locked_balance > 0
            ORDER BY vault_locked_balance DESC
        """)
        churns = conn.execute(query_churn).fetchall()
        for r in churns:
            balance = r.vault_locked_balance or 0
            print(f"- {r.nickname} (Vault: {balance:,}, Last: {r.last_login_at}) - @{r.telegram_username}")

        # 3. Window Shoppers (Active recently, Deposit = 0)
        print("\n[3. Window Shoppers] (Login < 24h, Deposit = 0)")
        query_shopper = text("""
            SELECT id, nickname, last_login_at, telegram_username
            FROM user
            WHERE last_login_at > DATE_SUB(NOW(), INTERVAL 24 HOUR)
            AND total_charge_amount = 0
            ORDER BY last_login_at DESC
        """)
        shoppers = conn.execute(query_shopper).fetchall()
        for r in shoppers:
            print(f"- {r.nickname} (Last: {r.last_login_at}) - @{r.telegram_username}")

        # 4. Active Users (Just for count)
        print("\n[Summary Stats]")
        total = conn.execute(text("SELECT COUNT(*) FROM user")).scalar()
        print(f"Total Users: {total}")

if __name__ == "__main__":
    analyze_segments()
