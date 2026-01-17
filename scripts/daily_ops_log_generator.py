#!/usr/bin/env python3
"""
일일 운영일지 생성기 (Daily Ops Log Generator)
목적: "일별 변화(Yesterday vs Today)"에 집중한 상세 리포트 자동 생성
권한: 운영자 전용
실행: python scripts/daily_ops_log_generator.py [--date YYYY-MM-DD]
"""

import argparse
import subprocess
import sys
from datetime import datetime, timedelta
import json
import os

# Configuration
DB_CONTAINER = "xmas-db" # Or 'db' if using compose exec
DB_USER = "root"
DB_PASS = "2026"
DB_NAME = "xmas_event"

def run_query(query: str) -> str:
    """Run MySQL query via docker exec."""
    clean_query = ' '.join(query.split())
    # Try docker exec first (if container name is known)
    # Using 'xmas-db' as identified in `docker ps`
    cmd = f'docker exec -i {DB_CONTAINER} mysql -u {DB_USER} -p{DB_PASS} {DB_NAME} -N -e "{clean_query}"'
    result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    
    if result.returncode != 0:
        # Fallback to docker compose if direct exec fails (rare but possible)
        cmd = f'docker compose exec -T db mysql -u {DB_USER} -p{DB_PASS} {DB_NAME} -N -e "{clean_query}"'
        result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
        
    return result.stdout.strip()

def get_game_stats(target_date: str):
    """Get play count and DAU for each game on a specific date (Based on WALLET LEDGER)."""
    # Used Ledger as SoT because game logs (roulette/lottery) were missing during incidents.
    games_ledger_map = {
        'DICE_PLAY': 'Dice',
        'ROULETTE_PLAY': 'Roulette',
        'LOTTERY_PLAY': 'Lottery'
    }
    stats = {}
    for reason, label in games_ledger_map.items():
        query = f"""
        SELECT COUNT(*), COUNT(DISTINCT user_id) 
        FROM user_game_wallet_ledger 
        WHERE reason = '{reason}'
          AND delta < 0
          AND DATE(DATE_ADD(created_at, INTERVAL 9 HOUR)) = '{target_date}'
        """
        output = run_query(query)
        try:
            plays, dau = map(int, output.split('\t'))
        except:
            plays, dau = 0, 0
        stats[label] = {'plays': plays, 'dau': dau}
    return stats

def get_vault_stats(target_date: str):
    """Get vault accrual stats for a date."""
    query = f"""
    SELECT COALESCE(SUM(amount), 0), COUNT(DISTINCT user_id)
    FROM vault_earn_event
    WHERE DATE(DATE_ADD(created_at, INTERVAL 9 HOUR)) = '{target_date}'
    """
    output = run_query(query)
    try:
        amount, users = map(int, output.split('\t'))
    except:
        amount, users = 0, 0
    return {'amount': amount, 'users': users}

def get_inventory_snapshot():
    """Get current total supply of key items."""
    # Mapping enum to display label
    # 'ROULETTE_COIN','DICE_TOKEN','LOTTERY_TICKET','GOLD_KEY','DIAMOND','DIAMOND_KEY'
    query = """
    SELECT token_type, SUM(balance) 
    FROM user_game_wallet 
    GROUP BY token_type
    """
    output = run_query(query)
    inv = {}
    for line in output.split('\n'):
        if not line.strip(): continue
        parts = line.split('\t')
        if len(parts) == 2:
            inv[parts[0]] = int(parts[1])
            
    # Vault Current Balance (Updated to use user.vault_locked_balance as SoT)
    # vault_status table is deprecated.
    query_vault = "SELECT SUM(vault_locked_balance), COUNT(*) FROM user WHERE vault_locked_balance > 0"
    v_out = run_query(query_vault)
    try:
        v_bal, v_users = map(int, v_out.split('\t'))
    except:
        v_bal, v_users = 0, 0
        
    return inv, v_bal, v_users

def get_conversion_stats(target_date: str):
    """Get conversion from Game Play -> External Deposit (approx)."""
    # Simply check: of users who played Dice today, how many deposited?
    stats = {}
    
    # Map label -> ledger reason
    target_games = {
        'dice': 'DICE_PLAY', 
        'roulette': 'ROULETTE_PLAY'
    }

    for label, reason in target_games.items():
        query = f"""
        SELECT COUNT(DISTINCT t1.user_id), 
               COUNT(DISTINCT CASE WHEN t2.deposit_delta > 0 THEN t1.user_id END)
        FROM user_game_wallet_ledger t1
        LEFT JOIN external_ranking_daily_deposit_delta t2 
            ON t1.user_id = t2.user_id AND t2.kst_date = '{target_date}'
        WHERE t1.reason = '{reason}'
          AND t1.delta < 0
          AND DATE(DATE_ADD(t1.created_at, INTERVAL 9 HOUR)) = '{target_date}'
        """
        output = run_query(query)
        try:
            total_players, depositors = map(int, output.split('\t'))
            rate = (depositors / total_players * 100) if total_players > 0 else 0
        except:
            total_players, depositors, rate = 0, 0, 0
            
        stats[label] = {
            'players': total_players, 
            'depositors': depositors, 
            'rate': round(rate, 1)
        }
    return stats

