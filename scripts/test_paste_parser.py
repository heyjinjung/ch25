"""Test paste import parser with full data."""
import re
import sys
sys.path.insert(0, "/app")

from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.v2.services.paste_import_service import PasteImportService

text = """번호\t소속 (추천인)\t이름 (아이디)\t닉네임\t신청 날짜\t충전 금액\t입금자명\t충전 날짜\t상태
17\t지민전용01 (미추천)\t최재훈 (dyd**)\tpersipic\t26/02/04 18:19\t120,000  \t최재훈\t26/02/04\t충전완료
16\t지민전용01 (미추천)\t김현규 (boo**)\t기프트\t26/02/04 17:41\t200,000  \t김현규\t26/02/04\t충전완료
15\t지민전용01 (미추천)\t최재훈 (dyd**)\tpersipic\t26/02/04 17:35\t60,000  \t최재훈\t26/02/04\t충전완료
14\t지민전용01 (미추천)\t최재훈 (dyd**)\tpersipic\t26/02/04 17:28\t60,000  \t최재훈\t26/02/04\t충전완료
13\t지민전용01 (미추천)\t임준범 (hoo**)\t짱맨\t26/02/04 16:00\t200,000  \t임준범\t26/02/04\t충전완료
12\t지민전용01 (미추천)\t오동수 (don**)\t동추\t26/02/04 12:47\t100,000  \t오동수\t26/02/04\t충전완료
11\t지민전용01 (미추천)\t최재훈 (dyd**)\tpersipic\t26/02/04 11:26\t60,000  \t최재훈\t26/02/04\t충전완료
10\t지민전용01 (미추천)\t조규완 (eut**)\t봄꽃잎\t26/02/04 10:53\t200,000  \t조규완\t26/02/04\t충전완료
9\t지민전용01 (미추천)\t박관종 (hje**)\t정우성\t26/02/04 10:51\t200,000  \t박관종\t26/02/04\t충전완료
8\t지민전용01 (미추천)\t조봉진 (mad**)\t크리스토퍼\t26/02/04 10:07\t200,000  \t조봉진\t26/02/04\t충전완료
7\t지민전용01 (미추천)\t박관종 (hje**)\t정우성\t26/02/04 09:43\t200,000  \t박관종\t26/02/04\t충전완료
6\t지민전용01 (미추천)\t조규완 (eut**)\t봄꽃잎\t26/02/04 09:23\t200,000  \t조규완\t26/02/04\t충전완료
5\t지민전용01 (미추천)\t조규완 (eut**)\t봄꽃잎\t26/02/04 08:52\t200,000  \t조규완\t26/02/04\t충전완료
4\t지민전용01 (미추천)\t현민수 (als**)\t민똘이\t26/02/04 08:23\t200,000  \t현민수\t26/02/04\t충전완료
3\t지민전용01 (미추천)\t최재훈 (dyd**)\tpersipic\t26/02/04 01:48\t60,000  \t최재훈\t26/02/04\t충전완료
2\t지민전용01 (미추천)\t현민수 (als**)\t민똘이\t26/02/04 00:52\t50,000  \t현민수\t26/02/04\t충전완료
1\t지민전용01 (미추천)\t최재훈 (dyd**)\tpersipic\t26/02/04 00:22\t60,000  \t최재훈\t26/02/04\t충전완료"""

# Test parser
print("--- Parser Test ---")
parsed = PasteImportService.parse_daily_deposit(text)
print(f"Parsed count: {len(parsed)}")
for p in parsed:
    print(f"  nickname={p.nickname}, amount={p.amount:,}, deposit_at={p.deposit_at}")

# Test full import with DB
print("\n--- Full Import Test ---")
db: Session = SessionLocal()
try:
    result = PasteImportService.import_daily_deposits(db, text, admin_id="test_script")
    print(f"Result: {result}")
except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()
finally:
    db.close()
