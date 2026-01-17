
import sys
import os
import csv
import re
from datetime import datetime, date

# Add project root to sys.path
sys.path.append(os.getcwd())

from app.db.session import SessionLocal
from app.models.user import User
from app.models.external_ranking import ExternalRankingData
from app.models.admin_user_profile import AdminUserProfile

INPUT_CSV_PATH = r"c:\Users\JAVIS\ch\ch25\docs\06_ops\202601\exports\segments\CC0109임시.CSV"
OUTPUT_CSV_PATH = r"c:\Users\JAVIS\ch\ch25\docs\06_ops\202601\exports\segments\CC0109_Updated.csv"

def normalize_phone(phone):
    """Normalize phone number to digits only."""
    if not phone:
        return ""
    return re.sub(r'\D', '', str(phone))

def normalize_name(name):
    """Normalize nickname to lower case and remove spaces."""
    if not name:
        return ""
    return str(name).strip().replace(" ", "").lower()

def extract_name_variants(dirty_name):
    """Split composite names like '최재훈/persipic' into ['최재훈', 'persipic']"""
    if not dirty_name:
        return []
    parts = re.split(r'[/,()|]', str(dirty_name))
    cleaned = [normalize_name(p) for p in parts if p and len(p.strip()) > 1]
    return cleaned

def calculate_days_diff(target_date):
    if not target_date:
        return ""
    if isinstance(target_date, datetime):
        delta = datetime.utcnow().date() - target_date.date()
    elif isinstance(target_date, date):
        delta = datetime.utcnow().date() - target_date
    else:
        return ""
    return delta.days

def determine_retention_group(days_since_deposit):
    if days_since_deposit == "":
        return "알수없음"
    if days_since_deposit <= 3:
        return "활성(ACTIVE)"
    elif days_since_deposit <= 7:
        return "이탈위험(WARNING)"
    else:
        return "이탈(INACTIVE)"

def enrich_log():
    db = SessionLocal()
    try:
        print(f"--- Deposit Log Enrichment ({datetime.now().strftime('%Y-%m-%d %H:%M:%S')}) ---")
        
        # 1. Load DB Users & Profiles
        print("1. Loading Database Users & Profiles...")
        db_users = db.query(User).all()
        db_profiles = db.query(AdminUserProfile).all()
        
        # Rankings for "Latest Deposit Date"
        rankings = db.query(ExternalRankingData).all()
        # Map user_id -> ranking data
        ranking_map = {r.user_id: r for r in rankings}

        # --- Matching Logic (Same as V3) ---
        db_map_phone = {}
        db_map_name = {}
        db_map_realname = {}
        profile_cache = {} 
        
        for p in db_profiles:
            profile_cache[p.user_id] = p
            
            norm_p = normalize_phone(p.phone_number)
            if norm_p:
                db_map_phone[norm_p] = p.user_id
            
            if p.real_name:
                variants = extract_name_variants(p.real_name)
                for v in variants:
                    db_map_realname[v] = p.user_id
        
        user_cache = {}
        for u in db_users:
            p_data = profile_cache.get(u.id)
            rank_data = ranking_map.get(u.id)
            
            # Determine "Latest Active/Deposit Date"
            # Prioritize ExternalRankingData.updated_at (Deposit Sync) -> User.last_login_at
            last_deposit = rank_data.updated_at if rank_data else None
            first_active = u.created_at # Or User.first_login_at
            
            user_cache[u.id] = {
                'user_obj': u,
                'profile_obj': p_data,
                'rank_obj': rank_data,
                'last_deposit': last_deposit,
                'first_active': first_active
            }
            
            if u.nickname:
                norm_n = normalize_name(u.nickname)
                if norm_n:
                    db_map_name[norm_n] = u.id
            if u.telegram_username:
                norm_tg = normalize_name(u.telegram_username)
                if norm_tg:
                    db_map_name[norm_tg] = u.id

        print(f"   -> DB Users Loaded: {len(db_users)}")

        # 2. Read & Update CSV
        print(f"2. Processing CSV: {INPUT_CSV_PATH}")
        
        updated_rows = []
        fieldnames = []
        
        with open(INPUT_CSV_PATH, 'r', encoding='utf-8-sig') as f:
            reader = csv.DictReader(f)
            fieldnames = reader.fieldnames
            
            # Ensure output columns exist
            required_cols = ['최근충전일', '마지막충전후_경과일', '총이용일수', '리텐션그룹(업데이트)', '메모', '핸드폰']
            for col in required_cols:
                if col not in fieldnames:
                    fieldnames.append(col)

            for row in reader:
                # Identification Keys from CSV
                raw_nick = row.get('닉네임') or row.get('닉네임(사이트)')
                raw_phone = row.get('핸드폰')
                # Sometimes file has Name in Nickname col? Try both
                
                norm_nick = normalize_name(raw_nick)
                norm_phone = normalize_phone(raw_phone)
                
                matched_id = None
                
                # Match: Phone -> RealName (if nickname used as name) -> Nickname
                if norm_phone and norm_phone in db_map_phone:
                    matched_id = db_map_phone[norm_phone]
                elif norm_nick and norm_nick in db_map_realname:
                     matched_id = db_map_realname[norm_nick]
                elif norm_nick and norm_nick in db_map_name:
                    matched_id = db_map_name[norm_nick]
                
                if matched_id:
                    data = user_cache[matched_id]
                    u_obj = data['user_obj']
                    p_obj = data['profile_obj']
                    last_dep = data['last_deposit']
                    
                    # Update Fields
                    if last_dep:
                        row['최근충전일'] = last_dep.strftime('%Y-%m-%d')
                        days_diff = calculate_days_diff(last_dep)
                        row['마지막충전후_경과일'] = days_diff
                        row['리텐션그룹(업데이트)'] = determine_retention_group(days_diff)
                    else:
                        # No deposit info in DB? Keep existing or mark unknown
                        # row['리텐션그룹(업데이트)'] = "기록없음"
                        pass

                    if data['first_active']:
                         # Total days since registration
                         total_days = calculate_days_diff(data['first_active'])
                         row['총이용일수'] = total_days
                    
                    # Merge Memo (DB memo prepended)
                    db_memo = p_obj.memo if p_obj and p_obj.memo else ""
                    csv_memo = row.get('메모', '')
                    if db_memo:
                        if csv_memo and db_memo not in csv_memo:
                             row['메모'] = f"[DB: {db_memo}] {csv_memo}"
                        elif not csv_memo:
                             row['메모'] = f"[DB: {db_memo}]"
                    
                    # Update Phone if missing in CSV but found in DB
                    db_phone = p_obj.phone_number if p_obj else ""
                    if not row.get('핸드폰') and db_phone:
                        row['핸드폰'] = db_phone

                updated_rows.append(row)
                
        # 3. Save Updated CSV
        print(f"3. Saving Updates to: {OUTPUT_CSV_PATH}")
        with open(OUTPUT_CSV_PATH, 'w', newline='', encoding='utf-8-sig') as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(updated_rows)
            
        print("   -> Success!")

    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    enrich_log()
