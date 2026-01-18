#!/usr/bin/env python3
import pandas as pd
import subprocess
import io

# Config
DB_CONTAINER = "xmas-db"
DB_USER = "root"
DB_PASS = "2026"
DB_NAME = "xmas_event"
CSV_PATH = "docs/06_ops/202601/exports/도파민/CC0118_RAW.CSV"

def run_query(query: str) -> str:
    clean_query = ' '.join(query.split())
    cmd = f'docker exec -i {DB_CONTAINER} mysql -u {DB_USER} -p{DB_PASS} {DB_NAME} --default-character-set=utf8mb4 -N -e "{clean_query}"'
    result = subprocess.run(cmd, shell=True, capture_output=True, text=True, encoding='utf-8')
    return result.stdout.strip()

def main():
    print("## 🕵️ 휴면/이탈위험 소진 유도 타겟 (High-Value Dormant Users)\n")
    print("> **조건**: 이탈위험 그룹 + 티켓 보유 + 시스템 방문 3회 이상\n")
    
    # 1. Fetch Inventory
    print("1. DB 재화 정보 조회 중...")
    assets_q = """
    SELECT user_id, token_type, balance 
    FROM user_game_wallet 
    WHERE token_type IN ('DICE_TOKEN', 'ROULETTE_COIN', 'LOTTERY_TICKET') 
      AND balance > 0
    """
    assets_raw = run_query(assets_q)
    
    user_assets = {}
    valid_ids = set()
    for line in assets_raw.split('\n'):
        if not line.strip(): continue
        parts = line.split('\t')
        uid, ttype, bal = int(parts[0]), parts[1], int(parts[2])
        if uid not in user_assets: user_assets[uid] = []
        label = ttype.replace('DICE_TOKEN','주사위').replace('ROULETTE_COIN','룰렛').replace('LOTTERY_TICKET','복권')
        user_assets[uid].append(f"{label}({bal})")
        valid_ids.add(uid)

    if not valid_ids:
        print("보유 자산이 있는 유저가 없습니다.")
        return

    # 2. Fetch Visit Counts (Event Log)
    print("2. 시스템 방문 횟수 조회 중...")
    ids_str = ','.join(map(str, valid_ids))
    visits_q = f"SELECT user_id, COUNT(*) FROM user_event_log WHERE user_id IN ({ids_str}) GROUP BY user_id"
    visits_raw = run_query(visits_q)
    
    user_visits = {}
    for line in visits_raw.split('\n'):
        if not line.strip(): continue
        parts = line.split('\t')
        user_visits[int(parts[0])] = int(parts[1])

    # 3. Load CSV
    print("3. 리텐션 데이터 매칭 중...\n")
    try:
        df = pd.read_csv(CSV_PATH)
    except Exception as e:
        print(f"CSV 로드 실패: {e}")
        return

    # Normalize CSV Nicknames
    df['nickname_clean'] = df['닉네임(사이트)'].fillna('').astype(str).str.strip()
    
    # 4. Fetch Nicknames from DB for ID matching (Since CSV doesn't have ID)
    # We map ID -> Nickname from DB, then match Nickname to CSV
    nick_q = f"SELECT id, nickname FROM user WHERE id IN ({ids_str})"
    nick_raw = run_query(nick_q)
    id_to_nick = {}
    for line in nick_raw.split('\n'):
        if not line.strip(): continue
        parts = line.split('\t')
        id_to_nick[int(parts[0])] = parts[1]

    # 5. Filter & Print
    count = 0
    for uid in valid_ids:
        nick = id_to_nick.get(uid, "Unknown")
        assets = user_assets.get(uid, [])
        visits = user_visits.get(uid, 0)
        
        # CSV Lookup
        csv_row = df[df['nickname_clean'] == nick]
        
        if csv_row.empty:
            continue
            
        row = csv_row.iloc[0]
        group = row.get('리텐션그룹(업데이트)', '')
        memo = row.get('메모', '')
        last_charge = row.get('마지막충전후_경과일', 0)
        
        # Logic: 
        # 1. Not 'Active' (Exclude '활성', include '이탈위험', '휴면')
        # 2. Visit Count >= 3
        if '활성' in group: continue # Skip active users
        if visits < 3: continue     # Skip low engagement
        
        count += 1
        print(f"### 💤 {nick} (ID {uid})")
        print(f"- **보유**: {', '.join(assets)}")
        print(f"- **상태**: {group} (마지막 충전 {last_charge}일 전)")
        print(f"- **활동**: 시스템 방문 {visits}회 (관심도 있음)")
        if pd.notna(memo) and memo:
            print(f"- **메모**: {memo}")
        
        # Strategy Suggestion
        print(f"- **전략**: '회원님! {assets[0]} 남으신거 잊지 않으셨죠? 오랜만에 오시면 보너스 챙겨드려요!'")
        print("")

    if count == 0:
        print("조건에 맞는 타겟(티켓 보유 + 이탈위험 + 방문3회+)이 없습니다.")

if __name__ == "__main__":
    main()
