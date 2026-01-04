
import re
import datetime
import json
import collections

# Path to the backup file
BACKUP_FILE = "backup_20260104.sql"
OUTPUT_FILE = "user_analysis_report.md"

def parse_sql_dump(file_path):
    """
    Parses a mysqldump file to extract data from INSERT statements.
    Returns a dict of table_name -> list of rows (dicts).
    This is a simplified parser and assumes standard mysqldump format.
    """
    data = collections.defaultdict(list)
    current_table = None
    columns = {}
    
    # We need to capture column names from CREATE TABLE or INSERT statements
    # But often INSERT statements have (col1, col2) ... 
    # mysqldump usually does: INSERT INTO `table` VALUES (...), (...);
    # It might NOT imply columns if schema is strictly defined.
    # We will try to infer columns or just use index if hard.
    # ACTUALLY, simpler approach for specific tables: regex for specific INSERTs.
    
    # Tables we care about: users, user_mission_progress, user_items (inventory), user_tickets?
    # Let's read file line by line.
    
    with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()

    # 1. USERS
    # INSERT INTO `users` VALUES (1,'ext','nick',...)
    # We need to know the schema position. 
    # Strategy: Find "CREATE TABLE `users`" to get column order.
    
    schema_map = {}
    
    # Split by statements
    statements = content.split(';')
    
    for stmt in statements:
        stmt = stmt.strip()
        if not stmt:
            continue
            
        if stmt.startswith("CREATE TABLE"):
            # Extract table name
            match = re.search(r"CREATE TABLE `(\w+)`", stmt)
            if match:
                t_name = match.group(1)
                # Extract columns roughly
                cols = []
                # content inside ( ... )
                # detailed parsing is hard with regex, let's just dump the raw values and map manually if needed
                # For this task, strict mapping is better. 
                # Let's rely on Key Keywords.
                pass

    # Alternative: Just regex for INSERT INTO `users` VALUES ...
    # And we map by known index.
    
    # Users Table Index Guess (based on typical SQLAlchemy output or model):
    # id, external_id, nickname, email, ... created_at, last_login_at, ... level, ...
    
    # Let's try to load it into a smarter structure.
    # Actually, for 25 users, we can just print relevant sections.
    
    return content

