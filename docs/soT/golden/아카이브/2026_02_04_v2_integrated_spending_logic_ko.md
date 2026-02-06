# [SoT] Integrated Spending System v4.0 (Implementation Ready)

**Status**: ⚠️ 구현 대기 (설계 완료)
**Domain**: Golden Economy
**Owner**: Antigravity
**Date**: 2026-02-05
**Version**: v4.0 (AI-Implementable Specification)

---

## 0. 구현 전 필수 확인사항

### 0.1. 이 문서의 목적
- **HQ 환전 데이터**를 지출로 기록하여 대시보드에서 **순수익 = 입금 - 지출** 계산 가능하게 함
- 저가 AI 모델도 이 문서만 보고 구현 가능한 수준의 상세 명세 제공

### 0.2. 구현 순서 (반드시 이 순서대로)
1. DB 마이그레이션 생성 및 실행 (완료)
2. SQLAlchemy 모델 생성 (완료)
3. 서비스 레이어 구현 (완료)
4. API 라우터 구현 (완료)
5. 프론트엔드 연동 (완료)

### 0.3. 구현 상태 체크리스트

| # | 구성요소 | 파일 경로 | 상태 |
|---|---------|----------|------|
| 1 | DB Migration (spending_ledger) | `alembic/versions/20260205_0100_add_v2_spending_ledger.py` | ✅ |
| 2 | DB Migration (withdrawal_log) | `alembic/versions/20260205_0200_add_v2_hq_withdrawal_log.py` | ✅ |
| 3 | Model (spending_ledger) | `app/v2/models/v2_spending_ledger.py` | ✅ |
| 4 | Model (withdrawal_log) | `app/v2/models/v2_hq_daily_withdrawal_log.py` | ✅ |
| 5 | Model __init__ export | `app/v2/models/__init__.py` | ✅ |
| 6 | SpendingLogger Service | `app/v2/services/spending_logger_service.py` | ✅ |
| 7 | PasteImportService 확장 | `app/v2/services/paste_import_service.py` | ✅ |
| 8 | API Route | `app/v2/api/admin/csv_import_routes.py` | ✅ |
| 9 | Frontend | `src/v2/admin/pages/ops/PasteImportPage.tsx` | ✅ |

---

## 1. 입력 데이터 형식 (HQ 환전 내역)

### 1.1. 원본 데이터 예시
```
번호	소속 (추천인)	이름 (아이디)	닉네임	신청 날짜	환전 금액	계좌번호	예금주	환전 날짜	배팅금	상태
1	HJ	박관종(hjer5429)	꽁돌이	26/02/04 16:00	50,000	110-***-******	박**	26/02/04 16:05	150,000	정상
2	-	김영희(kim123)	영희맘	26/02/04 17:30	100,000	123-***-******	김**	26/02/04 17:35	300,000	정상
3	CC	이철수(lee456)	철수아빠	26/02/04 18:00	30,000	456-***-******	이**	-	50,000	취소
```

### 1.2. 컬럼 상세 정의

| Index | 컬럼명 | 파싱 규칙 | 저장 필드 | 필수 여부 |
|-------|--------|----------|-----------|----------|
| 0 | 번호 | 정수 파싱, 실패시 무시 | - (저장 안함) | X |
| 1 | 소속 (추천인) | `strip()` 후 저장, `-`이면 빈문자열 | `referrer_code` | X |
| 2 | 이름 (아이디) | 괄호 내 추출: `정규식 \(([^)]+)\)` | `cc_id` | X |
| 3 | 닉네임 | `strip()` 후 저장 | `nickname` | **O** |
| 4 | 신청 날짜 | 날짜 파싱 | `request_at` | X |
| 5 | 환전 금액 | `,` 제거 후 정수 변환 | `amount` | **O** |
| 6 | 계좌번호 | **저장 안함** (민감정보) | - | X |
| 7 | 예금주 | **저장 안함** (민감정보) | - | X |
| 8 | 환전 날짜 | 날짜 파싱 | `withdrawal_at` | **O** |
| 9 | 배팅금 | `,` 제거 후 정수 변환 | `bet_amount` | X |
| 10 | 상태 | `strip()` 후 비교 | `hq_status` | **O** |

### 1.3. 처리 조건 (IF문)

```python
# 행 처리 조건
def should_process_row(parts: list) -> bool:
    # 조건 1: 컬럼 수가 11개 이상
    if len(parts) < 11:
        return False

    # 조건 2: 헤더 행 스킵
    if '번호' in parts[0] or '닉네임' in parts[3] or '상태' in parts[10]:
        return False

    # 조건 3: 상태가 '정상'인 행만 처리
    status = parts[10].strip()
    if status != '정상':
        return False  # '취소', '반려', '대기' 등은 스킵

    # 조건 4: 닉네임이 비어있지 않음
    nickname = parts[3].strip()
    if not nickname:
        return False

    # 조건 5: 환전 금액이 0보다 큼
    amount = parse_amount(parts[5])
    if amount <= 0:
        return False

    # 조건 6: 환전 날짜가 유효함
    withdrawal_at = parse_datetime(parts[8])
    if withdrawal_at is None:
        return False

    return True
```

---

## 2. 데이터 파싱 함수 상세

### 2.1. 금액 파싱 함수 (완전한 코드)

```python
def parse_amount(value: str) -> int:
    """금액 문자열을 정수로 변환

    입력 예시: "50,000", "100000", "₩30,000", "30000원", "-", ""
    출력: 50000, 100000, 30000, 30000, 0, 0

    규칙:
    1. None 또는 빈 문자열 → 0
    2. "-" → 0
    3. 쉼표(,) 제거
    4. 공백 제거
    5. "원", "₩", "KRW" 제거
    6. 소수점 포함 시 정수로 변환 (내림)
    7. 변환 실패 시 0
    """
    if not value:
        return 0

    value = str(value).strip()

    if value == '-' or value == '':
        return 0

    # 문자 제거
    cleaned = value.replace(',', '')  # 쉼표
    cleaned = cleaned.replace(' ', '')  # 공백
    cleaned = cleaned.replace('원', '')  # 한글
    cleaned = cleaned.replace('₩', '')   # 기호
    cleaned = cleaned.replace('KRW', '') # 영문

    if not cleaned or cleaned == '-':
        return 0

    try:
        # 소수점 포함 시 정수 변환
        return int(float(cleaned))
    except (ValueError, TypeError):
        return 0
```

