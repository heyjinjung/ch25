# 1단계 감사 보고서: 사용자 및 CRM 핵심

**감사 일시**: 2026-01-11 23:00 KST  
**감사 범위**: `admin_users.py`, `admin_crm.py`, `admin_segments.py`, 관련 모델 및 서비스  
**상태**: 🔴 **Critical Issues Found**

---

## 1. TL;DR (3~5줄)

- **Critical Bug**: `admin_crm.py` CSV 임포트 시 **이중 for 루프**로 인해 모든 행이 건너뛰어짐 (Lines 164-167)
- **Type Mismatch**: `User.telegram_id` (BigInteger) vs `AdminUserProfile.telegram_id` (String) 불일치 → 비교 시 잠재적 오류
- **Identity Resolution**: 5단계 폴백 체인 구현 완료, 409 AMBIGUOUS / 404 NOT_FOUND 처리 적절
- **SegmentRule 모델 없음**: 감사 계획서에 언급된 `SegmentRule` 모델은 미존재 (동적 계산 방식 사용)

---

## 2. 감사 대상 파일

| 파일 | 위치 | LOC | 상태 |
| --- | --- | --- | --- |
| `admin_users.py` | `app/api/admin/routes/` | 84 | ✅ Clean |
| `admin_crm.py` | `app/api/admin/routes/` | 434 | 🔴 Critical Bug |
| `admin_segments.py` | `app/api/admin/routes/` | 48 | ✅ Clean |
| `user.py` (Model) | `app/models/` | 80 | ⚠️ Schema Review |
| `admin_user_profile.py` (Model) | `app/models/` | 44 | ⚠️ Type Mismatch |
| `user_segment.py` (Model) | `app/models/` | 16 | ✅ Simple |
| `admin_user_identity_service.py` | `app/services/` | 196 | ✅ Robust |
| `user_segment_service.py` | `app/services/` | 539 | ⚠️ Minor Issues |

---

## 3. 데이터베이스 모델 분석

### 3-1) User 모델 (`app/models/user.py`)

```python
# 핵심 식별자 필드
id = Column(Integer, primary_key=True)              # 내부 PK
external_id = Column(String(100), unique=True)       # 외부 식별자
nickname = Column(String(100), index=True)           # 운영자 변경 가능
telegram_id = Column(BigInteger, unique=True)        # 숫자형 TG ID ⚠️
telegram_username = Column(String(100))              # 문자열 TG Username
```

**SoT 우선순위**: `User.id` > `User.telegram_id` > `User.external_id` > `User.telegram_username` > `User.nickname`

### 3-2) AdminUserProfile 모델 (`app/models/admin_user_profile.py`)

```python
user_id = Column(Integer, ForeignKey("user.id"), primary_key=True)
external_id = Column(String(100))       # User.external_id 미러
telegram_id = Column(String(100))       # ⚠️ String 타입! (BigInteger 아님)
tags = Column(JSON)                     # ["VIP", "Blacklist"]
```

**⚠️ ISSUE**: `AdminUserProfile.telegram_id`가 String으로 저장되어 `User.telegram_id` (BigInteger)와 직접 비교 불가

### 3-3) UserSegment 모델 - 단순 구조

```python
user_id = Column(Integer, ForeignKey("user.id"), primary_key=True)
segment = Column(String(50), default="NEW")  # 단일 세그먼트만 저장
```

**참고**: `SegmentRule` 모델은 존재하지 않음. 세그먼트는 `UserSegmentService.get_computed_segments()`에서 동적 계산됨.

---

## 4. 식별자(Identity) 해석 규칙 분석

### 4-1) Identity Resolution Flow (`resolve_user_id_by_identifier`)

