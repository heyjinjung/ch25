# 🍒 CHERRY_PICKER 세그먼트 설계 문서

**문서 타입**: 설계/영향분석  
**작성일**: 2026-02-04  
**상태**: 초안 검토 중  
**버전**: v1.0  

---

## 1. 개요 (Overview)

### 1.1 목적
운영 효율화를 위해 "체리피커"(Cherry Picker) 유저를 자동 식별하고 별도 세그먼트로 분류하여:
1. 마케팅 비용 낭비 방지 (쿠폰/보너스 남용자 제외)
2. 진성 유저 리텐션 분석 정확도 향상
3. 운영팀 수동 필터링 부담 경감

### 1.2 정의: Cherry Picker란?
> **충전/배팅 의지 없이 무료 혜택(쿠폰, 꽁머니, 첫충 보너스 등)만 노리는 유저**

#### 기존 분석 결과 (analyze_cherry_pickers.py)
키워드 기반 행동 유형 분류:
| 유형 | 키워드 예시 | 설명 |
|------|-------------|------|
| CODE_HUNTER | 코드, 쿠폰, 번호, 이벤트 | 프로모션 코드만 수집 |
| BEGGAR | 주세요, 좀, 서비스, 포인트 | 무료 혜택 요청 |
| PROCESS_POKER | 출금, 환전, 입금없이, 무조건 | 즉시 환전 시도 |
| COMPLAINER | 왜, 안됨, 사기, 장난 | 혜택 불만족 시 클레임 |

#### CSV 운영 데이터 키워드 (실제 메모)
```
'작업', '꽁머니', '차단', '1회성', '테스트', '진상', '개진상'
```

---

## 2. 현행 세그먼트 시스템

### 2.1 현재 구조 (V2UserSegment)
```
┌─────────────────────────────────────────────────────┐
│  v2_user_segment 테이블                             │
├─────────────────────────────────────────────────────┤
│  user_id (PK, FK → v2_user)                         │
│  segment: VIP | WHALE | AT_RISK | COMMON            │
│  total_margin: 총 운영 마진                          │
│  total_charge: 누적 충전 금액                        │
│  inactive_days: 미접속 경과일                        │
│  is_synced_from_hq: HQ 동기화 여부                   │
│  last_synced_at: 마지막 동기화 시각                   │
└─────────────────────────────────────────────────────┘
```

### 2.2 현재 분류 로직 (`_classify_segment`)
```python
# 우선순위 (높음 → 낮음)
1. CSV 명시 세그먼트 → 그대로 사용
2. margin > 1,000,000 → VIP
3. inactive_days > 7 AND margin > 0 → AT_RISK
4. charge_amount > 5,000,000 → WHALE
5. 기본 → COMMON
```

### 2.3 문제점
- **CHERRY_PICKER 미분류**: 현재 마진/충전 기준만 사용
- **AT_RISK 혼재**: 진성 이탈위험 + 체리피커 혼합
- **COMMON 오염**: 실제 활동 가치 없는 유저 포함

---

## 3. CHERRY_PICKER 세그먼트 설계

### 3.1 분류 기준 (Criteria)

#### Option A: 정량적 기준 (Quantitative)
```python
def is_cherry_picker(row: Dict) -> bool:
    """
    체리피커 판별 조건 (모두 충족 시):
    1. 총 충전 금액 < 10,000원 (최소 유의미 충전 미달)
    2. 충전 횟수 ≤ 1회 (첫충만 사용)
    3. 환전 시도 or 환전 금액 > 0 (즉시 출금 행태)
    4. 마진 < 0 (운영 손실 유저)
    5. 최종 활동일 - 가입일 < 3일 (찍먹 후 이탈)
    """
    charge = row.get('total_charge', 0)
    charge_count = row.get('charge_count', 0)  # 새 필드 필요
    withdrawal = row.get('total_withdrawal', 0)  # 새 필드 필요
    margin = row.get('total_margin', 0)
    activity_span = row.get('activity_span_days', 999)  # 새 필드 필요
    
    return (
        charge < 10_000 and
        charge_count <= 1 and
        withdrawal > 0 and
        margin < 0 and
        activity_span < 3
    )
```