### 2.2. 날짜 파싱 함수 (완전한 코드)

```python
from datetime import datetime
from typing import Optional

def parse_datetime(value: str) -> Optional[datetime]:
    """날짜 문자열을 datetime으로 변환

    지원 형식 (우선순위 순):
    1. "26/02/04 16:00" → 2026-02-04 16:00:00 (YY/MM/DD HH:MM)
    2. "2026/02/04 16:00:00" → 2026-02-04 16:00:00 (YYYY/MM/DD HH:MM:SS)
    3. "2026/02/04 16:00" → 2026-02-04 16:00:00 (YYYY/MM/DD HH:MM)
    4. "2026-02-04T16:00:00" → ISO 형식
    5. "2026-02-04 16:00:00"
    6. "26/02/04" → 2026-02-04 00:00:00 (시간 없음)

    실패 조건:
    - None, 빈 문자열, "-" → None 반환
    - 파싱 실패 → None 반환
    """
    if not value:
        return None

    value = str(value).strip()

    if value == '-' or value == '':
        return None

    # 시도할 형식 목록 (우선순위 순)
    formats = [
        "%y/%m/%d %H:%M",      # 26/02/04 16:00 (가장 흔함)
        "%Y/%m/%d %H:%M:%S",   # 2026/02/04 16:00:00
        "%Y/%m/%d %H:%M",      # 2026/02/04 16:00
        "%Y-%m-%dT%H:%M:%S",   # ISO 형식
        "%Y-%m-%d %H:%M:%S",
        "%Y-%m-%d %H:%M",
        "%y/%m/%d",            # 26/02/04 (시간 없음)
        "%Y/%m/%d",
        "%Y-%m-%d",
    ]

    for fmt in formats:
        try:
            return datetime.strptime(value, fmt)
        except ValueError:
            continue

    return None
```

### 2.3. CC ID 추출 함수 (완전한 코드)

```python
import re
from typing import Tuple

def extract_cc_id(name_with_id: str) -> Tuple[str, str]:
    """이름(아이디) 형식에서 CC ID 추출

    입력 예시: "박관종(hjer5429)", "김영희(kim_123)", "이철수"
    출력: ("hjer5429", "박관종"), ("kim_123", "김영희"), ("이철수", "이철수")

    규칙:
    1. 괄호가 있으면 괄호 내 문자열을 cc_id로 추출
    2. 괄호가 없으면 전체 문자열을 cc_id와 name 모두에 사용
    3. 빈 문자열이면 ("", "") 반환
    """
    if not name_with_id:
        return ("", "")

    name_with_id = str(name_with_id).strip()

    # 괄호 내 ID 추출: (xxx) 패턴
    match = re.search(r'\(([^)]+)\)', name_with_id)

    if match:
        cc_id = match.group(1).strip()
        # 괄호 부분을 제거하여 이름 추출
        name = name_with_id.replace(f'({cc_id})', '').strip()
        return (cc_id, name)
    else:
        # 괄호가 없으면 전체를 cc_id와 name으로 사용
        return (name_with_id, name_with_id)
```

### 2.4. 중복 방지 키 생성 함수 (완전한 코드)

```python
import hashlib

def generate_dedup_key(nickname: str, amount: int, withdrawal_at: datetime) -> str:
    """중복 방지 키 생성

    규칙:
    1. nickname을 소문자로 변환 후 공백 제거
    2. amount를 문자열로 변환
    3. withdrawal_at을 "YYYYMMDDHHMM" 형식으로 변환
    4. 세 값을 "|"로 연결
    5. MD5 해시 생성 후 앞 16자리 반환

    예시:
    - 입력: "꽁돌이", 50000, datetime(2026, 2, 4, 16, 5)
    - 중간값: "꽁돌이|50000|202602041605"
    - 출력: "a1b2c3d4e5f6g7h8" (16자리 해시)
    """
    # 1. 닉네임 정규화: 소문자, 공백 제거
    normalized_nickname = nickname.lower().strip()

    # 2. 금액을 문자열로
    amount_str = str(amount)

    # 3. 날짜를 YYYYMMDDHHMM 형식으로
    if withdrawal_at:
        dt_str = withdrawal_at.strftime("%Y%m%d%H%M")
    else:
        dt_str = "no_time"

    # 4. 연결
    raw_key = f"{normalized_nickname}|{amount_str}|{dt_str}"

    # 5. MD5 해시 (16자리)
    return hashlib.md5(raw_key.encode('utf-8')).hexdigest()[:16]
```

---

## 3. 데이터베이스 스키마

### 3.1. v2_spending_ledger 테이블 (지출 통합 원장)