```
┌─────────────────────────────────────────────────────────┐
│ INPUT: identifier (raw string)                          │
└────────────────────┬────────────────────────────────────┘
                     ▼
┌─────────────────────────────────────────────────────────┐
│ 1. NUMERIC CHECK (raw.isdigit())                        │
│    → User.id exact match                                │
│    → User.telegram_id exact match                       │
│    → AdminUserProfile.telegram_id (legacy string)       │
└────────────────────┬────────────────────────────────────┘
                     ▼
┌─────────────────────────────────────────────────────────┐
│ 2. PATTERN: tg_{id}_{suffix}                            │
│    → Extract {id}, match User.telegram_id               │
└────────────────────┬────────────────────────────────────┘
                     ▼
┌─────────────────────────────────────────────────────────┐
│ 3. TEXT SEARCH (case-insensitive, @ stripped)           │
│    → User.telegram_username                             │
│    → User.nickname                                      │
│    → User.external_id                                   │
└────────────────────┬────────────────────────────────────┘
                     ▼
┌─────────────────────────────────────────────────────────┐
│ RESULT:                                                 │
│  - 1 match: return user_id                              │
│  - N matches: 409 AMBIGUOUS_IDENTIFIER                  │
│  - 0 matches: 404 USER_NOT_FOUND                        │
└─────────────────────────────────────────────────────────┘
```

**✅ 결론**: Identity resolution 로직은 강건함. 다건 매칭 시 409 반환, 미발견 시 404 반환.

---

## 5. Critical Issues (심각 이슈)

### 🔴 CRITICAL-001: CSV Import Double Loop Bug

**위치**: `admin_crm.py` Lines 164-167

```python
# BUG: reader는 iterator, 첫 번째 loop에서 소진됨
for row in reader:  # ← 여기서 total 카운트만 하고 모든 행 소진
    total += 1
for row in reader:  # ← 빈 iterator, 실행 안 됨
    total += 1
    try:
        result = UserSegmentService.resolve_and_sync_user_from_import(...)
```

**영향**: CSV 업로드 시 **모든 행이 처리되지 않음** (total=0 반환)

**수정 방안**:

```python
# 수정: list()로 변환하거나 단일 루프 사용
rows = list(reader)
total = len(rows)
for row in rows:
    # processing...
```

### 🔴 CRITICAL-002: Duplicate db.commit() in upsert_user_profile

**위치**: `user_segment_service.py` Lines 67-70

```python
db.commit()
db.refresh(profile)
db.commit()      # ← 중복
db.refresh(profile)  # ← 중복
```

**영향**: 불필요한 DB 트랜잭션, 성능 저하

---

## 6. High Priority Issues (주요 이슈)

### 🟠 HIGH-001: telegram_id Type Mismatch

| 테이블 | 컬럼 | 타입 |
| --- | --- | --- |
| `user` | `telegram_id` | **BigInteger** |
| `admin_user_profile` | `telegram_id` | **String(100)** |

**문제점**:

- 레거시 데이터에 숫자 외 값 저장 가능 (e.g., `@username`)
- 직접 비교 시 타입 불일치로 매칭 실패 가능

**권장 조치**: 마이그레이션을 통해 `AdminUserProfile.telegram_id`를 정규화

### 🟠 HIGH-002: Silent Identity Sync Failure

**위치**: `user_segment_service.py` Lines 165-170

```python
try:
    db.commit()
except:
    db.rollback()  # ← 에러 무시하고 계속 진행
```

**문제점**: telegram_username 동기화 실패 시 로그 없이 진행

---

## 7. Medium Priority Issues

### 🟡 MEDIUM-001: SegmentRule 모델 미존재

하드코딩된 임계값으로 동적 계산:

```python
WHALE_ACCRUAL_THRESHOLD = 1_000_000
CASHOUT_FREQ_THRESHOLD = 10
```

**권장**: DB 기반 규칙 엔진 또는 설정 파일 분리

---

## 8. 검증 완료 항목

| 점검 항목 | 상태 | 비고 |
| --- | --- | --- |
| 사용자 검색 (ID/닉네임) | ✅ | `list_users(q=...)` |
| 강제 수정 (update) | ✅ | `update_user()` 존재 |
| 삭제 Cascade | ✅ | `ondelete="CASCADE"` |
| CSV 대량 임포트 | 🔴 | Double loop bug |
| 메시지 타겟팅 | ✅ | USER/SEGMENT/TAG/ALL 지원 |
| Identity Frame Switch | ✅ | telegram_username 기반 매칭 |
| 불일치 감지 | ✅ | 409 AMBIGUOUS 반환 |

---

