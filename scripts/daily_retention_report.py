#!/usr/bin/env python3
"""
일일 리텐션 분석 스크립트
운영서버 149 데이터를 기반으로 KPI 리포트를 자동 생성합니다.

사용법:
    python scripts/daily_retention_report.py [--sync] [--days N]
    
옵션:
    --sync: 실행 전 서버 데이터 동기화 (sync_db_production.ps1 호출)
    --days N: 분석할 일수 (기본값: 14)
"""

import subprocess
import sys
from datetime import datetime, timedelta
from pathlib import Path

# Configuration
DB_CONTAINER = "xmas-db"
DB_USER = "root"
DB_PASS = "2026"
DB_NAME = "xmas_event"
DEBUG = False  # Set to True for debugging

def run_query(query: str) -> str:
    """Execute MySQL query and return output."""
    # Clean up multi-line queries for shell execution
    clean_query = ' '.join(query.split())
    cmd = f'docker exec {DB_CONTAINER} mysql -u {DB_USER} -p{DB_PASS} {DB_NAME} -N -e "{clean_query}"'
    result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    # Get stdout and filter out any warning lines that might have leaked through
    output = result.stdout.strip()
    lines = [line for line in output.split('\n') 
             if line.strip() and 'Warning' not in line and not line.startswith('mysql:')]
    final_output = '\n'.join(lines)
    if DEBUG:
        print(f"[DEBUG] Query: {clean_query[:50]}...")
        print(f"[DEBUG] Output: {final_output[:100]}")
    return final_output




def get_daily_vault_accrual(start_date: str, end_date: str) -> dict:
    """Get daily vault accrual data."""
    query = f"""
    SELECT DATE(created_at) as d, SUM(amount), COUNT(DISTINCT user_id) 
    FROM vault_earn_event 
    WHERE DATE(created_at) BETWEEN '{start_date}' AND '{end_date}'
    GROUP BY DATE(created_at) ORDER BY d
    """
    result = run_query(query)
    data = {}
    for line in result.split('\n'):
        if line.strip():
            parts = line.split('\t')
            if len(parts) == 3:
                data[parts[0]] = {'amount': int(parts[1]), 'users': int(parts[2])}
    return data

def get_daily_game_plays(start_date: str, end_date: str) -> dict:
    """Get daily game play counts by game type."""
    games = ['dice_log', 'roulette_log', 'lottery_log']
    data = {}
    
    for game in games:
        query = f"""
        SELECT DATE(created_at) as d, COUNT(*), COUNT(DISTINCT user_id)
        FROM {game}
        WHERE DATE(created_at) BETWEEN '{start_date}' AND '{end_date}'
        GROUP BY DATE(created_at) ORDER BY d
        """
        result = run_query(query)
        game_name = game.replace('_log', '')
        for line in result.split('\n'):
            if line.strip():
                parts = line.split('\t')
                if len(parts) == 3:
                    date = parts[0]
                    if date not in data:
                        data[date] = {}
                    data[date][game_name] = {'plays': int(parts[1]), 'dau': int(parts[2])}
    return data

def get_external_ranking_stats() -> dict:
    """Get external ranking deposit statistics."""
    query = """
    SELECT 
        COUNT(*) as depositors,
        COALESCE(SUM(deposit_amount), 0) as total_deposit,
        COALESCE(SUM(play_count), 0) as total_plays
    FROM external_ranking_data WHERE deposit_amount > 0
    """
    result = run_query(query)
    try:
        parts = result.strip().split('\t')
        return {
            'depositors': int(parts[0]) if len(parts) > 0 and parts[0] else 0,
            'total_deposit': int(parts[1]) if len(parts) > 1 and parts[1] else 0,
            'total_plays': int(parts[2]) if len(parts) > 2 and parts[2] else 0
        }
    except (IndexError, ValueError):
        return {'depositors': 0, 'total_deposit': 0, 'total_plays': 0}


