
import pandas as pd
import re

# 1. Input Data (From User Request)
# "ID N (Nickname): Assets" format
raw_targets = """
ID 2 (Admin): 복권(1)
ID 7 (percipic): 복권(9)
ID 9 (크리스토퍼): 주사위(3)
ID 12 (봄꽃잎): 주사위(16), 룰렛(7), 복권(2)
ID 16 (일등당첨): 룰렛(9), 복권(8), 주사위(6)
ID 17 (민똘이): 룰렛(3)
ID 19 (세상은참): 복권(1)
ID 20 (나이스비): 복권(1)
ID 21 (tg_user_5721857928): 룰렛(2), 복권(1)
ID 24 (아사카): 룰렛(1), 주사위(1), 복권(1)
ID 25 (peace30922L): 룰렛(2), 복권(1)
ID 26 (jm956): 룰렛(1), 주사위(24)
ID 27 (라오스오): 주사위(1)
ID 29 (기프트): 룰렛(1)
ID 32 (tg_user_6310828178): 복권(1)
ID 33 (커피사랑): 룰렛(13), 주사위(21), 복권(18)
ID 34 (oneway3333): 룰렛(7), 복권(1)
ID 35 (tg_user_5626594744): 복권(2)
ID 42 (종이형님): 룰렛(2), 복권(1)
ID 73 (tg_user_8190230593): 룰렛(1), 복권(1)
ID 74 (행쥬): 복권(1)
ID 82 (일렉시드): 룰렛(1)
ID 86 (필따): 룰렛(1), 주사위(1)
ID 89 (오존스야): 룰렛(1)
ID 101 (자르반이큐): 룰렛(2), 주사위(1)
ID 105 (서간밸): 룰렛(7), 주사위(3)
ID 106 (승아지): 룰렛(1), 주사위(1)
ID 109 (김민저이): 룰렛(1)
ID 110 (봉승승승): 룰렛(1)
ID 111 (사 석): 주사위(1)
ID 123 (에버리치): 룰렛(6), 주사위(5)
ID 124 (김경윤): 주사위(3)
ID 133 (개발 테스트 유저): 주사위(4)
"""

# 2. Parse Targets
target_list = []
for line in raw_targets.strip().split('\n'):
    match = re.search(r"ID (\d+) \((.+?)\): (.+)", line)
    if match:
        target_list.append({
            'User ID': int(match.group(1)),
            'Nickname': match.group(2).strip(),
            'Assets': match.group(3).strip()
        })

targets_df = pd.DataFrame(target_list)

# 3. Load CSV Data
csv_path = "docs/06_ops/202601/exports/도파민/CC0118_RAW.CSV"
try:
    df = pd.read_csv(csv_path)
except Exception as e:
    print(f"Error reading CSV: {e}")
    exit()

# 4. Matching Logic
# Match primarily on 'Nickname' (from CSV '닉네임(사이트)' column)
# Since ID isn't in CSV, we rely on nickname matching.
df['nickname_clean'] = df['닉네임(사이트)'].fillna('').astype(str).str.strip()

results = []

print("## 🎯 추가 티켓 지급 시 충전 유력 타겟 (High Potential Upsell Targets)\n")
print("> **선정 기준**: 현재 티켓 보유 중 + 과거 충전 이력 있음(총이용일수 >= 1) + 최근 활동(활성/이탈위험)\n")

for _, row in targets_df.iterrows():
    nick = row['Nickname']
    
    # Skip known admins/testers
    if nick in ['Admin', '개발 테스트 유저']: continue
    
    # Find match in CSV
    user_info = df[df['nickname_clean'] == nick]
    
    if not user_info.empty:
        u_data = user_info.iloc[0]
        total_days = u_data.get('총이용일수', 0)
        retention_group = u_data.get('리텐션그룹(업데이트)', 'Unknown')
        memo = u_data.get('메모', '')
        last_charge_gap = u_data.get('마지막충전후_경과일', 999)
        
        # Filtering Logic: Only those who have paid before
        if total_days >= 1:
            print(f"### 🏅 {nick} (ID {row['User ID']})")
            print(f"- **보유 자산**: {row['Assets']}")
            print(f"- **충전 이력**: 총 {total_days}일 이용 (최근 충전 {last_charge_gap}일 전)")
            print(f"- **상태**: {retention_group}")
            if pd.notna(memo) and memo:
                print(f"- **메모**: {memo}")
            print("")
    else:
        # User not in CSV (New user or name mismatch?)
        # Print if they have significant assets as 'Potential New'
        pass