## 9. 권장 조치 요약

| 우선순위 | ID | 조치 내용 | 예상 작업량 |
| --- | --- | --- | --- |
| 🔴 1 | CRITICAL-001 | CSV import double loop 수정 | 10분 |
| 🔴 2 | CRITICAL-002 | Duplicate commit 제거 | 5분 |
| 🟠 3 | HIGH-001 | telegram_id 타입 통일 | 1시간 |
| 🟠 4 | HIGH-002 | Identity sync 로깅 추가 | 15분 |

---

## 10. 부록: SoT 정리

### 10-1) 식별자 SoT 우선순위

1. `User.id` (내부 PK) - 가장 신뢰
2. `User.telegram_id` (BigInteger) - 텔레그램 연동
3. `User.external_id` (String) - 초기 가입
4. `User.telegram_username` (String) - CSV/TG 동기화
5. `User.nickname` (String) - 낮은 신뢰도
6. `AdminUserProfile.telegram_id` (String, Legacy)

### 10-2) Identity Resolve 순서

| 입력 유형 | 검색 순서 |
| --- | --- |
| 숫자만 | User.id → User.telegram_id → AdminUserProfile.telegram_id |
| `tg_{id}_*` | User.telegram_id (추출) |
| 텍스트/@포함 | telegram_username → nickname → external_id |
| 다건 매칭 | 409 AMBIGUOUS_IDENTIFIER |
| 미발견 | 404 USER_NOT_FOUND |

---

**작성자**: Antigravity AI  
**다음 단계**: CRITICAL 이슈 즉시 수정 후 2단계 감사 진행

---

## 11. 운영자 UX 요구사항 분석 (To-Be 제안)

> **⚠️ 관리자 승인 후 패치 후보**

### 11-1) 현장 사용 우선순위 (운영자 관점)

**As-Is (현재 코드)**: `User.id` → `telegram_id` → `external_id` → `telegram_username` → `nickname`

**To-Be (운영자 요청)**:

| 순위 | 식별자 | 운영자 사용 빈도 | 비고 |
| --- | --- | --- | --- |
| 1 | 내부 닉네임 (`User.nickname`) | 가장 높음 | 운영자가 직접 부여/관리 |
| 2 | 텔레그램 유저네임 (`@username`) | 높음 | 가입 시 확보 |
| 3 | 텔레그램 ID (숫자) | 중간 | 명시적 요청 시만 |
| 4 | 실명 (`AdminUserProfile.real_name`) | 중간 | PII - 권한 주의 |
| 5 | CC ID / 외부ID (`User.external_id`) | 낮음 | 레거시 호환 |
| 6 | 내부 User ID | 최소 | 개발자 전용 |

### 11-2) 현재 불편 포인트

```
⚠️ 숫자 입력 시 즉시 User.id/telegram_id로 해석
   → "CC ID가 숫자인 경우" 또는 "운영자 주요 키" 흐름과 충돌
   → 오탐(오인식) 리스크 발생
```

---

## 12. To-Be 검색 UX/규칙 제안

> **⚠️ 관리자 승인 후 구현**

### 12-1) 프리픽스 기반 명시적 검색 (제안)

| 프리픽스 | 대상 필드 | 예시 |
| --- | --- | --- |
| `uid:` | `User.id` | `uid:123` |
| `tgid:` | `User.telegram_id` | `tgid:123456789` |
| `@` 또는 `tg:@` | `User.telegram_username` | `@username`, `tg:@username` |
| `name:` | `AdminUserProfile.real_name` | `name:홍길동` |
| `cc:` | `User.external_id` (CC ID) | `cc:ABC123`, `cc:12345` |
| (프리픽스 없음) | 닉네임 우선 → username → 실명 | `철수`, `kim_user` |

### 12-2) 숫자 해석 정책 변경 (제안)

```diff
- AS-IS: 숫자 입력 → 자동으로 User.id/telegram_id로 해석
+ TO-BE: 숫자 입력 → "무엇을 찾는지 모호함" 경고 또는 프리픽스 요구
```

### 12-3) Display Name 규칙 (제안)

