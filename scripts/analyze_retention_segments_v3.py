
import sys
import os
import csv
import re
from datetime import datetime
from sqlalchemy import func, select

# Add project root to sys.path
sys.path.append(os.getcwd())

from app.db.session import SessionLocal
from app.models.user import User
from app.models.external_ranking import ExternalRankingData
from app.models.admin_user_profile import AdminUserProfile

CSV_PATH = r"c:\Users\JAVIS\ch\ch25\docs\06_ops\202601\exports\CC260117.CSV"

def normalize_phone(phone):
    """Normalize phone number to digits only."""
    if not phone:
        return ""
    result = re.sub(r'\D', '', str(phone))
    return result

def normalize_name(name):
    """Normalize nickname to lower case and remove spaces."""
    if not name:
        return ""
    return str(name).strip().replace(" ", "").lower()

def extract_name_variants(dirty_name):
    """Split composite names like '최재훈/persipic' into ['최재훈', 'persipic']"""
    if not dirty_name:
        return []
    # Split by common separators: / , | ( )
    parts = re.split(r'[/,()|]', str(dirty_name))
    cleaned = [normalize_name(p) for p in parts if p and len(p.strip()) > 1]
    return cleaned

def analyze_segments():
    db = SessionLocal()
    try:
        print(f"--- User Segmentation Analysis V3 ({datetime.now().strftime('%Y-%m-%d %H:%M:%S')}) ---")
        
        # 1. Load DB Users with Admin Profile
        print("1. Loading Database Users & Profiles...")
        
        db_users = db.query(User).all()
        db_profiles = db.query(AdminUserProfile).all()
        db_rankings = {r.user_id: r.deposit_amount for r in db.query(ExternalRankingData).all()}
        
        # Map by Phone, Nickname, and Real Name
        db_map_phone = {}
        db_map_name = {}
        db_map_realname = {}
        
        # Profile Data Cache (Memo, RealName)
        profile_cache = {} # user_id -> {memo, real_name}

        # First, index Profiles by Phone and Real Name
        for p in db_profiles:
            profile_cache[p.user_id] = {
                'memo': p.memo,
                'real_name': p.real_name,
                'tags': p.tags
            }

            norm_p = normalize_phone(p.phone_number)
            if norm_p:
                db_map_phone[norm_p] = p.user_id
            
            # Map by Real Name (Account Holder) - Flexible Matching
            if p.real_name:
                variants = extract_name_variants(p.real_name)
                for v in variants:
                    db_map_realname[v] = p.user_id
                
        # Index Users by Nickname (and link to profile data if available)
        user_cache = {} # id -> user obj
        for u in db_users:
            # Merge Profile Data
            p_data = profile_cache.get(u.id, {})
            
            user_cache[u.id] = {
                'id': u.id,
                'username': u.nickname or u.telegram_username or u.external_id,
                'nickname': u.nickname,
                'deposit': db_rankings.get(u.id, 0),
                'created_at': u.created_at,
                'memo': p_data.get('memo', ''),  # Add Memo
                'real_name': p_data.get('real_name', ''), # Add Real Name
                'matched_by': 'NICKNAME'
            }
            
            if u.nickname:
                norm_n = normalize_name(u.nickname)
                if norm_n:
                    db_map_name[norm_n] = u.id
            
            # Also map Telegram Username if available
            if u.telegram_username:
                norm_tg = normalize_name(u.telegram_username)
                if norm_tg:
                    db_map_name[norm_tg] = u.id

        print(f"   -> DB Indices: {len(db_map_phone)} Phones, {len(db_map_name)} Nicks/TG, {len(db_map_realname)} RealName Variants.")

        # 2. Load CSV Users and Segment
        print(f"2. Loading CSV from {CSV_PATH}...")
        
        segments = {
            "REGISTERED": {
                "DEPOSITOR": [],
                "NON_DEPOSITOR": []
            },
            "UNREGISTERED": {
                "POTENTIAL_WHALE": [],
                "NPC": []
            }
        }
        
        processed_count = 0
        matched_count = 0
        
        with open(CSV_PATH, 'r', encoding='utf-8-sig') as f:
            reader = csv.DictReader(f)
            for row in reader:
                processed_count += 1
                
                raw_name = row.get('닉네임', '')
                raw_realname = row.get('예금주', '') # Add Account Holder
                raw_phone = row.get('핸드폰') or row.get('전화번호', '')
                
                norm_name = normalize_name(raw_name)
                norm_realname = normalize_name(raw_realname) # Normalize Account Holder
                norm_phone = normalize_phone(raw_phone)
                
                retention_charge = row.get('리텐션_충전여부', '')
                has_csv_deposit_history = "충전이력있음" in retention_charge
                
                user_info = {
                    'csv_name': raw_name,
                    'csv_realname': raw_realname,
                    'csv_phone': raw_phone,
                    'csv_deposit_status': retention_charge,
                    'csv_memo': row.get('특이사항', '') # Also capture CSV memo
                }
                
                # Try Match: Phone -> RealName -> Nickname
                matched_db_id = None
                match_source = None
                
                if norm_phone and norm_phone in db_map_phone:
                    matched_db_id = db_map_phone[norm_phone]
                    match_source = "PHONE"
                elif norm_realname and norm_realname in db_map_realname:
                    matched_db_id = db_map_realname[norm_realname]
                    match_source = "REAL_NAME"
                elif norm_name and norm_name in db_map_name:
                    matched_db_id = db_map_name[norm_name]
                    match_source = "NICKNAME"
                
                if matched_db_id:
                    # REGISTERED
                    matched_count += 1
                    db_u = user_cache[matched_db_id]
                    user_info.update(db_u)
                    user_info['matched_by'] = match_source
                    
                    if db_u['deposit'] > 0:
                        segments["REGISTERED"]["DEPOSITOR"].append(user_info)
                    else:
                        segments["REGISTERED"]["NON_DEPOSITOR"].append(user_info)
                else:
                    # UNREGISTERED
                    if has_csv_deposit_history:
                        segments["UNREGISTERED"]["POTENTIAL_WHALE"].append(user_info)
                    else:
                        segments["UNREGISTERED"]["NPC"].append(user_info)

        print(f"   -> Processed {processed_count} rows, Matched {matched_count} users.")
        
        # 3. Output Results
        print("\n--- 📊 Segmentation Results ---")
        
        print(f"\n[A] REGISTERED (Synced): {len(segments['REGISTERED']['DEPOSITOR']) + len(segments['REGISTERED']['NON_DEPOSITOR'])}")
        print(f"  > 🟢 Active Depositors: {len(segments['REGISTERED']['DEPOSITOR'])}")
        print(f"  > 🟡 Non-Depositors: {len(segments['REGISTERED']['NON_DEPOSITOR'])}")
        
        print(f"\n[B] UNREGISTERED: {len(segments['UNREGISTERED']['POTENTIAL_WHALE']) + len(segments['UNREGISTERED']['NPC'])}")
        print(f"  > 🔴 Potential Whales: {len(segments['UNREGISTERED']['POTENTIAL_WHALE'])}")
        print(f"  > ⚪ NPCs: {len(segments['UNREGISTERED']['NPC'])}")
        
        # 4. Detailed Lists
        print("\n\n--- 🔍 Detailed Sample Lists (with Descriptions) ---")
        
        print("\n1. 🟢 REGISTERED - Active Depositors (Sample 5)")
        for u in segments["REGISTERED"]["DEPOSITOR"][:5]:
            memo_show = u['memo'].replace('\n', ' ') if u['memo'] else "No Memo"
            csv_memo = u['csv_memo'].replace('\n', ' ') if u['csv_memo'] else ""
            print(f"   - [{u['matched_by']}] {u['nickname']} ({u['real_name']}) | DB: {u['deposit']:,} KRW")
            print(f"     📝 DB Memo: {memo_show[:50]}... | CSV: {csv_memo[:30]}")
            
        print("\n5. 🟢 REGISTERED - Matched via RealName (Sample 5)")
        by_realname = [u for u in segments["REGISTERED"]["DEPOSITOR"] + segments["REGISTERED"]["NON_DEPOSITOR"] if u['matched_by'] == 'REAL_NAME']
        for u in by_realname[:5]:
             print(f"   - [{u['matched_by']}] {u['nickname']} ({u['real_name']}) matches CSV: {u['csv_realname']}")

        # 5. Export to CSV
        print("\n\n--- 💾 Exporting Segments to CSV ---")
        export_dir = os.path.join(os.path.dirname(CSV_PATH), "segments")
        os.makedirs(export_dir, exist_ok=True)
        
        def save_segment_csv(filename, users, headers):
            path = os.path.join(export_dir, filename)
            with open(path, 'w', newline='', encoding='utf-8-sig') as f:
                writer = csv.DictWriter(f, fieldnames=headers)
                writer.writeheader()
                for u in users:
                    # Filter/Rename keys for clean output
                    row = {
                        'Nickname': u.get('nickname') or u.get('csv_name', ''),
                        'RealName': u.get('real_name') or u.get('csv_realname', ''),
                        'Phone': u.get('csv_phone', ''),
                        'DB_Deposit': u.get('deposit', 0),
                        'CSV_Deposit_Status': u.get('csv_deposit_status', ''),
                        'Source': u.get('matched_by', 'Unregistered'),
                        'Memo_DB': u.get('memo', ''),
                        'Memo_CSV': u.get('csv_memo', '')
                    }
                    writer.writerow(row)
            print(f"   -> Saved: {path} ({len(users)} rows)")

        common_headers = ['Nickname', 'RealName', 'Phone', 'DB_Deposit', 'CSV_Deposit_Status', 'Source', 'Memo_DB', 'Memo_CSV']
        
        save_segment_csv("1_Registered_Active_Depositors.csv", segments["REGISTERED"]["DEPOSITOR"], common_headers)
        save_segment_csv("2_Registered_NonDepositors_Fuel.csv", segments["REGISTERED"]["NON_DEPOSITOR"], common_headers)
        save_segment_csv("3_Unregistered_Potential_Whales.csv", segments["UNREGISTERED"]["POTENTIAL_WHALE"], common_headers)
        save_segment_csv("4_Unregistered_NPCs.csv", segments["UNREGISTERED"]["NPC"], common_headers)

    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    analyze_segments()
