import pandas as pd
import pymysql
import json

excel_path = r'c:\Users\JAVIS\ch\ch25\docs\엑셀자료\CC0108.xlsx'

def map_users():
    # Load Excel Active Group
    xl = pd.ExcelFile(excel_path)
    df_excel = pd.read_excel(excel_path, sheet_name=xl.sheet_names[2])
    df_excel.columns = [str(c).replace('\n', ' ').strip() for c in df_excel.columns]
    
    # Connect to DB
    conn = pymysql.connect(host='localhost', port=3307, user='xmasuser', password='2026', database='xmas_event')
    try:
        with conn.cursor(pymysql.cursors.DictCursor) as cursor:
            cursor.execute("SELECT id, nickname, level, vault_locked_balance FROM user")
            db_users = cursor.fetchall()
            
        print("--- Mapping Summary ---")
        matches = 0
        mapping_details = []
        
        for db_u in db_users:
            # Simple nickname matching
            excel_match = df_excel[df_excel['닉네임(사이트)'] == db_u['nickname']]
            if not excel_match.empty:
                matches += 1
                row = excel_match.iloc[0]
                mapping_details.append({
                    "nickname": db_u['nickname'],
                    "db_level": db_u['level'],
                    "vault": float(db_u['vault_locked_balance']),
                    "excel_status": str(row.get('리텐션그룹(업데이트)', 'Unknown')),
                    "excel_tag": str(row.get('행동유형', 'None'))
                })
        
        print(f"Total DB Users: {len(db_users)}")
        print(f"Matched with Excel: {matches}")
        print("\n--- Top Active Core (Excel Active + High DB Balance) ---")
        # Sort by vault balance
        sorted_mapping = sorted(mapping_details, key=lambda x: x['vault'], reverse=True)
        print(json.dumps(sorted_mapping[:10], indent=2, ensure_ascii=False))

    finally:
        conn.close()

if __name__ == "__main__":
    map_users()
