import pandas as pd
import os
from datetime import datetime

# ==========================================
# CONFIGURATION
# ==========================================
TARGET_CSV_PATH = r"c:\Users\JAVIS\ch\ch25\docs\06_ops\202601\exports\도파민\CC0118_RAW.CSV"
CURRENT_DATE_OVERRIDE = datetime(2026, 1, 18) 
# ==========================================

def get_current_date():
    if CURRENT_DATE_OVERRIDE:
        return CURRENT_DATE_OVERRIDE
    return datetime.now()

def main():
    current_date = get_current_date()
    print(f"[*] Starting FULL retention recalculation...")
    print(f"    - Date Reference: {current_date.strftime('%Y-%m-%d')}")
    print(f"    - Target: {TARGET_CSV_PATH}")

    if not os.path.exists(TARGET_CSV_PATH):
        print(f"[!] Error: Target CSV not found: {TARGET_CSV_PATH}")
        return

    df = pd.read_csv(TARGET_CSV_PATH)
    
    # helper to clean string 
    if '최근충전일' not in df.columns:
        print("[!] Error: Column '최근충전일' not found.")
        return

    # Process all rows
    updated_count = 0
    
    for idx, row in df.iterrows():
        last_charge_str = str(row['최근충전일']).strip()
        try:
            # Parse date - handle potential formats
            # Common formats seen: '2026-01-17 00:00:00', '2026-01-17'
            if ' ' in last_charge_str:
                last_charge_dt = datetime.strptime(last_charge_str.split(' ')[0], "%Y-%m-%d")
            else:
                last_charge_dt = datetime.strptime(last_charge_str, "%Y-%m-%d")
            
            last_charge_date_obj = last_charge_dt.date()
            
            # Recalculate Days Since
            days_since = (current_date.date() - last_charge_date_obj).days
            
            # Recalculate Group
            new_group = "활성"
            if days_since <= 5: new_group = "활성"
            elif days_since <= 10: new_group = "이탈위험(단기)"
            elif days_since <= 15: new_group = "이탈위험(중기)"
            else: new_group = "이탈위험(장기)"
            
            # Update DataFrame
            df.at[idx, '마지막충전후_경과일'] = days_since
            df.at[idx, '리텐션그룹(업데이트)'] = new_group
            updated_count += 1
            
        except Exception as e:
            print(f"[!] Error parsing row {idx} ({row.get('닉네임', '?')}): {e}")
            continue

    # Save
    df.to_csv(TARGET_CSV_PATH, index=False, encoding='utf-8-sig')

    print("=" * 50)
    print(f"FULL RECALCULATION COMPLETE")
    print(f"Updated Rows: {updated_count}")
    print(f"Target Date : {current_date.strftime('%Y-%m-%d')}")
    print("=" * 50)

if __name__ == "__main__":
    main()
