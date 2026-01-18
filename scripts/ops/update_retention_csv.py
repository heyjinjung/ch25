
import pandas as pd
import io
import re
import os
from datetime import datetime

# ==========================================
# CONFIGURATION
# ==========================================
# 1. Target CSV File Path (Adjust month/filename if needed)
TARGET_CSV_PATH = r"c:\Users\JAVIS\ch\ch25\docs\06_ops\202601\exports\도파민\CC0106_RAW.CSV"

# 2. Input Raw Data File Path
INPUT_RAW_PATH = r"c:\Users\JAVIS\ch\ch25\scripts\ops\input_raw.txt"

# 3. Current Date Override
# Set to None to use system actual date. 
# Set to datetime(2026, 1, 18) to force a specific date if your system clock is wrong.
CURRENT_DATE_OVERRIDE = datetime(2026, 1, 18) 
# ==========================================

def get_current_date():
    if CURRENT_DATE_OVERRIDE:
        return CURRENT_DATE_OVERRIDE
    return datetime.now()

def main():
    current_date = get_current_date()
    print(f"[*] Starting retention update routine...")
    print(f"    - Date Limit: {current_date.strftime('%Y-%m-%d')}")
    print(f"    - Input: {INPUT_RAW_PATH}")
    print(f"    - Target: {TARGET_CSV_PATH}")

    # 1. Read Raw Input
    if not os.path.exists(INPUT_RAW_PATH):
        print(f"[!] Error: Input file not found: {INPUT_RAW_PATH}")
        return

    with open(INPUT_RAW_PATH, 'r', encoding='utf-8') as f:
        raw_input = f.read()

    if not raw_input.strip():
        print("[!] Input file is empty. Paste data into 'scripts/ops/input_raw.txt'.")
        return

    # 2. Parse Input Logic
    updates = {} # Key: Name, Value: { dates: set(), nickname: str }
    parsed_lines_count = 0

    lines = raw_input.strip().split('\n')
    for line in lines:
        parts = re.split(r'\t+', line)
        if len(parts) < 8:
            continue
        
        # Check Status column (usually last)
        status = parts[-1].strip()
        if status != '충전완료':
            continue

        # Col 2: Name (ID) -> Extract Name
        # ex: 최락천 (knj**)
        if len(parts) > 2:
            name_raw = parts[2]
            name = name_raw.split('(')[0].strip()
        else:
            continue
        
        # Col 3: Nickname
        if len(parts) > 3:
            nickname = parts[3].strip()
        else:
            nickname = ""
        
        # Col 4: DateTime -> Extract Date
        # ex: 26/01/10 17:20
        if len(parts) > 4:
            dt_str = parts[4].strip()
            try:
                dt = datetime.strptime(dt_str, "%y/%m/%d %H:%M")
                date_only = dt.date()
            except ValueError:
                continue
        else:
            continue

        if name not in updates:
            updates[name] = {'dates': set(), 'nickname': nickname}
        
        updates[name]['dates'].add(date_only)
        updates[name]['nickname'] = nickname 
        parsed_lines_count += 1

    print(f"[*] Parsed {parsed_lines_count} valid '충전완료' records for {len(updates)} unique users.")

    # 3. Load CSV
    if not os.path.exists(TARGET_CSV_PATH):
        print(f"[!] Error: Target CSV not found: {TARGET_CSV_PATH}")
        return

    df = pd.read_csv(TARGET_CSV_PATH)
    # Ensure '최근충전일' matches format datetime for comparison
    df['최근충전일_dt'] = pd.to_datetime(df['최근충전일'], errors='coerce')

    # 4. Apply Updates & Identify New Users
    changes_made = []
    new_users_added = []
    skipped_count = 0

    for u_name, u_data in updates.items():
        # Match Logic: Name OR Nickname
        mask = (df['닉네임'].astype(str).str.strip() == u_name) | (df['닉네임(사이트)'].astype(str).str.strip() == u_data['nickname'])
        matched_indices = df[mask].index
        
        sorted_dates = sorted(list(u_data['dates']))
        if not sorted_dates: 
            continue
            
        u_last_date = sorted_dates[-1]
        u_first_date = sorted_dates[0]
        u_days_count = len(sorted_dates)

        if len(matched_indices) == 0:
            # === NEW USER ===
            days_since = (current_date.date() - u_last_date).days
            
            # Default group logic for new users
            group = "활성"
            if days_since > 15: group = "이탈위험(장기)"
            elif days_since > 10: group = "이탈위험(중기)"
            elif days_since > 5: group = "이탈위험(단기)"
            
            new_row = {
                '닉네임': u_name,
                '닉네임(사이트)': u_data['nickname'],
                '최초충전일': u_first_date.strftime("%Y-%m-%d 00:00:00"), # Estimate from input
                '최근충전일': u_last_date.strftime("%Y-%m-%d 00:00:00"),
                '마지막충전후_경과일': days_since,
                '총이용일수': u_days_count, # Initial count from input
                '리텐션그룹(업데이트)': group,
                '메모': f"신규({datetime.now().strftime('%m%d')})_자동추가",
                '행동유형': "신규",
                '핸드폰': "" 
            }
            # Append new row
            df = pd.concat([df, pd.DataFrame([new_row])], ignore_index=True)
            new_users_added.append(f"{u_name} ({u_data['nickname']})")
        
        else:
            # === EXISTING USER ===
            for idx in matched_indices:
                current_last_date_val = df.loc[idx, '최근충전일_dt']
                current_last_date = current_last_date_val.date() if pd.notnull(current_last_date_val) else datetime(2000,1,1).date()
                
                new_dates = u_data['dates']
                # Calculate dates that are NEWER than what we already have
                dates_to_add = {d for d in new_dates if d > current_last_date}
                days_to_add = len(dates_to_add)
                
                final_last_date = max(current_last_date, u_last_date)
                
                # Check if update is needed
                if final_last_date > current_last_date or days_to_add > 0:
                    old_days = int(df.loc[idx, '총이용일수']) if pd.notnull(df.loc[idx, '총이용일수']) else 0
                    new_days_val = old_days + days_to_add
                    
                    df.at[idx, '총이용일수'] = new_days_val
                    df.at[idx, '최근충전일'] = final_last_date.strftime("%Y-%m-%d 00:00:00")
                    
                    # Recalculate Days Since
                    days_since = (current_date.date() - final_last_date).days
                    df.at[idx, '마지막충전후_경과일'] = days_since
                    
                    # Recalculate Group
                    new_group = "활성"
                    if days_since <= 5: new_group = "활성"
                    elif days_since <= 10: new_group = "이탈위험(단기)"
                    elif days_since <= 15: new_group = "이탈위험(중기)"
                    else: new_group = "이탈위험(장기)"
                    
                    df.at[idx, '리텐션그룹(업데이트)'] = new_group
                    changes_made.append(f"{u_name}: {old_days}->{new_days_val}일, Group {new_group}")
                else:
                    skipped_count += 1

    # 5. Save
    # Cleanup temp column
    if '최근충전일_dt' in df.columns:
        df.drop(columns=['최근충전일_dt'], inplace=True)

    df.to_csv(TARGET_CSV_PATH, index=False, encoding='utf-8-sig')

    # 6. Report
    print("=" * 50)
    print(f"RESULT REPORT")
    print("=" * 50)
    print(f"Existing Users Updated : {len(changes_made)}")
    print(f"New Users Added        : {len(new_users_added)}")
    print(f"Skipped (No changes)   : {skipped_count}")
    print("-" * 50)
    
    if new_users_added:
        print(">> NEW USERS:")
        for u in new_users_added:
            print(f"   + {u}")
    
    if len(changes_made) > 0:
        print(">> UPDATED SAMPLES (Top 5):")
        for log in changes_made[:5]:
            print(f"   * {log}")
            
    print("=" * 50)
    print(f"Done. Saved to {TARGET_CSV_PATH}")

if __name__ == "__main__":
    main()