```
표시 우선순위:
1. nickname (있으면) 
2. real_name (있으면)
3. @telegram_username
4. TG ID
5. CC ID (external_id)
6. User ID
```

---

## 13. Identity/CRM SoT(단일 기준) 테이블

> **승인 후 패치 시 구현 기준**

| 개념 | SoT(Write 대상) | 표시/검색 우선순위 | 파생/동기화 규칙 | 비고 |
| --- | --- | --- | --- | --- |
| 내부 닉네임 | `User.nickname` | 1순위 | 운영자 직접 입력/수정, 중복 시 409 | 가입 시 미확보 → 사후 보강 |
| 텔레그램 유저네임 | `User.telegram_username` | 2순위 | `@` 제거 + case-insensitive 정규화 | 가입 시 확보(주요) |
| 텔레그램 ID(숫자) | `User.telegram_id` | 3순위 | 검색은 `tgid:` 프리픽스로만 명시 | 가입 시 확보(주요) |
| 실명 | `AdminUserProfile.real_name` | 4순위 | CRM 정보, PII 권한/로그 주의 | 운영자 보강 |
| CC ID(외부ID) | `User.external_id` | 5순위 | 화면 표기는 **`CC ID`**로 통일 | 숫자/유사숫자 가능 |
| 내부 User ID | `User.id` | 필요 시 | 검색은 `uid:` 프리픽스로만 명시 | PK |
| CRM 레거시 telegram_id | `AdminUserProfile.telegram_id` | 비권장 | 임포트 raw 보관용 한정 | 레거시 정리 대상 |

---

## 14. CSV/엑셀 임포트 범위 확장 점검

### 14-1) 임포트 핵심 리스크

> 단순 CRM 업데이트가 아니라, **User 생성** 및 **identity 동기화** 가능

| 동작 | 위험 수준 | 설명 |
| --- | --- | --- |
| User 자동 생성 | 🔴 High | `external_id`/`telegram_username`만 있으면 새 유저 생성 |
| `telegram_username` 덮어쓰기 | 🟠 Medium | 잘못된 값 입력 시 식별 체계 오염 |
| `AdminUserProfile.telegram_id` 혼재 | 🟠 Medium | 숫자 tg_id / username 문자열 혼재 저장 |

### 14-2) 임포트 Resolve 순서 (현재)

```
1. user_id (CSV 컬럼) → User.id로 직접 조회
2. external_id → User.external_id로 조회
3. telegram (username) → User.telegram_username으로 조회
4. 미존재 시 → 새 User 생성
```

### 14-3) 자동 생성 로직 (요주의)

```python
# external_id 없고 telegram만 있는 경우
final_ext_id = f"tg_{clean_tg}_{datetime.utcnow().timestamp()}"
# ⚠️ 이 패턴이 기존 "tg_{id}_*" 패턴과 섞이면 식별 혼선 발생
```

### 14-4) 권장 조치

1. **생성 정책 문서화**: 어떤 조건에서 User가 생성되는지 명시
2. **Dry-Run 모드**: 실제 생성 전 "이렇게 됩니다" 프리뷰 제공
3. **생성 로그**: 임포트로 생성된 User에 `source=CSV_IMPORT` 마킹

---

## 15. 감사 체크리스트 (확장)

### 15-1) 불일치 유형 분류

| ID | 유형 | 설명 | 상태 |
| --- | --- | --- | --- |
| INC-001 | telegram_id 불일치 | `User.telegram_id` ≠ `AdminUserProfile.telegram_id` (추출값) | ⚠️ 점검 필요 |
| INC-002 | external_id 패턴 혼재 | `tg_{id}_*` vs `tg_{username}_*` 패턴 공존 | ⚠️ 점검 필요 |
| INC-003 | username 변경 미반영 | TG에서 username 변경 시 기존 데이터 업데이트 정책 불명확 | ⚠️ 정책 필요 |
| INC-004 | nickname 중복 | 동일 nickname 다수 유저 → 409 또는 오탐 | ⚠️ 가드레일 필요 |

### 15-2) 운영 UX 관점 점검