#### Option B: 키워드 기반 (Keyword/Memo)
```python
CHERRY_KEYWORDS = [
    '꽁머니', '꽁', '무료', '체험', '쿠폰', '코드',
    '기프티콘', '문상', '가입비', '지원금', '입플',
    '찍먹', '간보기', '작업', '차단', '1회성', '테스트', '진상'
]

def is_cherry_picker_by_keyword(memo: str) -> bool:
    """운영팀 메모 기반 체리피커 판별"""
    text = str(memo or '').lower()
    return any(kw in text for kw in CHERRY_KEYWORDS)
```

#### Option C: 하이브리드 (권장)
```python
def classify_cherry_picker(row: Dict) -> bool:
    """
    2단계 체리피커 판별:
    1. 메모에 명시적 키워드 있으면 즉시 체리피커
    2. 정량 조건 3개 이상 충족 시 체리피커
    """
    # Stage 1: Keyword match (확정)
    memo = str(row.get('메모', ''))
    if is_cherry_picker_by_keyword(memo):
        return True
    
    # Stage 2: Quantitative scoring
    score = 0
    if row.get('total_charge', 0) < 10_000:
        score += 1
    if row.get('charge_count', 0) <= 1:
        score += 1
    if row.get('total_withdrawal', 0) > 0:
        score += 1
    if row.get('total_margin', 0) < 0:
        score += 1
    if row.get('activity_span_days', 999) < 3:
        score += 1
    
    return score >= 3  # 3개 이상 충족
```

### 3.2 세그먼트 우선순위 변경

```python
def _classify_segment(row: Dict) -> str:
    """
    개선된 세그먼트 분류 (CHERRY_PICKER 추가)
    
    우선순위:
    0. CSV 명시 세그먼트 있으면 그대로
    1. 🍒 CHERRY_PICKER (최우선 제외 대상)
    2. VIP (마진 100만+)
    3. AT_RISK (7일+ 미접속 & 마진 양수)
    4. WHALE (충전 500만+)
    5. COMMON (기본)
    """
    # 0. 명시 세그먼트
    explicit = str(row.get('세그먼트', '')).strip().upper()
    if explicit in {'VIP', 'WHALE', 'AT_RISK', 'COMMON', 'CHERRY_PICKER'}:
        return explicit
    
    # 1. 체리피커 판별 (최우선)
    if classify_cherry_picker(row):
        return 'CHERRY_PICKER'
    
    # 2~5. 기존 로직
    margin = _parse_int(row.get('총 운영 마진', 0))
    inactive_days = _parse_int(row.get('접속 경과일', 0))
    charge = _parse_int(row.get('누적 충전 금액', 0))
    
    if margin > 1_000_000:
        return 'VIP'
    elif inactive_days > 7 and margin > 0:
        return 'AT_RISK'
    elif charge > 5_000_000:
        return 'WHALE'
    else:
        return 'COMMON'
```

---

## 4. 영향 범위 분석 (Impact Analysis)

### 4.1 데이터 레이어

| 영역 | 파일 | 변경 내용 | 위험도 |
|------|------|----------|--------|
| Model | `v2_user_segment.py` | segment 컬럼 enum 값 추가 | 🟡 Low |
| Service | `hq_margin_import_service.py` | `_classify_segment` 로직 수정 | 🟡 Low |
| Service | `hq_daily_deposit_import_service.py` | 체리피커는 입금 반영 제외 옵션 | 🟡 Low |

### 4.2 비즈니스 로직

| 영역 | 영향 | 대응 방안 |
|------|------|----------|
| 리텐션 대시보드 | AT_RISK 수치 감소 (진성만 표시) | 세그먼트별 필터 추가 |
| 마케팅 타겟팅 | CHERRY_PICKER 제외 기능 필요 | 타겟 쿼리에 `segment != 'CHERRY_PICKER'` 추가 |
| 쿠폰/보너스 발급 | 자동 제외 정책 적용 가능 | 발급 로직에 세그먼트 체크 추가 |
| 일일 지급 (미션/골든) | 참여 제한 여부 결정 필요 | **운영 정책 결정 필요** ⚠️ |

### 4.3 프론트엔드