def generate_report(date_str: str):
    target_date = datetime.strptime(date_str, "%Y-%m-%d")
    yesterday = target_date - timedelta(days=1)
    day_before = target_date - timedelta(days=2)
    
    today_s = target_date.strftime("%Y-%m-%d")
    yst_s = yesterday.strftime("%Y-%m-%d")
    dbf_s = day_before.strftime("%Y-%m-%d")
    
    # 1. Gather Data
    stats_today = get_game_stats(today_s)
    stats_yst = get_game_stats(yst_s)
    stats_dbf = get_game_stats(dbf_s)
    
    vault_today = get_vault_stats(today_s)
    vault_yst = get_vault_stats(yst_s)
    
    inv_map, vault_bal, vault_users = get_inventory_snapshot()
    
    conv_today = get_conversion_stats(today_s)
    
    # 2. Format Logic (Delta Calculation)
    def calc_delta(curr, prev):
        if prev == 0: return "▲∞" if curr > 0 else "-"
        pct = int(((curr - prev) / prev) * 100)
        symbol = "▲" if pct > 0 else "▼"
        return f"{symbol}{abs(pct)}%"

    # 3. Build Markdown
    md = f"""# 📋 CC 일일 리텐션 운영일지 ({today_s})

> **목적**: 금일({today_s[5:]}) 및 전일({yst_s[5:]}) 대비 시스템 활동 변화 집중 모니터링
> **작성시각**: {datetime.now().strftime("%Y-%m-%d %H:%M")} (KST, Server Time)
> **동기화**: DB 실시간 조회

---

## 1. 🚨 긴급/특이 사항
- (작성 필요: 금일 배포 내역이나 특이 이슈 기재)
- 예: 복권 시스템 개편 반영 완료, 금고 정책 변경 등.

---

## 2. 📊 일별 핵심 지표 (Daily Metrics)

### A. 게임 플레이 추이 (Activity Trend)
> 시스템 활성도를 나타내는 핵심 지표 (플레이 횟수 기준)

| 날짜 | 주사위(Dice) | 룰렛(Roulette) | 복권(Lottery) | 비고 |
|:---:|:---:|:---:|:---:|:---|
| **{today_s} (Today)** | **{stats_today['Dice']['plays']}** | **{stats_today['Roulette']['plays']}** | **{stats_today['Lottery']['plays']}** | (진행중) |
| {yst_s} (Yesterday) | **{stats_yst['Dice']['plays']}** (`{calc_delta(stats_yst['Dice']['plays'], stats_dbf['Dice']['plays'])}`) | **{stats_yst['Roulette']['plays']}** (`{calc_delta(stats_yst['Roulette']['plays'], stats_dbf['Roulette']['plays'])}`) | **{stats_yst['Lottery']['plays']}** (`{calc_delta(stats_yst['Lottery']['plays'], stats_dbf['Lottery']['plays'])}`) | 전일 대비 변화 |
| {dbf_s} (Day-2) | {stats_dbf['Dice']['plays']} | {stats_dbf['Roulette']['plays']} | {stats_dbf['Lottery']['plays']} | 기준점 |

**💡 자동 분석**:
- **주사위**: {yst_s} 기준 전일 대비 {calc_delta(stats_yst['Dice']['plays'], stats_dbf['Dice']['plays'])}
- **룰렛**: {yst_s} 기준 전일 대비 {calc_delta(stats_yst['Roulette']['plays'], stats_dbf['Roulette']['plays'])}

### B. 금고(Vault) 적립 현황
> 락인(Lock-in) 효과 지표

| 날짜 | 총 적립액 | 참여 유저 수 | 인당 평균 |
|:---:|:---:|:---:|:---:|
| {today_s} | {vault_today['amount']:,}원 | {vault_today['users']}명 | {vault_today['amount']//max(1, vault_today['users']):,}원 |
| {yst_s} | {vault_yst['amount']:,}원 | {vault_yst['users']}명 | {vault_yst['amount']//max(1, vault_yst['users']):,}원 |

---

## 3. 💰 경제 생태계 스냅샷 (Inventory & Assets)

### 재화 보유량 (잠재 부채)
- **주사위 티켓**: `{inv_map.get('DICE_TOKEN', 0)}개`
- **룰렛 티켓**: `{inv_map.get('ROULETTE_COIN', 0)}개` (프리코인)
- **복권 티켓**: `{inv_map.get('LOTTERY_TICKET', 0)}개`
- **골드키 / 다이아키**: `{inv_map.get('GOLD_KEY', 0)}개` / `{inv_map.get('DIAMOND_KEY', 0)}개`
- **다이아몬드**: `{inv_map.get('DIAMOND', 0)}개`

### 금고 잔고
- **총 보관액**: `{vault_bal:,}원` ({vault_users}명 보유 중)

---

## 4. 🎯 전환율 (Conversion, {today_s} 기준)

### 외부 랭킹 입금 전환 (활동 유저 중 입금자 비율)
- **주사위 유저**: `{conv_today['dice']['players']}명 중 {conv_today['dice']['depositors']}명 입금 ({conv_today['dice']['rate']:.1f}%)`
- **룰렛 유저**: `{conv_today['roulette']['players']}명 중 {conv_today['roulette']['depositors']}명 입금 ({conv_today['roulette']['rate']:.1f}%)`

---

## 5. 📝 운영 제언 (Action Items)
1. (자동 생성) 재화 보유량 기반: 복권 티켓 {inv_map.get('LOTTERY_TICKET', 0)}개 → 소진 이벤트 필요 여부 판단.
2. (자동 생성) 금고 참여자 수 변화를 보고 프로모션 결정.
"""
    return md

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--date", help="YYYY-MM-DD", default=datetime.now().strftime("%Y-%m-%d"))
    parser.add_argument("--out", help="Output file path", default="")
    args = parser.parse_args()
    
    print(f"Generating report for {args.date}...")
    report = generate_report(args.date)
    
    if args.out:
        os.makedirs(os.path.dirname(args.out), exist_ok=True)
        with open(args.out, "w", encoding="utf-8") as f:
            f.write(report)
        print(f"Report saved to {args.out}")
    else:
        print(report)