| ID | 항목 | 현재 상태 | 권장 조치 |
| --- | --- | --- | --- |
| UX-001 | 식별자 입력 가이드 | 미제공 | 검색창에 힌트 텍스트 추가 |
| UX-002 | 409 AMBIGUOUS 발생 시 후보 표시 | 미구현 | 후보 리스트 모달 제공 |
| UX-003 | 미확인 유저 강조 | 미구현 | 닉네임/실명 미입력 유저 배지 표시 |
| UX-004 | 식별자 변경 히스토리 | 미구현 | `telegram_username` 변경 로그 추적 |

### 15-3) 중복/비효율 쿼리 점검

| ID | 항목 | 위치 | 상태 |
| --- | --- | --- | --- |
| PERF-001 | N+1 쿼리 | `get_segment_detail()` - 루프 내 개별 조회 | ⚠️ 개선 필요 |
| PERF-002 | 중복 commit/refresh | `upsert_user_profile()` | 🔴 수정 필요 |
| PERF-003 | 인덱스 활용 | `external_id`, `telegram_id` 인덱스 | ✅ 적용됨 |

### 15-4) 관측/로그 점검

| ID | 항목 | 현재 상태 | 권장 조치 |
| --- | --- | --- | --- |
| LOG-001 | 404/409 에러 로깅 | ✅ 구현됨 | fingerprint 기반 집계 |
| LOG-002 | 입력 종류 분류 | ✅ 구현됨 | `identifier_kind` 필드 로깅 |
| LOG-003 | 임포트 결과 로그 | ⚠️ 부분 | 생성/업데이트/스킵 구분 로깅 필요 |
| LOG-004 | identity sync 실패 | 🔴 미구현 | silent 실패 → 로깅 추가 필요 |

---

## 16. 운영 플로우 SoT (가입 → 보강)

### 16-1) 가입 직후 (초기 SoT)

```
┌─────────────────────────────────────────────────────────┐
│ telegram_id + telegram_username 중심으로 유저 생성      │
│ → nickname, real_name은 NULL                            │
│ → external_id = "tg_{id}_{timestamp}" 자동 생성        │
└─────────────────────────────────────────────────────────┘
```

### 16-2) 운영 보강 (운영 SoT 완성)

```
┌─────────────────────────────────────────────────────────┐
│ 운영자가 확인 후:                                       │
│ → User.nickname 직접 입력                               │
│ → AdminUserProfile.real_name 입력                       │
│ → 운영 검색/표시 SoT 완성                               │
└─────────────────────────────────────────────────────────┘
```

### 16-3) 핵심 정책

> **숫자 입력 = "편의"가 아니라 "오탐 리스크"**
>
> 기본 정책: **명시적 프리픽스만 허용**

---

**업데이트**: 2026-01-11 23:12 KST  
**다음 단계**: To-Be 검색 UX 구현 승인 후 개발 착수

---

## 17. 실제 페이지 UI/코드 수정 요구사항

> **⚠️ 관리자 승인 후 패치**

### 17-1) Frontend 수정 요구사항

#### A. 라벨링/필드 정리

| 대상 | 현재 | 변경 | 비고 |
| --- | --- | --- | --- |
| 테이블 헤더 | `External ID` | **`CC ID`** | 텍스트 치환 |
| 중복 헤더 | `External ID` 2개 | 1개 삭제 | 중복 제거 |
| 상태 컬럼 | `ACTIVE` 표시/선택 | **삭제** | 기본값 암묵 처리 |

#### B. 회원 목록 테이블 UX 개선

| 항목 | As-Is | To-Be |
| --- | --- | --- |
| 세로 스크롤 | `max-h-[70vh]` 고정 | 제거 → 브라우저 전체 스크롤 |
| 페이지네이션 | 10개 고정 | **50개 기본** + 20/50/100 선택 |
| Sticky Header | 미확인 | 유지 필수 |

#### C. 아이콘/액션 표준화 (Lucide React)