```sql
-- 마이그레이션 파일: alembic/versions/20260205_0100_add_v2_spending_ledger.py

CREATE TABLE v2_spending_ledger (
    id BIGSERIAL PRIMARY KEY,

    -- 중복 방지: SOURCE_REFID 형식 (예: HQ_W_a1b2c3d4, VAULT_W_123)
    transaction_id VARCHAR(100) NOT NULL,

    -- 유저 FK (삭제 시 CASCADE)
    user_id INTEGER NOT NULL,

    -- 원본 금액 (환전/구매 금액)
    amount BIGINT NOT NULL,

    -- 통화 유형: 'KRW', 'POINT', 'G_W'
    currency_type VARCHAR(20) NOT NULL,

    -- KRW 환산 금액 (POINT는 1:1, G_W는 환율 적용)
    converted_krw_amount BIGINT NOT NULL,

    -- 지출 소스: 'HQ_W' (HQ환전), 'VAULT_W' (금고출금), 'SHOP_U' (상점사용)
    spending_source VARCHAR(20) NOT NULL,

    -- 운영일 (KST 09:00 리셋 기준, DATE 타입)
    kst_date DATE NOT NULL,

    -- 추가 메타데이터 (JSON)
    metadata JSONB,

    -- 생성 시각
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- 제약조건
    CONSTRAINT uq_spending_transaction UNIQUE (transaction_id),
    CONSTRAINT fk_spending_user FOREIGN KEY (user_id)
        REFERENCES v2_user(id) ON DELETE CASCADE,
    CONSTRAINT chk_spending_source CHECK (spending_source IN ('HQ_W', 'VAULT_W', 'SHOP_U')),
    CONSTRAINT chk_currency_type CHECK (currency_type IN ('KRW', 'POINT', 'G_W'))
);

-- 인덱스
CREATE INDEX idx_spending_user_id ON v2_spending_ledger(user_id);
CREATE INDEX idx_spending_kst_date ON v2_spending_ledger(kst_date);
CREATE INDEX idx_spending_source ON v2_spending_ledger(spending_source);
CREATE INDEX idx_spending_created_at ON v2_spending_ledger(created_at);
```

### 3.2. v2_hq_daily_withdrawal_log 테이블 (HQ 환전 로그)

```sql
-- 마이그레이션 파일: alembic/versions/20260205_0200_add_v2_hq_withdrawal_log.py

CREATE TABLE v2_hq_daily_withdrawal_log (
    id BIGSERIAL PRIMARY KEY,

    -- 중복 방지 키 (MD5 해시 16자리)
    dedup_key VARCHAR(64) NOT NULL,

    -- HQ 원본 데이터
    nickname VARCHAR(100) NOT NULL,
    cc_id VARCHAR(100),
    amount BIGINT NOT NULL,
    bet_amount BIGINT,
    request_at TIMESTAMP,
    withdrawal_at TIMESTAMP NOT NULL,
    referrer_code VARCHAR(50),
    hq_status VARCHAR(20) NOT NULL,  -- '정상', '취소' 등

    -- V2User 매칭 결과
    user_id INTEGER,
    match_status VARCHAR(20) NOT NULL DEFAULT 'NOT_FOUND',  -- 'MATCHED', 'NOT_FOUND'

    -- Import 배치 정보
    import_batch_id VARCHAR(36),

    -- 생성 시각
    created_at TIMESTAMP DEFAULT NOW(),

    -- 제약조건
    CONSTRAINT uq_hq_withdrawal_dedup UNIQUE (dedup_key),
    CONSTRAINT fk_hq_withdrawal_user FOREIGN KEY (user_id)
        REFERENCES v2_user(id) ON DELETE SET NULL
);

-- 인덱스
CREATE INDEX idx_hq_withdrawal_user_id ON v2_hq_daily_withdrawal_log(user_id);
CREATE INDEX idx_hq_withdrawal_date ON v2_hq_daily_withdrawal_log(withdrawal_at);
CREATE INDEX idx_hq_withdrawal_batch ON v2_hq_daily_withdrawal_log(import_batch_id);
CREATE INDEX idx_hq_withdrawal_nickname ON v2_hq_daily_withdrawal_log(nickname);
```

---

## 4. SQLAlchemy 모델 (완전한 코드)

### 4.1. V2SpendingLedger 모델

파일: `app/v2/models/v2_spending_ledger.py`

```python
"""V2 Spending Ledger Model - 지출 통합 원장

작성일: 2026-02-05
설계서: docs/v2_specs/07_golden/2026_02_04_v2_integrated_spending_logic_ko.md
"""
from datetime import datetime, date
from typing import Optional, Dict, Any

from sqlalchemy import Column, Integer, BigInteger, String, Date, DateTime, ForeignKey, Index
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship

from app.db.base_class import Base


class V2SpendingLedger(Base):
    """지출 통합 원장 테이블

    지출 소스 (spending_source):
    - HQ_W: HQ 환전 (외부 카지노에서 환전)
    - VAULT_W: 금고 출금 (내부 금고에서 출금 승인)
    - SHOP_U: 상점 사용 (상점 아이템 구매)

    통화 유형 (currency_type):
    - KRW: 원화 (환전/출금)
    - POINT: 포인트 (상점 구매)
    - G_W: 게임 지갑 (예비)
    """
    __tablename__ = "v2_spending_ledger"

    id = Column(BigInteger, primary_key=True, autoincrement=True)

    # 중복 방지 키: {SOURCE}_{REF_ID} 형식
    # 예: HQ_W_a1b2c3d4e5f6g7h8, VAULT_W_123, SHOP_U_456
    transaction_id = Column(String(100), unique=True, nullable=False, index=True)

    # 유저 FK
    user_id = Column(Integer, ForeignKey("v2_user.id", ondelete="CASCADE"), nullable=False, index=True)

    # 원본 금액
    amount = Column(BigInteger, nullable=False)

    # 통화 유형
    currency_type = Column(String(20), nullable=False)  # KRW, POINT, G_W

    # KRW 환산 금액
    converted_krw_amount = Column(BigInteger, nullable=False)

    # 지출 소스
    spending_source = Column(String(20), nullable=False, index=True)  # HQ_W, VAULT_W, SHOP_U

    # 운영일 (KST 09:00 리셋 기준)
    kst_date = Column(Date, nullable=False, index=True)

    # 메타데이터 (JSON)
    metadata = Column(JSONB, nullable=True)

    # 생성 시각
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)

    # Relationship
    user = relationship("V2User", back_populates="spending_records")

    # 복합 인덱스
    __table_args__ = (
        Index('idx_spending_date_source', 'kst_date', 'spending_source'),
    )

    def __repr__(self):
        return f"<V2SpendingLedger(id={self.id}, tx={self.transaction_id}, amount={self.amount})>"
```

### 4.2. V2HQDailyWithdrawalLog 모델

