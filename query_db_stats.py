import pymysql
import json
from decimal import Decimal

db_url = "mysql+pymysql://xmasuser:2026@localhost:3307/xmas_event"

def convert_decimal(obj):
    if isinstance(obj, Decimal):
        return float(obj)
    return obj

def query_db():
    conn = pymysql.connect(host='localhost', port=3307, user='xmasuser', password='2026', database='xmas_event')
    try:
        with conn.cursor(pymysql.cursors.DictCursor) as cursor:
            results = {}
            
            # User stats
            cursor.execute("SELECT count(*) as total_users FROM user")
            results['user_summary'] = cursor.fetchone()
            
            cursor.execute("SELECT count(*) as count FROM user WHERE vault_locked_balance > 0")
            results['users_with_balance'] = cursor.fetchone()['count']
            
            # Game Participation
            cursor.execute("SELECT count(*) as count FROM roulette_log")
            results['roulette_spins'] = cursor.fetchone()['count']
            
            cursor.execute("SELECT count(*) as count FROM dice_log")
            results['dice_rolls'] = cursor.fetchone()['count']
            
            # Mission Completion
            cursor.execute("""
                SELECT m.title, count(*) as count 
                FROM user_mission_progress ump
                JOIN mission m ON ump.mission_id = m.id
                WHERE ump.is_completed = 1
                GROUP BY m.title
                ORDER BY count DESC
                LIMIT 5
            """)
            results['top_missions'] = cursor.fetchall()
            
            # Vault Stats
            cursor.execute("SELECT sum(vault_locked_balance) as total, avg(vault_locked_balance) as avg FROM user")
            res = cursor.fetchone()
            results['vault_stats'] = {k: convert_decimal(v) for k, v in res.items()}
            
            # Level distribution
            cursor.execute("SELECT level, count(*) as count FROM user GROUP BY level ORDER BY level DESC")
            results['level_distribution'] = cursor.fetchall()
            
            print(json.dumps(results, indent=2, ensure_ascii=False))
            
    finally:
        conn.close()

if __name__ == "__main__":
    query_db()