def get_token_holdings() -> dict:
    """Get current token holdings."""
    query = "SELECT token_type, SUM(balance) FROM user_game_wallet GROUP BY token_type"
    result = run_query(query)
    data = {}
    for line in result.split('\n'):
        if line.strip():
            parts = line.split('\t')
            if len(parts) == 2:
                data[parts[0]] = int(parts[1])
    return data

def get_vault_total() -> dict:
    """Get total vault holdings."""
    query = "SELECT SUM(vault_locked_balance), COUNT(*) FROM user WHERE vault_locked_balance > 0"
    result = run_query(query)
    parts = result.split('\t')
    return {
        'total': int(parts[0]) if parts[0] != 'NULL' else 0,
        'users': int(parts[1]) if parts[1] else 0
    }

def get_inventory_summary() -> dict:
    """Get inventory item summary."""
    query = "SELECT item_type, SUM(quantity) FROM user_inventory_item GROUP BY item_type"
    result = run_query(query)
    data = {}
    for line in result.split('\n'):
        if line.strip():
            parts = line.split('\t')
            if len(parts) == 2:
                data[parts[0]] = int(parts[1])
    return data

def get_cross_analysis() -> dict:
    """Get cross-analysis: game players who are external depositors."""
    # Dice players who deposited
    dice_query = """
    SELECT COUNT(DISTINCT dl.user_id) 
    FROM dice_log dl 
    INNER JOIN external_ranking_data erd ON dl.user_id = erd.user_id 
    WHERE erd.deposit_amount > 0
    """
    dice_depositors = int(run_query(dice_query) or 0)
    
    # Roulette players who deposited
    roulette_query = """
    SELECT COUNT(DISTINCT rl.user_id) 
    FROM roulette_log rl 
    INNER JOIN external_ranking_data erd ON rl.user_id = erd.user_id 
    WHERE erd.deposit_amount > 0
    """
    roulette_depositors = int(run_query(roulette_query) or 0)
    
    return {
        'dice_depositors': dice_depositors,
        'roulette_depositors': roulette_depositors
    }

def get_user_count() -> int:
    """Get total user count."""
    return int(run_query("SELECT COUNT(*) FROM user") or 0)

def calculate_averages(daily_data: dict, exclude_dates: list = None) -> dict:
    """Calculate averages from daily data."""
    if exclude_dates is None:
        exclude_dates = []
    
    filtered = {k: v for k, v in daily_data.items() if k not in exclude_dates}
    if not filtered:
        return {'amount': 0, 'users': 0}
    
    total_amount = sum(d.get('amount', 0) for d in filtered.values())
    total_users = sum(d.get('users', 0) for d in filtered.values())
    count = len(filtered)
    
    return {
        'amount': total_amount // count if count else 0,
        'users': round(total_users / count, 1) if count else 0
    }