def analyze_dump_direct(file_path):
    import collections
    
    report_lines = []
    report_lines.append("# 👥 전체 유저 상세 분석 리포트")
    report_lines.append(f"생성 시간: {datetime.datetime.now()}")
    report_lines.append("")
    
    with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
        sql_content = f.read()

    # Helpers
    def get_inserts(table_name):
        # Find all VALUES (...) for a table
        matches = re.findall(rf"INSERT INTO `{table_name}` VALUES (.*?);", sql_content, re.DOTALL)
        rows = []
        for match in matches:
            parts = match.split("),(")
            for p in parts:
                p = p.strip("()")
                rows.append(p)
        return rows

    def parse_row(row_str):
        # Naive CSV parser that handles quoted strings roughly
        # This is not perfect but works for the dump format
        # We replace ',' inside quotes with a placeholder to split correctly
        # Actually, let's just use a simple regex to match values
        # pattern: '([^']*)'|([^,]+)
        # But integers are not quoted.
        # Let's try splitting by comma, BUT ignore commas inside single quotes.
        # Quick implementation:
        result = []
        in_quote = False
        current = ""
        for char in row_str:
            if char == "'":
                in_quote = not in_quote
                current += char
            elif char == "," and not in_quote:
                result.append(current.strip())
                current = ""
            else:
                current += char
        result.append(current.strip())
        return [r.strip("'") for r in result]

    # --- Data Loading ---
    
    # 1. Users
    # Schema observed: ID, ExtID(nullable), Nickname, ?, Level, XP, Status, Data...
    # Example: 33,'tg...','커피사랑',NULL,11,640,'ACTIVE',...
    # Indices: 0=ID, 1=ExtID, 2=Nick, 4=Level, 5=XP
    users_raw = get_inserts("user")
    users_data = {}
    for r in users_raw:
        cols = parse_row(r)
        if len(cols) > 5:
            uid = cols[0]
            users_data[uid] = {
                "id": uid,
                "nickname": cols[2],
                "level": cols[4],
                "xp": cols[5],
                "status": cols[6],
                "created_at": cols[-3] if len(cols) > 10 else "Unknown" # Guessing created_at location
            }

    # 2. Mission Progress
    # Schema: id, user_id, mission_id, progress, is_completed, is_claimed...
    # Example: 5,9,1,1,1,1...
    # Indices: 1=UID, 2=MissionID, 3=Val, 4=Completed(1/0), 5=Claimed(1/0)
    mission_raw = get_inserts("user_mission_progress")
    user_missions = collections.defaultdict(dict)
    for r in mission_raw:
        cols = parse_row(r)
        if len(cols) > 5:
            uid = cols[1]
            mid = cols[2]
            user_missions[uid][mid] = {
                "val": cols[3],
                "completed": cols[4] == "1",
                "claimed": cols[5] == "1"
            }

    # 3. Wallet
    # Schema: id, user_id, type, amount, updated...
    # Example: 21,9,'ROULETTE_COIN',0...
    # Indices: 1=UID, 2=Type, 3=Amount
    wallet_raw = get_inserts("user_game_wallet")
    if not wallet_raw: wallet_raw = get_inserts("game_wallet")
    
    user_wallets = collections.defaultdict(dict)
    for r in wallet_raw:
        cols = parse_row(r)
        if len(cols) > 3:
            uid = cols[1]
            w_type = cols[2]
            amount = cols[3]
            user_wallets[uid][w_type] = amount

    # 4. Vault
    # Schema: id, user_id, type_id?, status, locked, available...
    # Example: 13,30,1,'LOCKED',15300,30...
    # Indices: 1=UID, 4=Locked, 5=Available
    vault_raw = get_inserts("vault_status")
    user_vaults = collections.defaultdict(dict)
    for r in vault_raw:
        cols = parse_row(r)
        if len(cols) > 5:
            uid = cols[1]
            user_vaults[uid] = {
                "locked": cols[4],
                "available": cols[5]
            }

    # 5. Inventory (Coupons?)
    # If no items table, we assume coupons are in Wallet as TICKET_...
    # We will summarize those in the report.

    # --- Report Generation ---
    
    sorted_uids = sorted(users_data.keys(), key=lambda x: int(x))
    
    for uid in sorted_uids:
        u = users_data[uid]
        missions = user_missions.get(uid, {})
        wallet = user_wallets.get(uid, {})
        vault = user_vaults.get(uid, {"locked": 0, "available": 0})
        
        # 1) Basic Info
        report_lines.append(f"## 👤 User {uid}: {u['nickname']}")
        report_lines.append(f"- **현재 정보**: 레벨 {u['level']} (XP: {u['xp']}) | 상태: {u['status']}")
        
        # 2) Modal Event (Mission 8 - Day 2 Login)
        m8 = missions.get('8')
        m_status = "미진행"
        if m8:
            if m8['claimed']: m_status = "✅ 수령 완료"
            elif m8['completed']: m_status = "✨ 완료 (미수령 - 모달 대기)"
            else: m_status = f"진행중 ({m8['val']}/2)"
        else:
            m_status = "❌ 데이터 없음 (마이그레이션 대상 아님?)"
            
        report_lines.append(f"- **신규 모달 이벤트**: {m_status}")
        
        # 3) Balance
        vault_lock = vault['locked']
        vault_avail = vault['available']
        report_lines.append(f"- **금고 잔액**: 잠금 {vault_lock} / 출금가능 {vault_avail}")
        
        # Wallet formatting
        tickets = []
        others = []
        for k, v in wallet.items():
            if "TICKET" in k:
                tickets.append(f"{k.replace('TICKET_', '')}: {v}장")
            else:
                others.append(f"{k}: {v}")
        
        t_str = ", ".join(tickets) if tickets else "없음"
        o_str = ", ".join(others) if others else ""
        report_lines.append(f"- **티켓 잔액**: {t_str}")
        if o_str: report_lines.append(f"  - 기타: {o_str}")

        # 4) Trial Coupons (Inferred from Wallet History or current?)
        # Since we don't have transaction history easily, we list current hold.
        # User asked "How many received?". Without audit log parse, we can only show current.
        # BUT, we can check 'season_pass_reward_log' or 'admin_audit_log' if we parsed them.
        # For now, let's stick to current wallet status as "Holding".
        report_lines.append(f"- **트라이얼 쿠폰 보유**: {t_str}")

        # 5) Level Issues
        # Simple heuristic: Level 1 should have < 20 XP (if 20 is lvl 2).
        # We don't have the exact formula, but can flag anomalies like Level 1 with 1000 XP.
        lvl = int(u['level'])
        xp = int(u['xp'])
        issue = "특이사항 없음"
        if lvl == 1 and xp > 100: issue = "⚠️ 레벨 1인데 XP가 높음"
        if lvl > 5 and xp < 50: issue = "⚠️ 고레벨인데 XP가 낮음 (데이터 오류?)"
        
        report_lines.append(f"- **레벨/성장 진단**: {issue}")
        report_lines.append("---")

    return "\n".join(report_lines)