| 기능 | 아이콘 | 용도 |
| --- | --- | --- |
| 수정 (Edit) | `Edit3` | 수정 폼 진입 |
| 저장 (Save) | `Save` | 변경 사항 반영 |
| 미션 관리 | `ClipboardList` | 미션 목록/상태 |
| 인벤토리 | `Package` | 아이템/보관함 |
| 재화/티켓 | `Ticket` / `History` | 잔액 / 변동 로그 |
| 금고 관리 | `Vault` | 금고 상품/이자/출금 |
| 보안/로그 | `ShieldAlert` | 운영/감사 로그 |
| 완전 삭제 | `Bomb` | 복구 불가, 하드 삭제 |
| 삭제 | `Trash2` | 일반 삭제/휴지통 |

### 17-2) 전역 동기화(Global Sync) 고도화

#### A. 현행 문제점 진단

| 증상 | 확인 방법 |
| --- | --- |
| Stale Data | 모달 수정 후 닫기 → 리스트 갱신 안 됨 |
| Over-fetching | 작은 수정 → 전체 목록 리로드 (화면 깜빡임) |
| Race Condition | 연속 수정 → 이전 응답이 최신 덮어씀 |

#### B. 개선 전략

| 패턴 | 설명 |
| --- | --- |
| **Query Key Factory** | `userKeys.detail(id)`, `userKeys.lists(filters)` 중앙화 |
| **Smart Invalidation** | 파생 데이터까지 타겟팅 (`segmentKeys.distribution` 등) |
| **Optimistic Updates** | 서버 응답 전 UI 선 갱신 → 실패 시 롤백 |
| **Global State** | Zustand/Context로 클라이언트 상태 단방향 관리 |

### 17-3) Backend 점검 포인트

| ID | 항목 | 상태 | 조치 |
| --- | --- | --- | --- |
| BE-001 | `upsert_user_profile` commit 중복 | 🔴 발견 | 제거 필요 |
| BE-002 | CSV import double loop | 🔴 발견 | 단일 루프로 수정 |
| BE-003 | Identity sync 실패 로깅 | 🟠 미구현 | 로깅 추가 |

---

## 18. 최소 검증 시나리오 (운영자 관점)

### 18-1) 식별자 입력 케이스

| 입력 타입 | 예시 | 기대 동작 | 체크 |
| --- | --- | --- | --- |
| `user_id` | `12345` | 내부 PK 최우선 매칭 | ☐ |
| `telegram_id` | `56789` | TG 숫자 ID 매칭 | ☐ |
| `@telegram_username` | `@kim_user` | `@` 제거 후 username 매칭 | ☐ |
| `telegram_username` | `kim_user` | `@` 없이도 username 매칭 | ☐ |
| `nickname` | `철수` | 내부 닉네임 부분/전체 일치 | ☐ |
| `external_id` | `ABC123` | 일반 문자열 ID 매칭 | ☐ |
| `tg_{id}_*` 패턴 | `tg_123456_xxx` | 패턴에서 ID 추출 후 매칭 | ☐ |

### 18-2) 중복 충돌 (409) UX

| 시나리오 | 기대 동작 | 체크 |
| --- | --- | --- |
| `nickname` 중복 | 충돌 유저 정보/링크 제공 | ☐ |
| `username` 중복 | "둘 중 하나 선택" 가이드 | ☐ |
| 후속 액션 | 명확한 Next Action 안내 | ☐ |

### 18-3) 임포트 케이스

| 시나리오 | 기대 동작 | 체크 |
| --- | --- | --- |
| 기존 유저 매칭 성공 | 기존 데이터 보존, CSV 변경분만 업데이트 | ☐ |
| 미존재 유저 | 신규 생성 허용/차단 정책 확인 | ☐ |
| 필수 필드 채움 | ID, 기본값 정상 생성 | ☐ |

### 18-4) 오염 방지 및 안전장치

| 항목 | 구현 상태 | 권장 |
| --- | --- | --- |
| 잘못된 TG 입력 검증 | ⚠️ 미확인 | URL/오타 필터링 룰 추가 |
| 미리보기 (Preview) | ❌ 미구현 | Dry-run 모드 제공 |
| 변경 전/후 비교 (Diff) | ❌ 미구현 | 대량 변경 전 diff 표시 |
| 변경 로그 마킹 | ⚠️ 부분 | `source=CSV_IMPORT` 마킹 |

---

**업데이트**: 2026-01-11 23:16 KST  
**다음 단계**: Frontend/Backend 패치 승인 후 구현 착수