| 영역 | 파일 | 변경 내용 |
|------|------|----------|
| 세그먼트 배지 | `UserBadge.tsx` 등 | CHERRY_PICKER 색상/아이콘 추가 |
| 필터 옵션 | 유저 목록 페이지 | 세그먼트 드롭다운에 옵션 추가 |
| 통계 차트 | 리텐션 대시보드 | 세그먼트별 분리 표시 |

### 4.4 운영 정책 결정 필요 사항 ⚠️

| 항목 | 질문 | 옵션 |
|------|------|------|
| 일일 미션 | CHERRY_PICKER 참여 허용? | A) 허용 B) 제한 C) 보상만 감소 |
| 골든타임 | CHERRY_PICKER 참여 허용? | A) 허용 B) 제한 |
| 쿠폰 발급 | 자동 제외? | A) 예 B) 수동 판단 |
| CC Deposit | 입금 반영? | A) 반영 B) 보류 C) 거부 |
| 재분류 | 행동 개선 시 세그먼트 변경? | A) 자동 승격 B) 수동만 |

---

## 5. 구현 계획

### 5.1 Phase 1: 데이터 기반 (즉시)
1. ✅ HQ Daily Import 구현 완료
2. ⏳ `_classify_segment`에 CHERRY_PICKER 로직 추가
3. ⏳ DB 마이그레이션 (segment enum 확장)

### 5.2 Phase 2: 운영 도구 (1주)
1. 관리자 UI에서 CHERRY_PICKER 뱃지/필터 표시
2. 세그먼트 수동 변경 기능 (관리자 전용)
3. 리텐션 대시보드 분리 통계

### 5.3 Phase 3: 자동화 (2주)
1. 신규 유저 자동 모니터링 (3일 후 재분류)
2. 마케팅 타겟팅 자동 제외
3. 쿠폰 발급 정책 연동

---

## 6. 필요 데이터 필드 (신규)

현재 HQ CSV에 없는 필드로, 체리피커 정량 판별에 필요:

| 필드명 | 설명 | 출처 |
|--------|------|------|
| `charge_count` | 충전 횟수 | HQ CSV 추가 요청 or DB 계산 |
| `total_withdrawal` | 누적 환전 금액 | HQ CSV 추가 요청 |
| `activity_span_days` | (최근활동일 - 가입일) | CSV 날짜 필드로 계산 |
| `memo` / `행동유형` | 운영팀 메모 | HQ CSV (이미 존재) |

---

## 7. 리스크 및 완화

| 리스크 | 영향 | 완화 방안 |
|--------|------|----------|
| 오분류 (False Positive) | 진성 유저가 체리피커로 분류 | 메모 키워드 우선, 정량 기준은 보수적 적용 |
| 데이터 부재 | charge_count 등 미제공 시 | 메모 키워드 기반만 사용 (Phase 1) |
| 운영 혼란 | 기존 COMMON과 혼동 | 대시보드에 명확한 구분 표시 |

---

## 8. 결론 및 권장 사항

### 8.1 즉시 적용 가능 (Low Risk)
```python
# hq_margin_import_service.py 에 추가
CHERRY_KEYWORDS = ['꽁머니', '꽁', '작업', '차단', '1회성', '테스트', '진상', '개진상']

def _is_cherry_by_memo(row: Dict) -> bool:
    memo = str(row.get('메모', '') or row.get('행동유형', ''))
    return any(kw in memo for kw in CHERRY_KEYWORDS)

# _classify_segment 첫 번째 체크로 추가
if _is_cherry_by_memo(row):
    return 'CHERRY_PICKER'
```

### 8.2 운영 정책 결정 후 적용
- 일일 미션/골든타임 참여 제한 여부
- CC Deposit 반영 정책

### 8.3 다음 단계
1. **운영팀 확인**: 위 정책 결정 사항 답변 요청
2. **구현**: `_classify_segment` 로직 패치
3. **테스트**: 기존 데이터 재분류 시뮬레이션
4. **배포**: 관리자 UI 업데이트 후 운영 적용

---

## 변경 이력
| 버전 | 날짜 | 작성자 | 내용 |
|------|------|--------|------|
| v1.0 | 2026-02-04 | AI Copilot | 초안 작성 |