def generate_report(analysis_days: int = 14):
    """Generate the daily retention report."""
    today = datetime.now()
    yesterday = today - timedelta(days=1)
    day_before = today - timedelta(days=2)
    start_date = (today - timedelta(days=analysis_days + 1)).strftime('%Y-%m-%d')
    
    today_str = today.strftime('%Y-%m-%d')
    yesterday_str = yesterday.strftime('%Y-%m-%d')
    day_before_str = day_before.strftime('%Y-%m-%d')
    
    print(f"\n{'='*60}")
    print(f"📊 CC 리텐션 일일 분석 리포트")
    print(f"분석일: {today.strftime('%Y-%m-%d %H:%M')}")
    print(f"{'='*60}\n")
    
    # 1. External Ranking
    ext_stats = get_external_ranking_stats()
    total_users = get_user_count()
    print("🎯 1순위: 외부 랭킹 입금")
    print(f"  총 입금 유저: {ext_stats['depositors']}명 ({ext_stats['depositors']/total_users*100:.1f}%)")
    print(f"  총 입금액: {ext_stats['total_deposit']:,}원")
    print(f"  총 플레이: {ext_stats['total_plays']}회")
    print()
    
    # 2. Vault Accrual
    vault_data = get_daily_vault_accrual(start_date, today_str)
    exclude_recent = [yesterday_str, day_before_str, today_str]
    avg_vault = calculate_averages(vault_data, exclude_recent)
    
    print("💰 금고 적립 현황")
    print(f"  {analysis_days}일 평균: {avg_vault['amount']:,}원 ({avg_vault['users']}명)")
    if day_before_str in vault_data:
        d = vault_data[day_before_str]
        print(f"  {day_before_str}: {d['amount']:,}원 ({d['users']}명)")
    if yesterday_str in vault_data:
        d = vault_data[yesterday_str]
        print(f"  {yesterday_str}: {d['amount']:,}원 ({d['users']}명)")
    print()
    
    # 3. Game Plays
    game_data = get_daily_game_plays(start_date, today_str)
    print("🎮 게임 플레이 현황")
    for date in [day_before_str, yesterday_str]:
        if date in game_data:
            gd = game_data[date]
            dice = gd.get('dice', {}).get('plays', 0)
            roulette = gd.get('roulette', {}).get('plays', 0)
            lottery = gd.get('lottery', {}).get('plays', 0)
            print(f"  {date}: 주사위 {dice}, 룰렛 {roulette}, 복권 {lottery}")
    print()
    
    # 4. Token Holdings
    tokens = get_token_holdings()
    print("🎫 티켓 보유 현황")
    print(f"  주사위: {tokens.get('DICE_TOKEN', 0)}개")
    print(f"  룰렛: {tokens.get('ROULETTE_COIN', 0)}개")
    print(f"  복권: {tokens.get('LOTTERY_TICKET', 0)}개")
    print(f"  골드키: {tokens.get('GOLD_KEY', 0)}개")
    print(f"  다이아키: {tokens.get('DIAMOND_KEY', 0)}개")
    print()
    
    # 5. Vault Total
    vault_total = get_vault_total()
    print("🏦 금고 보유 현황")
    print(f"  총액: {vault_total['total']:,}원 ({vault_total['users']}명)")
    print()
    
    # 6. Inventory
    inventory = get_inventory_summary()
    print("📦 인벤토리 현황")
    print(f"  다이아몬드: {inventory.get('DIAMOND', 0)}개")
    gifticons = sum(v for k, v in inventory.items() if 'GIFTICON' in k)
    print(f"  기프티콘: {gifticons}장")
    print()
    
    # 7. Cross Analysis
    cross = get_cross_analysis()
    print("🔄 게임→입금 전환 분석")
    if ext_stats['depositors'] > 0:
        print(f"  주사위→입금: {cross['dice_depositors']}명 ({cross['dice_depositors']/ext_stats['depositors']*100:.0f}%)")
        print(f"  룰렛→입금: {cross['roulette_depositors']}명 ({cross['roulette_depositors']/ext_stats['depositors']*100:.0f}%)")
    print()
    
    print(f"{'='*60}")
    print("리포트 생성 완료!")
    print(f"{'='*60}\n")

def sync_database():
    """Sync database from production server."""
    print("🔄 서버 데이터 동기화 중...")
    script_path = Path(__file__).parent / "sync_db_production.ps1"
    if script_path.exists():
        result = subprocess.run(
            ["powershell", "-ExecutionPolicy", "Bypass", "-File", str(script_path)],
            cwd=script_path.parent.parent
        )
        if result.returncode == 0:
            print("✅ 동기화 완료!")
        else:
            print("❌ 동기화 실패. 기존 데이터로 분석합니다.")
    else:
        print(f"⚠️ 동기화 스크립트를 찾을 수 없습니다: {script_path}")

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description='일일 리텐션 분석 리포트 생성')
    parser.add_argument('--sync', action='store_true', help='실행 전 서버 데이터 동기화')
    parser.add_argument('--days', type=int, default=14, help='분석할 일수 (기본값: 14)')
    args = parser.parse_args()
    
    if args.sync:
        sync_database()
    
    generate_report(args.days)