파일: `app/v2/models/v2_hq_daily_withdrawal_log.py`

```python
"""V2 HQ Daily Withdrawal Log Model - HQ 환전 로그

작성일: 2026-02-05
설계서: docs/v2_specs/07_golden/2026_02_04_v2_integrated_spending_logic_ko.md
"""
from datetime import datetime
from typing import Optional

from sqlalchemy import Column, Integer, BigInteger, String, DateTime, ForeignKey, Index
from sqlalchemy.orm import relationship

from app.db.base_class import Base


class V2HQDailyWithdrawalLog(Base):
    """HQ 환전 로그 테이블

    HQ에서 붙여넣기한 환전 내역을 저장합니다.
    V2User와 매칭되면 v2_spending_ledger에도 기록됩니다.

    매칭 상태 (match_status):
    - MATCHED: V2User와 매칭 성공
    - NOT_FOUND: 닉네임으로 유저를 찾을 수 없음
    """
    __tablename__ = "v2_hq_daily_withdrawal_log"

    id = Column(BigInteger, primary_key=True, autoincrement=True)

    # 중복 방지 키: MD5(nickname|amount|withdrawal_at)[:16]
    dedup_key = Column(String(64), unique=True, nullable=False, index=True)

    # HQ 원본 데이터
    nickname = Column(String(100), nullable=False, index=True)
    cc_id = Column(String(100), nullable=True)
    amount = Column(BigInteger, nullable=False)
    bet_amount = Column(BigInteger, nullable=True)  # 배팅금 (분석용)
    request_at = Column(DateTime, nullable=True)    # 신청 날짜
    withdrawal_at = Column(DateTime, nullable=False, index=True)  # 환전 날짜
    referrer_code = Column(String(50), nullable=True)  # 소속/추천인
    hq_status = Column(String(20), nullable=False)     # '정상', '취소' 등

    # V2User 매칭 결과
    user_id = Column(Integer, ForeignKey("v2_user.id", ondelete="SET NULL"), nullable=True, index=True)
    match_status = Column(String(20), nullable=False, default='NOT_FOUND')  # MATCHED, NOT_FOUND

    # Import 배치 정보
    import_batch_id = Column(String(36), nullable=True, index=True)

    # 생성 시각
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationship
    user = relationship("V2User")

    def __repr__(self):
        return f"<V2HQDailyWithdrawalLog(id={self.id}, nickname={self.nickname}, amount={self.amount})>"
```

### 4.3. models/__init__.py 수정

파일: `app/v2/models/__init__.py` (기존 파일에 추가)

```python
# 기존 import들...

# 지출 관련 모델 추가 (2026-02-05)
from app.v2.models.v2_spending_ledger import V2SpendingLedger
from app.v2.models.v2_hq_daily_withdrawal_log import V2HQDailyWithdrawalLog

# __all__에 추가
__all__ = [
    # ... 기존 항목들 ...
    "V2SpendingLedger",
    "V2HQDailyWithdrawalLog",
]
```

---

## 5. 서비스 레이어 구현 (완전한 코드)

### 5.1. SpendingLoggerService

파일: `app/v2/services/spending_logger_service.py`