def analyze_with_sqlite(sql_path):
    # Much better approach: Create in-memory SQLite, convert MySQL syntax to SQLite roughly, load, query.
    # 1. Read SQL
    # 2. Fix `` to "" or remove
    # 3. Remove MySQL specific syntax (ENGINE=InnoDB, etc)
    # 4. Execute
    import sqlite3
    
    con = sqlite3.connect(":memory:")
    cur = con.cursor()
    
    with open(sql_path, 'r', encoding='utf-8', errors='ignore') as f:
        statements = f.read().split(';')
        
    for statement in statements:
        stmt = statement.strip()
        if not stmt: continue
        
        # Cleanup
        stmt = stmt.replace('`', '"')
        stmt = stmt.replace('AUTO_INCREMENT', '')
        stmt = re.sub(r'ENGINE=.*', '', stmt)
        stmt = stmt.replace('int(11)', 'INTEGER')
        stmt = stmt.replace('tinyint(1)', 'INTEGER')
        stmt = stmt.replace('timestamp', 'TEXT')
        stmt = stmt.replace('datetime', 'TEXT')
        stmt = stmt.replace('double', 'REAL')
        stmt = stmt.replace('\\\'', '\'\'') # Escape fix roughly
        
        try:
            cur.execute(stmt)
        except Exception as e:
            # Ignore errors (complex creates triggers etc)
            pass
            
    # Now Query
    res = []
    try:
        cur.execute("SELECT id, nickname, level, last_login_at FROM users")
        users = cur.fetchall()
        
        res.append("# Detailed User Analysis")
        res.append("| ID | Nickname | Level | Last Login |")
        res.append("|---|---|---|---|")
        for u in users:
            res.append(f"| {u[0]} | {u[1]} | {u[2] if len(u)>2 else '-'} | {u[3] if len(u)>3 else '-'} |")
            
    except Exception as e:
        res.append(f"Error querying users: {e}")
        
    return "\n".join(res)

if __name__ == "__main__":
    # Hybrid approach: text parse is safer if SQL incompatible.
    # Let's try text parse mainly because MySQL dump uses syntax SQLite might hate (LOCK TABLES, etc).
    report = analyze_dump_direct(BACKUP_FILE)
    
    with open(OUTPUT_FILE, "w", encoding='utf-8') as f:
        f.write(report)
    print(f"Report generated: {OUTPUT_FILE}")