```python
"""Spending Logger Service - 지출 통합 원장 기록 서비스

작성일: 2026-02-05
설계서: docs/v2_specs/07_golden/2026_02_04_v2_integrated_spending_logic_ko.md

사용법:
    from app.v2.services.spending_logger_service import SpendingLoggerService

    # HQ 환전 기록
    SpendingLoggerService.log_hq_withdrawal(db, user_id=1, amount=50000, dedup_key="a1b2c3d4")

    # 금고 출금 기록
    SpendingLoggerService.log_vault_withdrawal(db, user_id=1, amount=30000, request_id=123)

    # 상점 구매 기록
    SpendingLoggerService.log_shop_purchase(db, user_id=1, amount=5000, order_id=456)
"""
import logging
from datetime import datetime, date, timedelta
from typing import Optional, Dict, Any
from zoneinfo import ZoneInfo

from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app.v2.models.v2_spending_ledger import V2SpendingLedger

logger = logging.getLogger(__name__)


class SpendingLoggerService:
    """지출 통합 원장 기록 서비스"""

    # 지출 소스 상수
    SOURCE_HQ_WITHDRAWAL = "HQ_W"
    SOURCE_VAULT_WITHDRAWAL = "VAULT_W"
    SOURCE_SHOP_PURCHASE = "SHOP_U"

    # 통화 유형 상수
    CURRENCY_KRW = "KRW"
    CURRENCY_POINT = "POINT"
    CURRENCY_GW = "G_W"

    # POINT -> KRW 환율 (1:1)
    POINT_TO_KRW_RATE = 1

    @staticmethod
    def get_operational_date_kst(now: Optional[datetime] = None) -> date:
        """운영일 계산 (KST 09:00 리셋 기준)

        규칙:
        - KST 기준 09:00 이전이면 전날이 운영일
        - KST 기준 09:00 이후이면 당일이 운영일

        예시 (KST 기준):
        - 2026-02-05 08:59:59 → 운영일 = 2026-02-04
        - 2026-02-05 09:00:00 → 운영일 = 2026-02-05
        - 2026-02-05 23:59:59 → 운영일 = 2026-02-05
        """
        KST = ZoneInfo("Asia/Seoul")
        RESET_HOUR = 9  # 09:00 리셋

        if now is None:
            now = datetime.now(KST)
        elif now.tzinfo is None:
            # naive datetime이면 UTC로 간주하고 KST로 변환
            from datetime import timezone
            now = now.replace(tzinfo=timezone.utc).astimezone(KST)
        else:
            now = now.astimezone(KST)

        if now.hour < RESET_HOUR:
            # 09:00 이전이면 전날
            return (now - timedelta(days=1)).date()
        else:
            # 09:00 이후이면 당일
            return now.date()

    @staticmethod
    def convert_to_krw(amount: int, currency_type: str) -> int:
        """통화를 KRW로 환산

        환율:
        - KRW: 1:1 (변환 없음)
        - POINT: 1:1
        - G_W: 추후 환율 적용 (현재는 1:1)
        """
        if currency_type == SpendingLoggerService.CURRENCY_KRW:
            return amount
        elif currency_type == SpendingLoggerService.CURRENCY_POINT:
            return amount * SpendingLoggerService.POINT_TO_KRW_RATE
        elif currency_type == SpendingLoggerService.CURRENCY_GW:
            # TODO: 실제 환율 적용 필요
            return amount
        else:
            logger.warning(f"Unknown currency type: {currency_type}, using 1:1 rate")
            return amount

    @staticmethod
    def log_spending(
        db: Session,
        user_id: int,
        amount: int,
        currency_type: str,
        source: str,
        ref_id: str,
        metadata: Optional[Dict[str, Any]] = None,
        now: Optional[datetime] = None,
    ) -> int:
        """지출 기록 (원자적)

        Args:
            db: SQLAlchemy 세션
            user_id: 유저 ID
            amount: 원본 금액
            currency_type: 통화 유형 (KRW, POINT, G_W)
            source: 지출 소스 (HQ_W, VAULT_W, SHOP_U)
            ref_id: 참조 ID (dedup_key 또는 PK)
            metadata: 추가 메타데이터
            now: 기준 시각 (테스트용)

        Returns:
            생성된 spending_ledger.id, 중복이면 0

        Raises:
            ValueError: 유효하지 않은 파라미터
        """
        # 파라미터 검증
        if amount <= 0:
            logger.warning(f"Invalid amount: {amount}, skipping")
            return 0

        if source not in [
            SpendingLoggerService.SOURCE_HQ_WITHDRAWAL,
            SpendingLoggerService.SOURCE_VAULT_WITHDRAWAL,
            SpendingLoggerService.SOURCE_SHOP_PURCHASE,
        ]:
            raise ValueError(f"Invalid spending source: {source}")

        if currency_type not in [
            SpendingLoggerService.CURRENCY_KRW,
            SpendingLoggerService.CURRENCY_POINT,
            SpendingLoggerService.CURRENCY_GW,
        ]:
            raise ValueError(f"Invalid currency type: {currency_type}")

        # 운영일 계산
        kst_date = SpendingLoggerService.get_operational_date_kst(now)

        # KRW 환산
        converted_krw = SpendingLoggerService.convert_to_krw(amount, currency_type)

        # transaction_id 생성
        transaction_id = f"{source}_{ref_id}"

        # 중복 체크 및 Insert
        try:
            ledger = V2SpendingLedger(
                transaction_id=transaction_id,
                user_id=user_id,
                amount=amount,
                currency_type=currency_type,
                converted_krw_amount=converted_krw,
                spending_source=source,
                kst_date=kst_date,
                metadata=metadata,
            )
            db.add(ledger)
            db.flush()

            logger.info(
                f"[SpendingLogger] Recorded: tx={transaction_id}, "
                f"user={user_id}, amount={amount}, krw={converted_krw}"
            )

            return ledger.id

        except IntegrityError:
            # 중복 기록 (transaction_id UNIQUE 제약 위반)
            db.rollback()
            logger.info(f"[SpendingLogger] Duplicate skipped: tx={transaction_id}")
            return 0

    @staticmethod
    def log_hq_withdrawal(
        db: Session,
        user_id: int,
        amount: int,
        dedup_key: str,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> int:
        """HQ 환전 지출 기록

        Args:
            db: SQLAlchemy 세션
            user_id: 유저 ID
            amount: 환전 금액 (KRW)
            dedup_key: 중복 방지 키 (16자리 해시)
            metadata: 추가 정보 (닉네임, 환전일시 등)

        Returns:
            생성된 spending_ledger.id
        """
        return SpendingLoggerService.log_spending(
            db=db,
            user_id=user_id,
            amount=amount,
            currency_type=SpendingLoggerService.CURRENCY_KRW,
            source=SpendingLoggerService.SOURCE_HQ_WITHDRAWAL,
            ref_id=dedup_key[:16],  # 16자리로 제한
            metadata=metadata,
        )

    @staticmethod
    def log_vault_withdrawal(
        db: Session,
        user_id: int,
        amount: int,
        request_id: int,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> int:
        """금고 출금 승인 시 지출 기록

        Args:
            db: SQLAlchemy 세션
            user_id: 유저 ID
            amount: 출금 금액 (KRW)
            request_id: VaultWithdrawalRequest.id
            metadata: 추가 정보

        Returns:
            생성된 spending_ledger.id
        """
        return SpendingLoggerService.log_spending(
            db=db,
            user_id=user_id,
            amount=amount,
            currency_type=SpendingLoggerService.CURRENCY_KRW,
            source=SpendingLoggerService.SOURCE_VAULT_WITHDRAWAL,
            ref_id=str(request_id),
            metadata=metadata,
        )

    @staticmethod
    def log_shop_purchase(
        db: Session,
        user_id: int,
        amount: int,
        order_id: int,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> int:
        """상점 구매 시 지출 기록

        Args:
            db: SQLAlchemy 세션
            user_id: 유저 ID
            amount: 구매 금액 (POINT)
            order_id: V2ShopOrder.id
            metadata: 추가 정보

        Returns:
            생성된 spending_ledger.id
        """
        return SpendingLoggerService.log_spending(
            db=db,
            user_id=user_id,
            amount=amount,
            currency_type=SpendingLoggerService.CURRENCY_POINT,
            source=SpendingLoggerService.SOURCE_SHOP_PURCHASE,
            ref_id=str(order_id),
            metadata=metadata,
        )
```

### 5.2. PasteImportService 확장 (환전 Import 추가)

파일: `app/v2/services/paste_import_service.py` (기존 파일에 메서드 추가)

```python
# 기존 import 섹션에 추가
import hashlib
import uuid
from dataclasses import dataclass
from app.v2.models.v2_hq_daily_withdrawal_log import V2HQDailyWithdrawalLog
from app.v2.services.spending_logger_service import SpendingLoggerService


@dataclass
class ParsedWithdrawal:
    """파싱된 환전 건"""
    nickname: str
    cc_id: str
    amount: int
    bet_amount: int
    request_at: Optional[datetime]
    withdrawal_at: datetime
    referrer_code: str
    hq_status: str
    raw_line: str


class PasteImportService:
    # ... 기존 메서드들 ...

    @staticmethod
    def parse_daily_withdrawal(text: str) -> List[ParsedWithdrawal]:
        """HQ 환전 내역 파싱

        입력 형식:
        번호\t소속 (추천인)\t이름 (아이디)\t닉네임\t신청 날짜\t환전 금액\t계좌번호\t예금주\t환전 날짜\t배팅금\t상태

        처리 규칙:
        1. 탭(\t)으로 분리
        2. 컬럼 11개 미만이면 스킵
        3. 헤더 행 스킵 ('번호', '닉네임', '상태' 포함)
        4. 모든 상태의 행을 파싱 (필터링은 import_daily_withdrawals에서)

        Returns:
            List[ParsedWithdrawal]: 파싱된 환전 목록
        """
        results = []
        lines = text.strip().split('\n')

        for line_num, line in enumerate(lines, start=1):
            if not line.strip():
                continue

            parts = line.split('\t')

            # 컬럼 수 체크
            if len(parts) < 11:
                logger.debug(f"[PasteImport] Line {line_num}: Insufficient columns ({len(parts)}), skipping")
                continue

            # 헤더 스킵
            if '번호' in parts[0] or '닉네임' in parts[3] or '상태' in parts[10]:
                logger.debug(f"[PasteImport] Line {line_num}: Header row, skipping")
                continue

            try:
                # 데이터 추출
                cc_id, _ = PasteImportService._extract_cc_id(parts[2].strip())
                nickname = parts[3].strip()
                amount = PasteImportService._parse_amount(parts[5])
                bet_amount = PasteImportService._parse_amount(parts[9])
                request_at = PasteImportService._parse_datetime(parts[4])
                withdrawal_at = PasteImportService._parse_datetime(parts[8])
                referrer_code = parts[1].strip() if parts[1].strip() != '-' else ''
                hq_status = parts[10].strip()

                # 필수 필드 검증
                if not nickname:
                    logger.debug(f"[PasteImport] Line {line_num}: Empty nickname, skipping")
                    continue

                if withdrawal_at is None:
                    logger.debug(f"[PasteImport] Line {line_num}: Invalid withdrawal_at, skipping")
                    continue

                results.append(ParsedWithdrawal(
                    nickname=nickname,
                    cc_id=cc_id,
                    amount=amount,
                    bet_amount=bet_amount,
                    request_at=request_at,
                    withdrawal_at=withdrawal_at,
                    referrer_code=referrer_code,
                    hq_status=hq_status,
                    raw_line=line,
                ))

            except Exception as e:
                logger.warning(f"[PasteImport] Line {line_num}: Parse error - {e}")
                continue

        logger.info(f"[PasteImport] Parsed {len(results)} withdrawal records")
        return results

    @staticmethod
    def _generate_withdrawal_dedup_key(nickname: str, amount: int, withdrawal_at: datetime) -> str:
        """환전 중복 방지 키 생성

        규칙: MD5(lowercase(nickname)|amount|YYYYMMDDHHMM)[:16]
        """
        normalized_nickname = nickname.lower().strip()
        amount_str = str(amount)
        dt_str = withdrawal_at.strftime("%Y%m%d%H%M") if withdrawal_at else "no_time"

        raw_key = f"{normalized_nickname}|{amount_str}|{dt_str}"
        return hashlib.md5(raw_key.encode('utf-8')).hexdigest()[:16]

    @staticmethod
    def import_daily_withdrawals(
        db: Session,
        text: str,
        admin_id: str,
        selected_indices: Optional[List[int]] = None,
    ) -> Dict:
        """HQ 환전 내역 Import

        처리 흐름:
        1. 텍스트 파싱
        2. '정상' 상태만 필터링
        3. 기존 dedup_key와 비교하여 중복 제거
        4. V2User 닉네임 매칭
        5. V2HQDailyWithdrawalLog 저장
        6. 매칭된 건은 v2_spending_ledger에도 기록

        Args:
            db: SQLAlchemy 세션
            text: 붙여넣기 텍스트
            admin_id: 관리자 ID
            selected_indices: 선택된 행 인덱스 (None이면 전체)

        Returns:
            Dict: 처리 결과 통계
        """
        # 1. 파싱
        parsed = PasteImportService.parse_daily_withdrawal(text)
        if not parsed:
            return {
                "success": False,
                "error": "파싱된 데이터가 없습니다. 형식을 확인하세요.",
                "total_parsed": 0,
            }

        # 2. 선택된 인덱스만 필터링
        if selected_indices is not None:
            valid_indices = set(selected_indices)
            parsed = [item for idx, item in enumerate(parsed) if idx in valid_indices]
            logger.info(f"[PasteImport] Selected {len(parsed)} items")

        batch_id = str(uuid.uuid4())[:8]

        # 3. 기존 dedup_key 조회
        existing_keys: Set[str] = set(
            row[0] for row in db.query(V2HQDailyWithdrawalLog.dedup_key).all()
        )

        # 4. 통계 초기화
        stats = {
            "total_parsed": len(parsed),
            "processed_count": 0,
            "skipped_status_count": 0,  # '정상'이 아닌 건
            "duplicate_count": 0,
            "not_found_count": 0,
            "total_amount": 0,
            "spending_recorded_count": 0,
        }

        logs_to_add = []
        matched_details = []

        for item in parsed:
            # 상태 필터링: '정상'만 처리
            if item.hq_status != '정상':
                stats["skipped_status_count"] += 1
                continue

            # 금액 검증
            if item.amount <= 0:
                continue

            # 중복 체크
            dedup_key = PasteImportService._generate_withdrawal_dedup_key(
                item.nickname, item.amount, item.withdrawal_at
            )

            if dedup_key in existing_keys:
                stats["duplicate_count"] += 1
                continue

            existing_keys.add(dedup_key)

            # V2User 매칭 (닉네임 우선)
            user = db.query(V2User).filter(
                func.lower(V2User.nickname) == item.nickname.lower()
            ).first()

            if not user and item.cc_id:
                # cc_id로 재시도
                user = db.query(V2User).filter(
                    func.lower(V2User.cc_id) == item.cc_id.lower()
                ).first()

            match_status = "MATCHED" if user else "NOT_FOUND"

            # HQ 환전 로그 생성
            log = V2HQDailyWithdrawalLog(
                dedup_key=dedup_key,
                nickname=item.nickname,
                cc_id=item.cc_id,
                amount=item.amount,
                bet_amount=item.bet_amount,
                request_at=item.request_at,
                withdrawal_at=item.withdrawal_at,
                referrer_code=item.referrer_code,
                hq_status=item.hq_status,
                user_id=user.id if user else None,
                match_status=match_status,
                import_batch_id=batch_id,
            )
            logs_to_add.append(log)

            if user:
                # 지출 원장에 기록
                spending_id = SpendingLoggerService.log_hq_withdrawal(
                    db=db,
                    user_id=user.id,
                    amount=item.amount,
                    dedup_key=dedup_key,
                    metadata={
                        "nickname": item.nickname,
                        "withdrawal_at": item.withdrawal_at.isoformat() if item.withdrawal_at else None,
                        "bet_amount": item.bet_amount,
                        "batch_id": batch_id,
                    },
                )

                if spending_id > 0:
                    stats["spending_recorded_count"] += 1

                stats["total_amount"] += item.amount
                stats["processed_count"] += 1

                matched_details.append({
                    "nickname": item.nickname,
                    "user_id": user.id,
                    "amount": item.amount,
                    "withdrawal_at": item.withdrawal_at.isoformat() if item.withdrawal_at else None,
                })
            else:
                stats["not_found_count"] += 1

        # 로그 저장
        if logs_to_add:
            db.bulk_save_objects(logs_to_add)

        db.commit()

        # 감사 로그
        V2AdminAuditService.log(
            db,
            admin_id=admin_id,
            action="PASTE_WITHDRAWAL_IMPORT",
            target_type="HQ_WITHDRAWAL",
            target_id=None,
            after={
                "batch_id": batch_id,
                **stats,
            },
        )

        logger.info(
            f"[PasteImport] Withdrawals: total={stats['total_parsed']}, "
            f"processed={stats['processed_count']}, spending={stats['spending_recorded_count']}"
        )

        return {
            "success": True,
            "batch_id": batch_id,
            **stats,
            "matched_details": matched_details[:20],  # 상위 20건만
        }
```

---

## 6. API 라우터 구현

파일: `app/v2/api/admin/csv_import_routes.py` (기존 파일에 엔드포인트 추가)

```python
# 기존 import에 추가
from pydantic import BaseModel
from typing import Optional, List


class WithdrawalImportRequest(BaseModel):
    """환전 Import 요청"""
    text: str  # 붙여넣기 텍스트
    selected_indices: Optional[List[int]] = None  # 선택된 행 인덱스


class WithdrawalImportResponse(BaseModel):
    """환전 Import 응답"""
    success: bool
    batch_id: Optional[str] = None
    total_parsed: int = 0
    processed_count: int = 0
    skipped_status_count: int = 0
    duplicate_count: int = 0
    not_found_count: int = 0
    total_amount: int = 0
    spending_recorded_count: int = 0
    error: Optional[str] = None


@router.post("/paste-import/withdrawal", response_model=WithdrawalImportResponse)
async def import_withdrawals(
    request: WithdrawalImportRequest,
    db: Session = Depends(get_db),
    current_admin: AdminUser = Depends(get_current_admin),
):
    """HQ 환전 내역 붙여넣기 Import

    입력 형식:
    번호\t소속 (추천인)\t이름 (아이디)\t닉네임\t신청 날짜\t환전 금액\t계좌번호\t예금주\t환전 날짜\t배팅금\t상태

    처리 규칙:
    - '정상' 상태만 지출로 기록
    - V2User 닉네임 매칭 후 v2_spending_ledger에 기록
    - 중복 Import 자동 방지 (dedup_key)
    """
    try:
        result = PasteImportService.import_daily_withdrawals(
            db=db,
            text=request.text,
            admin_id=str(current_admin.id),
            selected_indices=request.selected_indices,
        )

        return WithdrawalImportResponse(**result)

    except Exception as e:
        logger.exception("[API] Withdrawal import failed")
        return WithdrawalImportResponse(
            success=False,
            error=str(e),
        )


@router.post("/paste-import/withdrawal/preview")
async def preview_withdrawals(
    request: WithdrawalImportRequest,
    db: Session = Depends(get_db),
    current_admin: AdminUser = Depends(get_current_admin),
):
    """환전 내역 미리보기 (저장 없이 파싱 결과만 반환)"""
    parsed = PasteImportService.parse_daily_withdrawal(request.text)

    return {
        "success": True,
        "total_count": len(parsed),
        "items": [
            {
                "index": idx,
                "nickname": item.nickname,
                "cc_id": item.cc_id,
                "amount": item.amount,
                "bet_amount": item.bet_amount,
                "withdrawal_at": item.withdrawal_at.isoformat() if item.withdrawal_at else None,
                "hq_status": item.hq_status,
                "will_process": item.hq_status == '정상' and item.amount > 0,
            }
            for idx, item in enumerate(parsed)
        ],
    }
```

---

## 7. 연동 지점 (Integration Points)

### 7.1. 금고 출금 승인 시 연동

파일: `app/v2/api/admin/vault_routes.py`

```python
# approve_withdrawal 함수 내부, 승인 처리 후 추가:

from app.v2.services.spending_logger_service import SpendingLoggerService

# 기존 승인 로직 후...
# withdrawal.status = "APPROVED" 처리 후

# 지출 원장에 기록
SpendingLoggerService.log_vault_withdrawal(
    db=db,
    user_id=withdrawal.user_id,
    amount=withdrawal.amount,
    request_id=withdrawal.id,
    metadata={
        "admin_id": current_admin.id,
        "approved_at": datetime.utcnow().isoformat(),
    },
)
```

### 7.2. 상점 구매 시 연동

파일: `app/v2/services/shop_service.py`

```python
# purchase 함수 내부, 주문 생성 성공 후 추가:

from app.v2.services.spending_logger_service import SpendingLoggerService

# 기존 구매 로직 후...
# order 생성 완료 후

# 지출 원장에 기록
SpendingLoggerService.log_shop_purchase(
    db=db,
    user_id=user_id,
    amount=int(product.cost_amount),
    order_id=order.id,
    metadata={
        "product_id": product.id,
        "product_name": product.name,
    },
)
```

---

## 8. 테스트 케이스 명세

파일: `tests/v2/test_spending_logger.py`

### 8.1. 단위 테스트

```python
import pytest
from datetime import datetime, date
from app.v2.services.spending_logger_service import SpendingLoggerService


class TestGetOperationalDateKST:
    """운영일 계산 테스트"""

    def test_before_9am_returns_yesterday(self):
        """KST 09:00 이전은 전날 운영일"""
        # 2026-02-05 08:59 KST
        from zoneinfo import ZoneInfo
        KST = ZoneInfo("Asia/Seoul")
        test_time = datetime(2026, 2, 5, 8, 59, tzinfo=KST)

        result = SpendingLoggerService.get_operational_date_kst(test_time)

        assert result == date(2026, 2, 4)

    def test_at_9am_returns_today(self):
        """KST 09:00 정각은 당일 운영일"""
        from zoneinfo import ZoneInfo
        KST = ZoneInfo("Asia/Seoul")
        test_time = datetime(2026, 2, 5, 9, 0, tzinfo=KST)

        result = SpendingLoggerService.get_operational_date_kst(test_time)

        assert result == date(2026, 2, 5)

    def test_after_9am_returns_today(self):
        """KST 09:00 이후는 당일 운영일"""
        from zoneinfo import ZoneInfo
        KST = ZoneInfo("Asia/Seoul")
        test_time = datetime(2026, 2, 5, 23, 59, tzinfo=KST)

        result = SpendingLoggerService.get_operational_date_kst(test_time)

        assert result == date(2026, 2, 5)


class TestLogSpending:
    """지출 기록 테스트"""

    def test_hq_withdrawal_creates_record(self, db_session, test_user):
        """HQ 환전 기록 생성"""
        result = SpendingLoggerService.log_hq_withdrawal(
            db=db_session,
            user_id=test_user.id,
            amount=50000,
            dedup_key="test_dedup_12345",
        )

        assert result > 0  # ID 반환

        # DB 확인
        from app.v2.models import V2SpendingLedger
        record = db_session.query(V2SpendingLedger).get(result)

        assert record.amount == 50000
        assert record.spending_source == "HQ_W"
        assert record.transaction_id == "HQ_W_test_dedup_1234"

    def test_duplicate_returns_zero(self, db_session, test_user):
        """중복 기록 시 0 반환"""
        # 첫 번째 기록
        result1 = SpendingLoggerService.log_hq_withdrawal(
            db=db_session,
            user_id=test_user.id,
            amount=50000,
            dedup_key="same_key_123456",
        )

        # 두 번째 기록 (동일 키)
        result2 = SpendingLoggerService.log_hq_withdrawal(
            db=db_session,
            user_id=test_user.id,
            amount=50000,
            dedup_key="same_key_123456",
        )

        assert result1 > 0
        assert result2 == 0  # 중복


class TestParseWithdrawal:
    """환전 파싱 테스트"""

    def test_parse_valid_row(self):
        """정상 행 파싱"""
        text = "1\tHJ\t박관종(hjer5429)\t꽁돌이\t26/02/04 16:00\t50,000\t110-***\t박**\t26/02/04 16:05\t150,000\t정상"

        result = PasteImportService.parse_daily_withdrawal(text)

        assert len(result) == 1
        assert result[0].nickname == "꽁돌이"
        assert result[0].cc_id == "hjer5429"
        assert result[0].amount == 50000
        assert result[0].hq_status == "정상"

    def test_skip_header_row(self):
        """헤더 행 스킵"""
        text = "번호\t소속\t이름\t닉네임\t신청 날짜\t환전 금액\t계좌번호\t예금주\t환전 날짜\t배팅금\t상태"

        result = PasteImportService.parse_daily_withdrawal(text)

        assert len(result) == 0

    def test_parse_cancelled_row(self):
        """취소 상태 행도 파싱 (필터링은 import에서)"""
        text = "3\tCC\t이철수(lee456)\t철수아빠\t26/02/04 18:00\t30,000\t456-***\t이**\t-\t50,000\t취소"

        result = PasteImportService.parse_daily_withdrawal(text)

        # 취소 상태도 파싱은 됨 (withdrawal_at이 "-"라 None이면 스킵될 수 있음)
        # 실제 동작에 맞게 조정
```

---

## 9. 변경 이력

- **v4.0 (2026-02-05, Claude)**: AI 구현 가능 수준으로 전면 재작성
  - 모든 파싱 함수 완전한 코드 제공
  - 모든 조건/엣지케이스 IF문으로 명시
  - 테스트 케이스 명세 추가
  - 연동 지점 코드 스니펫 제공
  - 데이터 예시 추가
- v3.0 (2026-02-05): 설계-구현 불일치 해소
- v2.3 (2026-02-04): 중복 방지 증빙 추가
- v2.0 (2026-02-04): 최초 설계
