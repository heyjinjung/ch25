# 어드민시스템 전수검사계획

(Admin System Comprehensive Audit Plan)

<!-- TOC -->
## 목차

- [목적](#purpose)
- [세부 감사 계획](#audit-plan)
  - [1단계: 사용자 및 CRM 핵심](#audit-step-1)
  - [2단계: 경제 및 게임 운영](#audit-step-2)
    - [2-0) 통합 경제 SoT(단일 기준) + 범위](#audit-step-2-sot)
    - [2-1) 페이지/엔드포인트/테이블 매핑](#audit-step-2-map)
    - [2-2) 재화별 SoT/테이블 분석](#audit-step-2-assets)
    - [2-3) 최소 검증 시나리오(운영+유저)](#audit-step-2-verify)
  - [3단계: 인게이지먼트 및 콘텐츠](#audit-step-3)
    - [3-0) 기준 및 범위](#audit-step-3-scope)
    - [3-1) 대상 파일 및 스키마 매핑](#audit-step-3-map)
    - [3-2) 주요 점검 항목](#audit-step-3-points)
    - [3-3) 하드코딩 방지 및 검증 가이드](#audit-step-3-SOT)
  - [4단계: 금고(Vault) 시스템](#audit-step-4)
    - [4-0) Vault SoT(단일 기준) + 범위](#audit-step-4-sot)
    - [4-1) 페이지/엔드포인트/테이블 매핑](#audit-step-4-map)
    - [4-2) 근본 가드레일(운영 사고 방지)](#audit-step-4-guards)
    - [4-3) 최소 검증 시나리오(운영+유저)](#audit-step-4-verify)
  - [5단계: 시스템 및 기타](#audit-step-5)
    - [5-0) System SoT(단일 기준) + 범위](#audit-step-5-sot)
    - [5-1) 페이지/엔드포인트/테이블 매핑](#audit-step-5-map)
    - [5-2) 근본 가드레일(운영 사고 방지)](#audit-step-5-guards)
    - [5-3) 최소 검증 시나리오(운영+유저)](#audit-step-5-verify)
  - [★ 핵심 검증: 전역 동기화 및 기능 정합성](#global-sync-verify)
- [부록: 감사 보고서 템플릿(초안)](#report-template)
- [개선 트랙: 어드민 UI/UX 구조 개선안](#improvement-track)
  - [1. 현황: 페이지/기능 인벤토리 (As-Is)](#improvement-as-is)
  - [2. 현재 문제점 파악 (Observed Issues)](#improvement-issues)
  - [3. 제안: 사이드바 메뉴 개선 (To-Be)](#improvement-sidebar)
  - [4. 제안: 대시보드 위젯 혁신 (To-Be)](#improvement-dashboard)
  - [5. 신규: 운영 로그 시스템 (NEW)](#improvement-ops-log)
  - [6. 개발 가이드라인 (Guidelines)](#improvement-guidelines)
  - [7. 실행 계획 (Execution Plan)](#improvement-execution)
  - [8. 검증 체크리스트](#improvement-verify)
<!-- /TOC -->

<a id="purpose"></a>

## 목적

어드민 패널 생태계 전체에 대한 "대규모 전수 검사(Large-Scale Total Inspection)"를 수행합니다.
모든 어드민 모듈을 매핑하고, 의존하는 스키마/모델, 작동 로직, 출력 결과를 파악하여
시스템의 무결성을 확보하고 문서화하는 것을 목표로 합니다.

<a id="audit-plan"></a>

## 세부 감사 계획 (Detailed Audit Plan)

각 영역별로 다음 항목을 중점적으로 "전수 검사"합니다.

<a id="audit-step-1"></a>

### 1단계: 사용자 및 CRM 핵심 (User & Core)

- **대상 파일**: `admin_users.py`, `admin_crm.py`, `admin_segments.py`
- **데이터베이스 모델 (Schema)**:
  - **`User`**: 핵심 사용자 정보 (로그인, 상태, 레벨).
  - **`AdminUserProfile`**: 어드민 전용 사용자 메타(실명, 태그, 메모).
  - **`UserSegment`, `SegmentRule`**: 세그먼트 매핑 및 분류 규칙.
  - **`AdminMessage`, `AdminMessageInbox`**: 메시지 발송 이력 및 수신함.
- **주요 점검 항목**:
  - 사용자 관리: 검색 필터(ID/닉네임), 강제 수정, 차단/해제, 삭제 Cascade.
  - CRM: CSV 대량 임포트(오류 처리), 활동 로그 조회 최적화, 메시지 타겟팅.
  - 세그먼트: 자동 분류 규칙 정확성, 수동 태그 할당 여부.
  - **[User Request - Deep Dive]**: `external_id`, `telegram_id`, `nickname` 간 데이터 불일치(Inconsistency) 집중 점검.
    - **Identity Frame Switch**: 기존 `external_id` 중심에서 `telegram_username` 중심으로 식별 체계 전환 가능성 진단.
    - CSV 임포트 시 `username` 기반 사용자 매핑/생성 로직 검증.
    - 텔레그램 아이디 변경 시 CRM 프로필 반영 여부.

#### 1-1) 식별자(Identity) 해석 규칙 / SoT 정리 (근거 기반)

- **목표**: 운영자가 어떤 값을 넣어도 “같은 유저를 같은 유저로” 찾을 수 있게 규칙을 명확히 하고, 불일치/중복 생성/오탐을 사전에 차단.
- **User/Core 측 필드(우선순위 있는 SoT 후보)**:
  - `User.id` (내부 PK)
  - `User.telegram_id` (정수 tg id)
  - `User.telegram_username` (문자열)
  - `User.external_id` (외부 식별자, `tg_{id}_{suffix}` 패턴 포함)
  - `User.nickname` (운영자가 임의 변경 가능)
- **CRM(AdminUserProfile) 측 필드(레거시/임포트 영향)**:
  - `AdminUserProfile.telegram_id` (문자열 저장, 숫자/username 혼재 가능)
  - `AdminUserProfile.external_id` (미러)
- **식별자 resolve 순서(서비스 로직 기준)**:
  - 숫자만 입력: `User.id` → `User.telegram_id` → `AdminUserProfile.telegram_id`(문자열 레거시)
  - `tg_{id}_*` 패턴: `User.telegram_id == {id}` 우선
  - 텍스트/@ 포함: `telegram_username`(대소문자 무시, @ 제거) → `nickname` → `external_id`
  - **다건 매칭**: 409 `AMBIGUOUS_IDENTIFIER` (운영 UX/가이드 필요)
  - **미발견**: 404 `USER_NOT_FOUND`

##### 운영자 UX 요구(우선순위 전환) — 관리자 승인 후 패치 후보

- **현장 사용 우선순위(운영자 기준)**: 내부 시스템 닉네임 → 텔레그램 유저네임 → 텔레그램 ID(숫자) → 실명 → 외부ID(CC ID) → (필요 시) 내부 User ID
- **현재 불편 포인트(핵심)**: 숫자 입력은 즉시 `User.id/telegram_id`로 해석되어, “외부ID(숫자/유사숫자)”나 “운영자가 주로 쓰는 키” 흐름과 충돌 가능
- **가입/운영 플로우의 구조적 복잡성**:
  - 가입 시 확보되는 정보는 주로 `telegram_id`, `telegram_username` 중심
  - 운영자가 가입 이후에 **추가 확인(닉네임/실명 입력)**을 하면서 “운영 핵심 키(닉네임/실명)”가 뒤늦게 채워져 식별/검색 체계가 혼재

##### To‑Be(권장) 검색 UX/규칙 — 관리자 승인 후 패치 후보

- **검색 입력의 우선 해석(제안)**: 텍스트(닉네임/실명/@username/외부ID) 우선 → 숫자(User ID/Telegram ID)는 **명시적 모드/프리픽스**로만 정확히 지정
- **프리픽스 기반 명시 옵션(제안)**:
  - `uid:123` (내부 User ID)
  - `tgid:123456789` (Telegram ID)
  - `@username` 또는 `tg:@username` (Telegram username)
  - `name:홍길동` (실명)
  - `cc:ABC123` 또는 `cc:12345` (CC ID/외부ID)
- **표시명(Display Name) 규칙(제안)**: 내부 닉네임(있으면) → 실명(있으면) → `@telegram_username` → TG ID → CC ID → (마지막) 내부 ID
- **운영 가드레일(제안)**:
  - 가입 직후 “미확인” 상태(실명/내부닉네임 미입력)를 리스트에서 강조하고, 클릭 1번으로 실명/닉네임 보강(수정 패널로 이동) 제공
  - 아이디/유저네임 변경 시, 어떤 필드가 업데이트/보존되는지 정책을 문서화(오염 방지)

##### Identity/CRM SoT(단일 기준) — 문서 기준(승인 후 패치 시 구현)

- **목표**: 운영자가 가장 많이 쓰는 키(내부 닉네임/실명/텔레그램 유저네임/외부ID)를 기준으로, “무엇이 진짜 값인지(SoT)”와 “어디에 써야 하는지”를 단일 규칙으로 고정.

| 개념 | SoT(Write 대상) | 표시/검색 우선순위(운영자) | 파생/동기화 규칙 | 비고 |
|---|---|---|---|---|
| 내부 시스템 닉네임 | `User.nickname` | 1순위 | 운영자가 직접 입력/수정하는 운영키로 취급(중복 시 409/후보선택 UX 필요) | 가입 시 미확보 → 사후 보강 |
| 텔레그램 유저네임 | `User.telegram_username` | 2순위 | 입력값은 항상 `@` 제거 + case-insensitive로 정규화; 변경 시 히스토리/정책 필요 | 가입 시 확보(주요) |
| 텔레그램 ID(숫자) | `User.telegram_id` | 3순위 | 검색은 `tgid:` 프리픽스로만 명시(자동 숫자해석 금지) | 가입 시 확보(주요) |
| 실명 | `AdminUserProfile.real_name` | 4순위 | CRM 정보로 저장, 검색/표시에서 nickname 다음 우선 | PII(권한/로그 주의) |
| CC ID(외부ID) | `User.external_id` | 5순위 | 화면 표기는 `External ID`가 아니라 **`CC ID`**로 통일(요구사항) | 숫자/유사숫자일 수 있음 |
| 내부 User ID(숫자) | `User.id` | 필요 시 | 검색은 `uid:` 프리픽스로만 명시(자동 숫자해석 금지) | PK |
| CRM 레거시 telegram_id | `AdminUserProfile.telegram_id` | 직접 검색키로 비권장 | 임포트 raw 보관용으로 한정(숫자/tg username 혼재 가능) | 레거시 정리 대상 |

##### 운영 플로우 SoT(가입→보강) — 문서 기준

- **가입 직후(초기 SoT)**: `telegram_id`, `telegram_username` 중심으로 유저가 생성/식별됨
- **운영 보강(운영 SoT 완성)**: 운영자가 확인 후 `User.nickname` / `AdminUserProfile.real_name`을 채워 “운영 검색/표시 SoT”를 완성
- **정책(핵심)**: 숫자 입력은 “편의”가 아니라 “오탐 리스크”로 간주하고, **명시적 프리픽스만 허용**하는 쪽을 기본안으로 둔다

#### 1-2) CSV/엑셀 임포트 시 “유저 생성/동기화” 범위 확장 점검

- **임포트의 핵심 리스크**: 단순 CRM 업데이트가 아니라, 조건에 따라 **User를 생성**하고 **telegram_username을 동기화**할 수 있음.
- **임포트 resolve 순서(서비스 로직 기준)**:
  - `user_id` → `external_id` → `telegram_username`
- **미존재 시 생성 로직(요주의)**:
  - `external_id`가 없고 `telegram_username`만 있으면 `external_id = tg_{telegram_username}_{timestamp}` 형태로 생성될 수 있음
  - 이 경우 향후 “tg_{id}_* 패턴 기반”과 섞이면서 식별 혼선이 커질 수 있음
- **동기화 동작(요주의)**:
  - `User.telegram_username`이 임포트 값으로 덮어써질 수 있음(운영자가 실수로 잘못된 username을 넣으면 식별체계가 오염)
  - `AdminUserProfile.telegram_id`에는 임포트 입력값(raw)이 문자열로 저장될 수 있음(숫자 tg id/username 혼재)

#### 1-3) 감사 체크리스트(확장)

- **불일치 유형 분류(필수)**:
  - 동일인인데 `User.telegram_id` / `User.external_id(tg_패턴)` / `AdminUserProfile.telegram_id`가 서로 다른 값
  - `telegram_username`이 변경되었는데, 기존 데이터가 어디까지 업데이트/보존되는지 불명확
  - `nickname`을 검색 키로 쓰는 경우 중복 nickname에 의해 409 또는 오탐 발생
- **운영 UX 관점 점검(필수)**:
  - 식별자 입력 UX: “무엇을 넣으면 무엇으로 찾는지” 가이드 문구 필요
  - 409(AMBIGUOUS) 발생 시: 후보 리스트를 보여줄지/추가 조건을 요구할지 정책 필요
  - 사용자 수정/차단/삭제/퍼지: 대상 유저의 식별자 히스토리(바뀐 값) 추적 필요성 검토
- **중복/비효율 쿼리 관점 점검(필수)**:
  - 목록/검색 화면에서 N+1, 불필요한 재조회, 중복 commit/refresh 등 “중복 처리” 유무 확인
  - 대량 리스트/필터링에서 인덱스(`external_id`, `telegram_id`) 활용 여부 점검
- **관측/로그(권장)**:
  - 식별 실패(404/409) 케이스는 운영자가 바로 원인을 알 수 있게 에러코드/입력종류(숫자/@/텍스트)/후속 액션을 노출
  - 식별 실패 로그는 원문 대신 fingerprint로 집계(개인정보/보안 고려)

#### 1-4) 실제 페이지 UI/코드 수정 요구사항(관리자 승인 후 패치)

- **Frontend(요구사항)**
  - 테이블 헤더 `External ID` 표기를 **`CC ID`로 텍스트 치환**
  - 중복으로 보이는 `External ID` 헤더 요소가 있다면 **해당 요소 삭제**
  - 회원관리 > 생성/수정 패널: 상태가 `ACTIVE`(액티브)로 표시/선택되는 UI 요소 삭제(기본값은 암묵적으로 ACTIVE 처리)
    - 삭제 대상 예: 상태 컬럼 헤더(정렬 아이콘 포함) / 생성 폼의 상태 select / 인라인 수정의 상태 select 또는 상태 뱃지
  - **회원 목록 테이블 UX 개선 (User Request)**
    - **세로 스크롤 제약 해제**: 현재 `max-h-[70vh]`로 고정된 내부 스크롤이 불편함. 이를 제거하여 브라우저 전체 스크롤을 활용하거나, 뷰포트에 맞게 꽉 차도록 레이아웃 개선 (Sticky Header 유지).
    - **페이지네이션 확장**: 현재 10개 고정은 확인이 어려움. 기본 노출을 50개 이상으로 늘리고, 배수 선택 옵션(예: 20/50/100개씩 보기)을 추가하여 대량 데이터 탐색 효율 증대.
  - **관리자메뉴 > 회원관리 > 회원관리 생성/수정/삭제 패널 아이콘 기능 확장 + 전역동기화**
    - 현재 제공 중인 “아이콘으로 기능 접근” UX를 유지하되, 아이콘 액션을 실제 운영 흐름에 맞게 확장(예: 프로필/세그먼트/메시지/지갑/활동로그 등으로 빠른 이동/실행)
    - 아이콘 액션 실행 후 **전역 동기화**: 회원 목록/상세/관련 패널(세그먼트, CRM 프로필, 메시지 수신함 등)의 데이터가 즉시 최신화되도록 캐시/상태 동기화 전략 정리
    - 동일 아이콘/액션이 여러 화면에 존재할 경우, 동작/권한/확인 모달/에러 처리 규칙을 공통화(전역 일관성 확보)
    - **현재 구현 상태(As-Is 근거)**
      - 아이콘은 회원 리스트 “액션” 컬럼의 버튼들로 제공되며, 주요 동작은 모달 오픈/로컬 상태 선택 기반
    - **아이콘 및 액션 표준화 (To-Be Standard)**
      - **목표**: 직관적이고 일관된 아이콘 시스템 도입 (Lucide React 기준 권장)
      - **수정 (Edit)**: `Edit3` (수정 폼 진입)
      - **저장 (Save)**: `Save` (변경 사항 반영)
      - **미션 관리 (Missions)**: `ClipboardList` (미션 목록/상태)
      - **인벤토리 (Inventory)**: `Package` (아이템/보관함)
      - **재화/티켓 (Assets)**: `Ticket` (티켓/포인트 잔액) / `History` (변동 로그)
      - **금고 관리 (Vault)**: `Vault` (금고 상품/이자/출금)
      - **보안/로그 (Security)**: `ShieldAlert` (운영/감사 로그)
      - **완전 삭제 (Purge)**: `Bomb` (복구 불가, 하드 삭제)
      - **삭제 (Trash)**: `Trash2` (일반 삭제/휴지통)
    - **전역 동기화(Global Sync) 고도화 가이드**
      - **1. 현행 문제점 진단 방법 (Diagnosis)**
        - **Stale Data(낡은 데이터) 확인**: 모달에서 데이터(예: 잔액, 상태) 수정 후 닫았을 때, 리스트나 다른 열려있는 패널(상세정보, 사이드바 등)이 즉시 갱신되지 않고 새로고침해야 하는지 테스트.
        - **Over-fetching(과도한 재요청) 확인**: 작은 수정 발생 시 `admin` 전체 쿼리나 관계없는 목록까지 무효화하여 불필요한 전체 리로드(화면 깜빡임)가 발생하는지 네트워크 탭 확인.
        - **Race Condition(경합) 확인**: 빠르게 연속 수정 시 이전 요청의 응답이 나중 요청의 결과를 덮어쓰거나, 리스트 순서가 튀는 현상 확인.
      - **2. 수준급 개선 방향 (High-Level Improvement Strategy)**
        - **Query Key Factory 패턴 도입**:
          - 키 관리를 하드코딩 문자열(`['admin', 'users']`)에서 팩토리 객체(`userKeys.detail(id)`, `userKeys.lists(filters)`)로 중앙화하여 관리.
          - 계층적 키 구조(`scope` -> `entity` -> `id`)를 통해 부분적/전체적 Invalidation을 정밀하게 제어.
        - **Smart Invalidation Flow**:
          - Mutation 성공(`onSuccess`) 시, 단순 리스트 갱신을 넘어 파생된 데이터(통계, 연관 세그먼트, 지갑 UI)까지 정확히 타겟팅하여 `invalidateQueries` 수행.
          - 예: 유저 등급 변경 시 -> `userKeys.list` + `userKeys.detail(id)` + `segmentKeys.distribution` 동시 갱신.
        - **Optimistic Updates (낙관적 업데이트)**:
          - 서버 응답을 기다리지 않고 UI를 먼저 갱신하여 "앱 같은 즉각적인 반응성" 제공 (실패 시 자동 롤백).
        - **Global State (Zustand/Context) 활용**:
          - 단순 서버 데이터 캐싱(React Query)을 넘어, "현재 선택된 유저", "활성화된 패널", "검색 필터" 등의 클라이언트 상태는 Global Store로 단방향 관리하여 컴포넌트 간 싱크 불일치 원천 차단.
- **Backend(후보/점검 포인트)**
  - CRM 프로필 upsert에서 commit/refresh 중복 수행 여부 점검 및 최소화
  - CRM 임포트 처리에서 동일 row를 2회 처리하는 구조가 있는지 점검(있다면 원인/영향 기록 후 승인 시 패치)

#### 1-5) 최소 검증 시나리오(운영자 관점)

- **식별자 입력 케이스별 기대결과 정의**
  - **입력 타입별 동작 확인 (Search/View)**:
    - `user_id(12345)`: 내부 숫자 ID로 정확히 최우선 매칭되는지.
    - `telegram_id(56789)`: 텔레그램 숫자 ID로 정확히 매칭되는지.
    - `@telegram_username`: `@`가 있을 때와 없을 때 모두 username 필드로 정규화되어 매칭되는지.
    - `nickname`: 내부 닉네임으로 검색 시 부분/전체 일치 여부 확인.
    - `external_id`: `tg_{id}_*` 패턴 및 일반 문자열 ID 매칭 확인.
    - `tg_{id}_*`: 전체 문자열 입력 시 해당 패턴을 가진 유저 매칭.
  - **중복 충돌(409 Conflict) 발생 시 UX**:
    - `nickname`/`username` 등 식별자가 겹치는 경우, 단순히 "에러"로 끝나지 않고 **"어떤 유저와 충돌했는지(링크/정보)"**를 제공하거나 **"둘 중 하나를 선택"**하는 가이드(Next Action)가 명확한지 확인.

- **임포트 케이스별 기대결과 정의**
  - **매칭 시나리오**:
    - **기존 유저 매칭 성공**: 식별자(ID/TgID/Username) 매칭 시, 기존 데이터는 보존되고 CSV의 변경사항(예: 등급, 메모)만 업데이트되는지 (Overwrite 정책 확인).
    - **미존재 유저 생성**: 매칭되는 유저가 없을 때, 정책적으로 **신규 생성을 허용하는지 차단하는지** 확인. 생성된다면 필수 필드(ID, 기본값)가 정상 채워지는지.
  - **오염 방지 및 안전장치**:
    - **잘못된 Telegram 입력 방지**: 오타나 잘못된 포맷(예: URL 전체 입력)으로 인해 `telegram_username` 필드가 오염되지 않도록 **검증 룰(Validation Rule)**이 동작하는지.
    - **Safe Guard**: 대량 변경 전 **미리보기(Preview)**나 **드라이런(Dry-run)** 기능, 또는 **변경 전/후 비교(Diff)**가 제공되는지 평가 필요.

<a id="audit-step-2"></a>

### 2단계: 경제 및 게임 운영 (Ops Economy)

- **대상 파일**: `admin_game_tokens.py`, `admin_team_battle.py`, `admin_dice/roulette/lottery.py`
- **데이터베이스 모델 (Schema)**:
  - **`GameWallet`, `UserGameWalletLedger`**: 유저 재화 잔액 및 변동 내역.
  - **`Team`, `TeamSeason`, `TeamScoreLog`**: 팀 배틀 구조 및 점수 로그.
  - **`DiceLog`, `RouletteLog`, `LotteryLog/Round`**: 게임별 플레이 기록 및 회차 정보.
- **주요 점검 항목**:
  - 토큰: 강제 지급/회수 로그 기록, 음수 잔액 방지.
  - 팀 배틀: 시즌 생성/종료 트리거, 일일 정산(Settlement) 및 보상 지급, 오토 밸런싱.
  - 게임 설정: 다이스/룰렛 확률 테이블, 로또 회차 관리 및 이월 로직.
  - **[User Request]**: 룰렛(골드/다이아) 구분 및 확률 가중치 수정 확인.

<a id="audit-step-2-sot"></a>

#### 2-0) 통합 경제 SoT(단일 기준) + 범위 선언 (근거 기반)

- **경제 SoT(정본, 운영/구현 기준)**:
  - `docs/06_ops/202601/[20261월첫째주] [2026001#] unified_economy_and_progression_ko.md`
  - (리팩토링 체크리스트) `docs/06_ops/202601/20260106_unified_economy_refactoring_checklist.md`
- **범위(이번 2단계 맵핑의 포함 범위)**:
  - 어드민 운영 화면/엔드포인트(지급/회수/설정/정산/통계)
  - **유저 플레이(일반 API)까지 포함**: 게임 status/play + 팀배틀 참여/리더보드
- **SoT 요약(핵심만, 링크 기반)**:
  - 금고(포인트/현금성): `user.vault_locked_balance` + 멱등 로그 `vault_earn_event`
    - (게임 플레이 이벤트성 적립/패널티) 기본값은 **+200 / -50**이며, Golden Hour 배수 적용(아래 감사/검증 포인트 참고)
    - 게임 XP/레벨(시즌패스): `season_pass_progress` + `season_pass_stamp_log`/`season_pass_reward_log` (POINT와 절대 혼동 금지)
  - 티켓/키: `user_game_wallet` + `user_game_wallet_ledger`
  - 다이아/기프티콘/바우처 등 인벤토리형 자산: `user_inventory_item` + `user_inventory_ledger`

<a id="audit-step-2-map"></a>

#### 2-1) 페이지/엔드포인트/테이블 매핑 (As-Is 근거)

> 목표: 운영자가 “어디서(화면) → 무엇을(API) → 어디에(DB)”가 반영되는지 즉시 추적 가능하게 단일 표로 고정.

| 도메인 | 어드민 화면(Front) | 어드민 API(Back) | 유저 API(Back) | 핵심 서비스/로직 | 주요 테이블(SoT) | 비고/리스크 |
|---|---|---|---|---|---|---|
| 토큰 지급/회수/조회 | `src/admin/pages/GameTokenGrantPage.tsx`, `src/admin/pages/GameTokenLogsPage.tsx` | `app/api/admin/routes/admin_game_tokens.py` (`/admin/api/game-tokens/*`) | (직접 유저 API는 없음. 게임 플레이가 소비/지급 트리거) | `GameWalletService`, (DIAMOND 예외) `InventoryService` | `user_game_wallet`, `user_game_wallet_ledger` / (DIAMOND) `user_inventory_*` | DIAMOND는 **Wallet이 아니라 Inventory SoT** (admin_game_tokens에 명시) |
| 주사위(설정) | `src/admin/pages/DiceConfigPage.tsx` | `app/api/admin/routes/admin_dice.py` (`/admin/api/dice-config/*`) | `app/api/routes/dice.py` (`/api/dice/status`, `/api/dice/play`) | `DiceService` (`app/services/dice_service.py`) | `dice_config`, `dice_log` + (소비) `user_game_wallet*` + (포인트) `vault_earn_event` | 이벤트 모드가 `vault_locked_balance`(스테이크) + **Golden Hour 배수(기본 2.0x)** 등과 결합됨(정책/권한/운영 설정 주의) |
| 룰렛(설정) | `src/admin/pages/RouletteConfigPage.tsx` | `app/api/admin/routes/admin_roulette.py` (`/admin/api/roulette-config/*`) | `app/api/routes/roulette.py` (`/api/roulette/status`, `/api/roulette/play`) | `RouletteService` (`app/services/roulette_service.py`) | `roulette_config`, `roulette_segment`, `roulette_log` + `user_game_wallet*` + `vault_earn_event` | `ticket_type`에 따라 ROULETTE_COIN/GOLD_KEY/DIAMOND_KEY/TRIAL_TOKEN 분기 |
| 복권(설정) | `src/admin/pages/LotteryConfigPage.tsx` | `app/api/admin/routes/admin_lottery.py` (`/admin/api/lottery-config/*`) | `app/api/routes/lottery.py` (`/api/lottery/status`, `/api/lottery/play`) | `LotteryService` (`app/services/lottery_service.py`) | `lottery_config`, `lottery_prize`, `lottery_log` + `user_game_wallet*` + `vault_earn_event` | 재고(stock) `NULL=무제한` 정책. 차감은 prize row 수정(락/동시성) |
| 팀배틀(운영) | `src/admin/pages/AdminTeamBattlePage.tsx` | `app/api/admin/routes/admin_team_battle.py` (`/admin/api/team-battle/*`) | `app/api/routes/team_battle.py` (`/api/team-battle/*`) | `TeamBattleService` | `team_season`, `team`, `team_member`, `team_score`, `team_event_log` | 정산(settle) / 오토밸런스(apply vs compute) / 강제이동(force-join) 위험 작업 |
| 경제 지표(운영) | `src/admin/pages/AdminEconomyStatsPage.tsx` | `app/api/admin/routes/admin_economy_stats.py` (`/admin/api/economy/stats`) | (없음) | (직접 서비스 없음: ledger/stat query) | `user_inventory_ledger`, `user_idempotency_key` | 운영 지표는 최소 유지(원장/멱등키 기반) |
| 인벤토리 CS(운영) | (UI 위치는 점검 필요: 모달/페이지/단축아이콘 등) | `app/api/admin/routes/admin_inventory.py` (`/admin/api/inventory/*`) | (유저 인벤토리 노출은 별도 페이지/엔드포인트) | `InventoryService`, `AuditService` | `user_inventory_item`, `user_inventory_ledger` | 바우처/기프티콘/DIAMOND 등 “인벤토리형 재화” 운영의 단일 조작 채널 |

<a id="audit-step-2-assets"></a>

#### 2-2) 재화별 SoT/테이블 분석 (운영 표준)

> 목표: 재화별로 “SoT(Write 대상) / 원장 / 조작 경로 / 리스크”를 단일 표로 고정해 드리프트를 차단.

| 재화/자산 | SoT(Write 대상) | 로그/원장(근거) | 대표 `reward_type` | 조작 경로(어드민/유저) | 리스크/감사 포인트 |
|---|---|---|---|---|---|
| 금고 포인트(현금성) | `user.vault_locked_balance` | `vault_earn_event` (`app/models/vault_earn_event.py`) | `POINT`, `CC_POINT` | 유저: Dice/Roulette/Lottery play + 미션/이벤트 claim(간접). 어드민: 금고 운영 라우트(4단계와 연동) | 게임 play 적립/패널티는 `VaultService.record_game_play_earn_event()` 기준. **[전역동기화-Phase 6 완료]** 보상 Gate(기본 200/-50)는 하드코딩이 아니라 `game_earn_config`(Admin Dice/Roulette 설정)를 실시간 참조하도록 개선됨. (예: 어드민에서 승리 보상 300으로 변경 시 Gate도 300으로 자동 변경 -> Golden Hour 2배 시 600 지급). Golden Hour 배수(기본 2.0x, 21:30~22:30 KST)는 이 "설정된 Gate" 금액에만 적용됨. `cash_balance` 신규 write 금지 |
| 게임 XP/레벨(시즌패스) | `season_pass_progress` | `season_pass_stamp_log`, `season_pass_reward_log` | `GAME_XP` | 유저: 게임/미션 결과 반영. 어드민: 설정 화면의 보상 타입 | POINT와 혼동 시 “레벨업/포인트” UX가 깨짐(표준 라벨/테스트 필요) |
| 티켓/키(월렛형) | `user_game_wallet` | `user_game_wallet_ledger` | `ROULETTE_COIN`, `DICE_TOKEN`, `LOTTERY_TICKET`, `GOLD_KEY`, `DIAMOND_KEY`, `TRIAL_TOKEN` | 어드민: 토큰 지급/회수(`admin_game_tokens`). 유저: 각 게임 play 시 `require_and_consume_token` 소비 | 음수/0 처리, 소비 실패 시 UX(티켓 0 패널) 및 재시도 시 멱등성(중복 소비) |
| DIAMOND(인벤토리형) | `user_inventory_item` (`item_type="DIAMOND"`) | `user_inventory_ledger` | `DIAMOND` | 어드민: 토큰지급 화면에서 DIAMOND 지급/회수는 Inventory로 라우팅(`admin_game_tokens`). 유저: TRIAL 룰렛 등 보상 | DIAMOND를 Wallet로 취급하면 SoT 붕괴(지갑/상점/교환 루프 깨짐) |
| 기프티콘/바우처(인벤토리형) | `user_inventory_item` (`item_type={BRAND}_GIFTICON_{금액}` 등) | `user_inventory_ledger` | `*_GIFTICON_*`, `VOUCHER_*` | 어드민: 인벤토리 CS(`admin_inventory`) + 설정(룰렛/복권/미션). 유저: 인벤토리/보상함 노출 | `stock=NULL`(무제한) / 재고 차감 동시성(락) / 지급대기 UX(운영 CS) |
| 상점 구매/바우처 사용(운영 지표) | (파생: 인벤토리 SoT 기반) | `user_inventory_ledger.reason` (SHOP_PURCHASE:*, USE_VOUCHER) | (아이템 타입 기반) | 어드민: `/admin/api/economy/stats`로 집계 확인 | reason 규격이 깨지면 지표가 무력화(운영 판단 불가) |
| 팀배틀 점수 | `team_score.points` | `team_event_log` | (action/meta) | 유저: join/auto-assign/leaderboard. 어드민: points/settle/auto-balance/force-join | 정산 중복 실행/보상 중복/시즌 active 전환 타이밍(운영 사고 포인트) |

<a id="audit-step-2-verify"></a>

#### 2-3) 최소 검증 시나리오(운영+유저)

- **설정→플레이→적립 검증(룰렛/주사위/복권 공통)**
  1) 어드민에서 `reward_type=POINT` / `reward_amount`를 명확히 설정
  2) 유저 API로 `/status` 확인 → `/play` 수행
  3) DB에서 `vault_earn_event` 생성 + `user.vault_locked_balance` 증감 확인(이중 적립/누락 없음)
  4) (이벤트성 기본 적립/패널티) 게임별 결과에 따라 **+200 / -50**가 기록되는지 확인 (설정/환경에 따라 amount가 달라질 수 있으므로 `payout_raw_json.amount_before_multiplier`도 함께 확인)

- **Golden Hour(주사위 포함) 검증**
  1) 유저 API `/api/vault/status`에서 `is_golden_hour_active`, `golden_hour_multiplier` 노출 확인
  2) Golden Hour 활성 시간대에 플레이 후 `vault_earn_event.payout_raw_json.vault_total_multiplier` 및 최종 amount가 배수 적용되는지 확인
  3) **게이트 확인**: amount_before_multiplier가 200/-50이 아닌 경우에는 Golden Hour 배수가 적용되지 않아야 함(드리프트/오지급 방지)
- **티켓 소비 검증**
  - play 전후 `user_game_wallet.balance` 감소 + `user_game_wallet_ledger` 적재 확인
- **인벤토리형 보상 검증(DIAMOND/기프티콘/바우처)**
  - 보상 발생 시 `user_inventory_item.quantity` 변화 + `user_inventory_ledger` 적재 확인
- **팀배틀 운영 시나리오**
  - 어드민: 시즌 생성/활성화 → 팀 생성 → 포인트 지급(`/teams/points`) → 리더보드 반영 확인
  - 유저: `/api/team-battle/teams/leaderboard` 및 `/teams/me`로 반영 확인
- **운영 지표(최소) 확인**
  - `/admin/api/economy/stats`에서 SHOP_PURCHASE / USE_VOUCHER / idempotency scope 집계가 정상 노출되는지 확인

<a id="audit-step-3"></a>

### 3단계: 인게이지먼트 및 콘텐츠 (Engagement)

<a id="audit-step-3-scope"></a>

#### 3-0) 기준 및 범위 (SoT & Scope)

- **참고 문서 (기준)**: `docs/06_ops/202601/[20261월첫째주]retention_turnaround_plan.md` ([RTP-3] 상세 실행 계획)

<a id="audit-step-3-map"></a>

#### 3-1) 대상 파일 및 스키마 매핑 (Files & Schema)

- **대상 파일**: `admin_seasons.py`, `admin_survey.py`, `admin_ranking.py`, `admin_inventory.py`(바우처/보상)
- **데이터베이스 모델 (Schema)**:
  - **`SeasonPassConfig`, `SeasonPassLevel`, `SeasonPassProgress`**: 시즌 패스 구조 및 유저 진행도.
  - **`Mission`, `UserMissionProgress`**: 미션(Daily/Weekly/Macro) 및 달성 현황.
  - **`Survey`, `SurveyResponse`**: 설문지 및 응답 데이터.
  - **`ExternalRanking`**, `UserActivity`(Win Streak): 랭킹 및 연승 데이터.
  - **`VaultProgram`, `VaultWithdrawalRequest`**: (RTP 연계) 금고 상품 및 출금.

<a id="audit-step-3-points"></a>

#### 3-2) 주요 점검 항목 (Audit Points)

- **1. 시즌 패스 (Season Pass) - 최고 우선순위**
  - **현행 정밀 진단(Code Level Analysis)**:
    - **구조(Structure)**: `SeasonPassPage.tsx`는 API(`useSeasonPassStatus`)를 통해 레벨을 순회하므로 **동적 구조는 이미 구현됨**. (이전의 "완전 하드코딩" 의심은 절반만 맞음)
    - **라벨링(Labeling)**: 보상 이름을 한글로 표기하는 `rewardTypeLabelMap` 객체가 **프론트엔드에 하드코딩**되어 있음. (예: `GOLD_KEY` -> "골드 키"). 새로운 보상 타입(예: `PLATINUM_KEY`) 추가 시 프론트 배포 필수.
    - **이미지(Assets)**: 현재 레벨별 노드 아이콘(`ICON_NODE_*`) 외에 **보상 물품 자체의 이미지(예: 키, 티켓 그림)를 렌더링하는 로직이 아예 없음**. 텍스트로만 노출 중.
  - **개선 요구사항 (To-Be)**:
    - **Start-to-End 동기화**: Admin에서 보상 타입을 추가/변경하면, 프론트에서도 별도 배포 없이 아이콘과 한글 이름이 즉시 반영되어야 함.
    - **이미지 렌더링 추가**: 텍스트("골드 키 1개") 대신, **Admin에서 설정한 아이콘 이미지**가 카드 내에 노출되도록 프론트엔드 개선.
  - **제안: 관리자 기능 확장 (Admin Features Proposal)**:
    1. **보상 타입 관리자(Reward Type Manager)**: 코드상 Enum으로만 존재하는 보상 타입들을 어드민에서 정의하고, **아이콘 URL**과 **한글 표기명**을 매핑하여 API로 내려주는 메타데이터 관리 페이지.
    2. **시즌 프리뷰(Preview Mode)**: 활성화 전, 유저 입장에서 어떻게 보일지 미리보기(가짜 데이터 주입 렌더링).
    3. **에셋 오버라이드**: 특정 레벨만 특별한 이미지(움짤 등)를 쓰도록 URL 직접 입력 필드 추가.
  - **제안: 프론트엔드 개선 (Frontend Proposal)**:
    1. **Server-Driven UI**: `reward_label`(텍스트)뿐만 아니라 `reward_icon_url`, `reward_color_theme` 등을 API 응답에 포함.
    2. **Fallback Strategy**: 정의되지 않은 보상 타입 수신 시, "물음표 상자" 또는 "기본 선물 아이콘"으로 방어 로직 구현. (현재는 텍스트가 깨지거나 null 출력 위험)

- **2. 미션 및 업적 (Mission & Achievements - RTP Phase 3, 4)**
  - **[User Request] 한글화(Localization)**: `AdminMissionPage.tsx` 등 미션 관리 화면의 **영어 라벨(Title, Logic Key, Action Type 등)을 전면 한글화**. (운영자 피로도 감소)
  - **Macro Mission 관리**: `MACRO` 카테고리(예: "누적 30회 플레이", "금고 1만원 달성") 생성 및 보상 설정 정상 동작 확인.
  - **업적(Badge) 관리**: *현재 전용 관리 페이지 부재 확인됨*. 미션 로직 키(`logic_key`)를 통한 배지 트리거 연결 상태 점검.
  - **일일 룰렛(Daily Spin)**:
    - **확률 제어**: 어드민 `RouletteConfig`에서 설정한 **세그먼트 가중치(Weight)**가 실제 게임 결과 확률에 반영되는지 시뮬레이션 검증.
    - **출석 보상**: 단순 출석 체크가 아닌, 룰렛 보상(Token/Key)으로 지급되는 흐름 확인.

- **3. 랭킹 및 경쟁 (Ranking & Competition - RTP Phase 6)**
  - **실시간 랭킹**: 외부 랭킹 연동(Excel/API) 및 실시간 집계(Win Streak, Profit) 로직의 정확성.
  - **[User Request] UI/UX 개선**: 랭킹 수동 산정/수정 시 관리자 친화적인 UI(엑셀 업로드, 드래그 앤 드롭 등) 도입 검토.

- **4. 설문(Survey) 및 소통**
  - 설문 생성/배포 및 응답 통계의 엑셀 다운로드 기능 정상 동작 확인.
  - 설문 참여 완료 시 보상(3,000P 등) 자동 지급 트리거 확인.

<a id="audit-step-3-SOT"></a>

#### 3-3) 하드코딩 방지 및 검증 가이드 (Hardcoding Prevention)

- **[User Request] 하드코딩 방지 및 검증 가이드**:
  - **SOT 위반 사례**: 어드민에서 보상을 '골드키'로 바꿨는데, 유저 웹에서는 여전히 '티켓'으로 하드코딩된 이미지가 나오는 경우.
  - **검증 시나리오**:
    1. 어드민: 시즌 패스 5레벨 보상을 `A`에서 `B`로 변경.
    2. 유저 웹: 새로고침 후 시즌 패스 5레벨 아이콘/텍스트가 `B`로 즉시 변경되는지 확인.
    3. 클라이언트 코드 리뷰: `SeasonPassPage.tsx` 내 보상 렌더링 로직이 하드코딩 배열(`const REWARDS = [...]`)이 아닌 API 응답(`data.rewards`)을 순회하는지 확인.

<a id="audit-step-4"></a>

### 4단계: 금고(Vault) 시스템 (Priority)

- **대상 파일**: `admin_vault_ops.py`, `admin_vault_programs.py`, `admin_vault2.py`
- **데이터베이스 모델 (Schema)**:
  - **`User` (Vault Fields)**: `vault_locked_balance`(정본), `vault_balance`(레거시 미러), `vault_locked_expires_at`, `vault_fill_used_at`, `total_charge_amount` 등.
  - **`VaultProgram`**: 금고 프로그램/운영 설정(JSON) 저장소(상품/문구/운영 토글 포함).
  - **`VaultWithdrawalRequest`**: 출금 요청/예약(PENDING) 및 처리 내역.
- **주요 점검 항목**:
  - 운영: 타이머 강제 제어, VIP 즉시 해금(Total Charge 100k+) 확인.
  - 프로그램: 상품 설정 JSON 및 UI 문구 핫픽스.
  - 전환: Tick 배치(Locked->Available) 처리 정확성.

#### 4-0) Vault SoT(단일 기준) + 범위 선언 (근거 기반, 최우선)

<a id="audit-step-4-sot"></a>

> **핵심**: 금고 “포인트(현금성)”의 **Write SoT는 오직 `user.vault_locked_balance`** 입니다. 이 규칙이 깨지면 운영/감사/정산이 전부 흔들립니다.

- **정본(Write SoT)**
  - `user.vault_locked_balance`: 모든 적립/차감/출금 차감의 기준 잔액(유저가 실제로 “가지고 있는” 금고 포인트)
  - `vault_earn_event`: 적립/차감의 멱등/감사 로그(게임 플레이 등 이벤트성 지급의 근거)
- **파생/레거시(읽기 호환)**
  - `user.vault_balance`: 레거시 미러(신규 로직에서 정본으로 사용 금지)
  - `cash_balance`: 신규 write 금지(마이그레이션/레거시 호환 목적 외 사용 금지)
- **출금/예약(Reserved) 규칙**
  - `reserved = sum(vault_withdrawal_request.amount where status == PENDING)`
  - `available = max(user.vault_locked_balance - reserved, 0)`
  - **중요**: 출금 요청 생성 시점에는 잔액을 깎지 않고(예약만 증가), 승인(APPROVE) 시점에 `vault_locked_balance`를 차감하는 흐름을 기본으로 한다.

#### 4-1) 페이지/엔드포인트/테이블 매핑 (운영 동선 기준)

<a id="audit-step-4-map"></a>

- **유저 화면(정합성 재조회 기준)**
  - `GET /api/vault/status`: 금고 상태(locked/available/reserved) + 이벤트성 배수(예: Golden Hour) 상태
  - `POST /api/vault/fill`: 무료 fill(초기 seed/추가 적립 포함)
  - `POST /api/vault/withdraw`: 출금 요청 생성(예약 증가)
  - `POST /api/vault/admin/process`: 출금 승인/거절(승인 시 SoT 차감)
  - `GET /api/vault/admin/requests`: 출금 요청 리스트(상태별)
  - `POST /api/vault/admin/adjust-amount`: 출금 요청 금액 조정(운영 보정)

- **어드민 운영(실제 조작 포인트)**
  - `GET /admin/api/vault/{user_id}` 또는 `/by-identifier/{identifier}`: 유저 금고 상태 조회(locked/available/reserved 포함)
  - `POST /admin/api/vault/{user_id}/timer`: 타이머 강제 액션(운영용)
  - `GET /admin/api/vault-programs/default`: 기본 VaultProgram 조회(운영 설정 SoT)
  - `PUT /admin/api/vault-programs/{program_key}/config`: 운영 설정 JSON 업데이트(배포 없이 정책 변경)
  - `PUT /admin/api/vault-programs/{program_key}/ui-copy`: UI 문구/카피 오버라이드(배포 없이 수정)
  - `POST /admin/api/vault-programs/balance-set/{user_id}`: 특정 유저 잔액 강제 세팅(운영/감사 권한 제한 필수)
  - `POST /admin/api/vault2/tick`: Vault2 전환 tick 실행(상태머신 스캐폴드/운영 트리거)

#### 4-2) 근본 가드레일(운영 사고 방지) — 최신 SoT 기준

<a id="audit-step-4-guards"></a>

- **SoT 위반 금지**
  - `vault_locked_balance` 외의 필드(`vault_balance`, `cash_balance`)로 신규 지급/차감 로직을 쓰지 않는다.
  - 게임/미션/이벤트 지급의 감사 근거는 `vault_earn_event`로 남기며, 멱등키 정책을 유지한다.

- **VIP/즉시 해금(총 충전 100k+) 정책의 표현 방식**
  - VIP는 “잔액 이전(locked→cash 등)”이 아니라 **eligible/withdraw 규칙 및 UI/상태 노출**로 표현한다.
  - 상태 조회 시점에 숨은 잔액 이동이 발생하지 않도록(자동 이관/자동 지급 금지) 운영 정책을 고정한다.

- **출금(Withdrawal) 처리 원칙**
  - 요청 생성 시점: 예약만 증가(PENDING), 잔액 차감은 하지 않는다.
  - 승인 시점: `vault_locked_balance`에서 차감(단일 SoT 차감) + 감사로그(누가/언제/왜) 필수.
  - 거절/취소 시점: 예약 해제(available 복원).
  - 운영 실수 방지: 금액 조정/승인/거절은 모두 사유(memo/reason) 강제 및 이력 보존.

- **전환(Tick) 배치의 현실 인지(스캐폴드 주의)**
  - `/admin/api/vault2/tick`은 Vault2 상태(`vault_status`) 전환(LOCKED→AVAILABLE→EXPIRED)을 대상으로 하며,
    게임/미션 적립의 정본은 여전히 `user.vault_locked_balance` 임을 문서/운영에서 혼동하지 않는다.

#### 4-3) 최소 검증 시나리오(운영+유저) — “근본부터” 확인

<a id="audit-step-4-verify"></a>

1) **SoT 정합성(가장 우선)**
   - 유저: `GET /api/vault/status`에서 표시되는 총액이 `user.vault_locked_balance` 기준으로 설명 가능해야 한다(예약 포함).
   - DB: `vault_balance`/`cash_balance`가 변해도 정본 판단 근거로 쓰지 않는다(레거시/미러로만 관측).

2) **예약/가능 잔액(Reserved/Available) 검증**
   - 유저가 `POST /api/vault/withdraw`로 출금 요청 → `PENDING` 생성
   - 즉시 `available = locked - reserved`가 감소하는지 확인(단, locked 자체는 요청 시점에 변하지 않아야 함)

3) **승인 시 단일 SoT 차감 검증**
   - 어드민이 `POST /api/vault/admin/process`로 APPROVE 처리
   - `user.vault_locked_balance`가 정확히 차감되고, `VaultWithdrawalRequest.status=APPROVED`로 전환되는지 확인

4) **운영 설정 반영(배포 없는 정책 변경) 검증**
   - `PUT /admin/api/vault-programs/{program_key}/ui-copy` 또는 `/config` 변경 후
   - 유저 `GET /api/vault/status`에서 관련 UI/상태 플래그(예: 배수/모달 오버라이드)가 즉시 반영되는지 확인

<a id="audit-step-5"></a>

### 5단계: 시스템 및 기타 (System)

- **대상 파일**: `admin_dashboard.py`, `admin_feature_schedule.py`, `admin_ui_config.py`
- **데이터베이스 모델 (Schema)**:
  - **`AppUiConfig`**: 앱 전역 설정 (점검 모드, 텍스트).
  - **`FeatureSchedule`**: 기능 오픈 스케줄 (Legacy 확인 필요).
  - **`AdminAuditLog`**: 어드민 활동 로그.
- **주요 점검 항목**:
  - 대시보드: 지표(DAU, 매출)의 실시간성 및 쿼리 효율.
  - 설정: UI 문구/URL 원격 제어.
  - **[User Request]**: `admin_feature_schedule.py` 기능의 현재 사용 여부 확인 및 폐기/대체 검토.

#### 5-0) System SoT(단일 기준) + 범위 선언 (근거 기반, 최우선)

<a id="audit-step-5-sot"></a>

> **핵심**: System은 “운영 변경이 배포 없이 반영되는가”와 “그 변경이 감사 가능하게 남는가”가 정본입니다.

- **정본(Write SoT)**
  - 전역 UI/운영 문구/토글: `app_ui_config` (`AppUiConfig.key` → `value_json`)
  - 일자별 기능 오픈: `feature_schedule` (`FeatureSchedule.date` 단일행 + `is_active`)
  - 변경 감사(누가/무엇을): `admin_audit_log` (`AdminAuditLog`)

- **System의 실사용 경로(범위)**
  - Admin에서 PUT/토글한 설정이 “유저 API 응답”과 “어드민 대시보드 지표”에 일관되게 반영되어야 함
  - FeatureSchedule은 기본적으로 게이트가 OFF일 수 있으나, `FEATURE_GATE_ENABLED=true`인 환경에서는 실제 접근 제어로 동작할 수 있음

#### 5-1) 페이지/엔드포인트/테이블 매핑 (운영 동선 기준)

<a id="audit-step-5-map"></a>

- **대시보드(운영 지표)**
  - `GET /admin/api/dashboard/metrics`: 기간별 지표 집계(캐시/쿼리 비용 주의)
  - `GET /admin/api/dashboard/streak`: 스트릭/게임플레이/금고 이벤트 관련 집계(시간대/JSON 추출 주의)
  - `GET /admin/api/dashboard/daily-overview`, `/events-status`, `/comprehensive`, `/details`: 운영 관제용(스캔 범위/응답 지연 주의)

- **UI 원격 설정(AppUiConfig)**
  - Admin: `GET /admin/api/ui-config/{key}`, `PUT /admin/api/ui-config/{key}`
  - User/Public: `GET /api/ui-config/{key}` (배포 없이 즉시 반영되는지 확인 기준)
  - Audit: UI 설정 변경 시 `admin_audit_log`에 `UPDATE_UI_CONFIG`가 기록되어야 함

- **기능 스케줄(FeatureSchedule)**
  - Admin: `GET /admin/api/feature-schedule?start_date=...&end_date=...`, `PUT /admin/api/feature-schedule/{day}`, `DELETE /admin/api/feature-schedule/{day}`
  - User/Public: `GET /api/today-feature` (오늘 오픈 기능 노출)
  - Service Gate: `FEATURE_GATE_ENABLED=true`일 때, 기능 접근이 오늘 스케줄과 일치해야 함(KST 날짜 기준)

#### 5-2) 근본 가드레일(운영 사고 방지)

<a id="audit-step-5-guards"></a>

- **감사로그(Audit) 없이는 운영 변경으로 취급하지 않는다**
  - UI 설정/운영 토글은 반드시 `admin_audit_log`에 남겨 “누가/언제/무엇을/어떻게”를 사후 추적 가능해야 함

- **시간대(KST) 드리프트 방지**
  - FeatureSchedule은 KST 달력일 기준으로 해석되므로, 서버 UTC 시간과 혼용되지 않게 검증(특히 자정 전후)
  - `/api/today-feature` 결과가 예상과 다르면 “스케줄 행 존재/단일행/활성화”부터 확인

- **데이터 무결성(FeatureSchedule은 date 단일행)**
  - 한 날짜에 스케줄이 2개 이상 존재하면 운영 설정 자체가 잘못된 상태로 간주(수정/정리 필요)

- **대시보드 성능/정확성 가드레일**
  - 집계는 범위가 커질수록 급격히 느려질 수 있어, 기본 범위/상한을 두고(시간 범위 clamp) 캐시 전략이 과도하게 stale을 만들지 않게 점검
  - JSON 기반 집계는 DB dialect 차이(MySQL vs SQLite)에 민감하므로, 환경별 결과 차이를 운영 문서에 기록

#### 5-3) 최소 검증 시나리오(운영+유저)

<a id="audit-step-5-verify"></a>

1) **UI 원격 설정(배포 없이 반영 + 감사로그)**
   - Admin: `PUT /admin/api/ui-config/{key}`로 값 변경
   - User/Public: `GET /api/ui-config/{key}` 재조회로 즉시 반영 확인
   - DB: `admin_audit_log`에 `action=UPDATE_UI_CONFIG`, `target_type=AppUiConfig`, `target_id={key}`가 기록되는지 확인

2) **FeatureSchedule(오늘 기능 노출 + 게이트 환경 대비)**
   - Admin: 오늘 날짜에 대해 `PUT /admin/api/feature-schedule/{day}`로 feature_type 및 is_active 설정
   - User/Public: `GET /api/today-feature` 재조회로 feature_type이 의도대로 노출되는지 확인
   - 운영 결론: 게이트가 활성화된 환경(`FEATURE_GATE_ENABLED=true`)에서는 잘못된 스케줄이 곧 기능 장애로 이어질 수 있음을 명시

3) **대시보드 지표(실시간성/쿼리 비용/일관성)**
   - Admin: `/admin/api/dashboard/metrics` 및 `/streak` 재조회 시 응답 시간/값이 과도하게 흔들리지 않는지 확인
   - 이상 시 1차 원인: 조회 범위(시간) / 캐시 만료 / 시간대(KST 버킷) / JSON 집계 여부(환경 차이)

<a id="global-sync-verify"></a>

### ★ 핵심 검증: 전역 동기화 및 기능 정합성 (Global Sync & Integrity)

> **목표**: 어드민 설정이 유저의 "모든" 화면(홈, 사이드바, 서랍, 모달)에 **지연 없이, 일관되게** 반영되는지 검증.

#### 1) 전역 상태 동기화 (Global State Sync)

- **대상**: `User` (재화), `Notification` (알림), `Inventory` (아이템)
- **검증 시나리오**:
  1. **User Wallet**: 어드민에서 특정 유저에게 `GOLD_KEY + 5` 지급.
  2. **Client Check**:
     - 상단 헤더(Header): 즉시 반영 확인.
     - 사이드바/서랍(Sidebar): 즉시 반영 확인.
     - **[Critical]**: 게임 플레이 중인 상태(예: 룰렛 모달)에서도 재화 수량이 실시간 갱신되는지 확인. (React Query `invalidateQueries` 범위 점검)
  3. **Concurrency**: 멀티 탭(Tab A, Tab B)에서 동시 접속 시, Tab A의 소비가 Tab B에 즉시 반영되는지.

#### 2) 확률 및 로직 설정 검증 (Config Integrity)

- **대상**: 룰렛/주사위/복권 확률 테이블
- **검증 시나리오**:
  1. 어드민에서 룰렛 1등 당첨 가중치를 `0`으로 설정.
  2. 클라이언트에서 100회 시뮬레이션(또는 Play API 호출) 시 **절대로** 1등이 나오지 않아야 함.
  3. UI 표기: 클라이언트 룰렛판의 "희귀도/확률" 텍스트도 변경된 가중치에 맞춰 갱신되는지 확인.

#### 3) 하드코딩 완전 박멸 (No More Hardcoding)

- **대상**: 시즌패스 보상, 미션 아이콘, 상점 배너
- **검증**: 어드민에서 이미지 URL/텍스트 변경 시, **배포 없이** 새로고침만으로 변경 사항 적용 여부.

#### 4) Ops Economy 전역동기화 (Backend 자동 검증 기준)

> **목표**: “어드민 설정/게임 플레이 결과/유저 상태 재조회/운영 지표 집계”가 **단일 SoT**로 일관되게 맞물리는지 자동으로 회귀 방지.

- **검증 범위(SoT 고정)**
  - Vault(현금성 포인트) SoT: `user.vault_locked_balance` + `vault_earn_event` (멱등키: `GAME:{GAME_TYPE}:{log_id}`)
  - XP/레벨 SoT(별도): `season_pass_progress` + `season_pass_stamp_log`/`season_pass_reward_log` (**Vault 포인트와 혼용 금지**)
  - Wallet SoT(게임 토큰): `user_game_wallet` + `user_game_wallet_ledger`
  - Inventory SoT(다이아 등): `user_inventory_item` + `user_inventory_ledger`

- **결정론적(Deterministic) 시나리오 원칙**
  - 시간 의존(골든아워)은 “현재 시각”에 기대지 말고, 운영 설정의 `manual_override=FORCE_ON/OFF`로 강제하여 테스트/검증을 안정화.
  - 확률 의존(주사위/룰렛)은 이벤트 설정에서 확률을 1.0/0.0으로 고정하여 재현성을 확보.

- **핵심 검증 시나리오(권장: 통합 테스트 1개로 고정)**
  1. (준비) VaultProgram 설정에서 Golden Hour를 활성화하고 `manual_override=FORCE_ON`, `multiplier=2.0`로 강제
  2. (유저) `/api/vault/status` 재조회: `is_golden_hour_active=true`, `golden_hour_multiplier=2.0` 확인
  3. (유저) `/api/dice/play` 3회(또는 이벤트 모드 고정)로 아래 3가지 케이스를 각각 1회씩 발생시켜 검증
     - **기본 지급(+200 or Config Value)**: 골든아워 게이트 대상 (어드민 설정값 300 등 동적 반영 확인) → VaultEarnEvent.amount가 **2.0x**인지
     - **기본 차감(-50)**: 골든아워 게이트 대상 → VaultEarnEvent.amount가 **-100**(2.0x)인지
     - **비게이트 보상(예: +7777)**: 게이트 제외 대상 → VaultEarnEvent.amount가 **+7777 그대로**인지
  4. (DB SoT) 각 플레이마다 아래가 동시에 성립
     - `user.vault_locked_balance`가 VaultEarnEvent.amount 합계만큼 정확히 반영
     - VaultEarnEvent의 `payout_raw_json.amount_before_multiplier`가 원본(200/-50/7777)을 보존
     - VaultEarnEvent의 `payout_raw_json.vault_total_multiplier`가 게이트 대상에서만 1.0 초과로 기록
  5. (XP 분리) 같은 시나리오에서 `season_pass_progress.current_xp/current_level` 및 `season_pass_stamp_log`가 변하지 않음을 확인(POINT ↔ XP 혼용 회귀 방지)
  6. (운영 집계) `/admin/api/dashboard/streak?days=2` 재조회 시, base play(원본 +200) 집계가 1 이상으로 반영(운영 지표 ↔ 원장 필드 드리프트 탐지)

<a id="execution-strategy"></a>

## 실행 방법론 (Execution Strategy)

각 모듈에 대해 다음 3-Step 프로세스를 반복합니다:

1. **Code Review**: 엔드포인트 코드 레벨에서 숨겨진 로직(Hidden Logic)이나 파라미터 확인.
2. **Live Test**: 검증 스크립트(`verify_admin_full.py`)에 해당 모듈 테스트 케이스 추가 및 실행.
3. **UI Verification**: 프론트엔드 어드민 페이지에서 동일 기능 수행 후 DB 반영 확인.

<a id="execution-schedule"></a>

## 실행 일정

1. **준비**: 감사 보고서 템플릿 작성
2. **1단계 (Core & Vault)**: 사용자 및 금고 모듈 감사
3. **2단계 (Economy)**: 게임 토큰 및 팀 배틀 감사
4. **3단계 (Engagement)**: 시즌 패스 및 설문 감사
5. **4단계 (System)**: 대시보드 및 설정 감사
6. **보고**: 최종 `admin_audit_report.md` 작성

---

<a id="report-template"></a>

## 부록: 감사 보고서 템플릿(초안)

### 1. TL;DR (3~5줄)

- (핵심 문제 1)
- (핵심 방향 1)
- (이번 스프린트/주간 산출물 1~2개)

### 2. 배경 / 목표

- 현재 어드민이 해결해야 하는 운영 문제:

<a id="improvement-track"></a>

## 개선 트랙: 어드민 UI/UX 구조 개선안 (Improvement Track)

> **목표**: RTP(Retention Turnaround Plan) 실행을 위한 **"Engagement 중심" 메뉴 재편** 및 **"신규 제안 기능"의 접근성 확보**.

<a id="improvement-sidebar"></a>

### 1. 사이드바 메뉴 (Sidebar Hierarchy)

#### 1-1) 현행 구조 (As-Is Status)

`src/admin/components/AdminLayout.tsx`의 현재 `navSections` 구성:

| 그룹 | 메뉴명 | 경로 | 비고 |
|---|---|---|---|
| **대시보드** | 대시보드 | `/admin` | |
| **게임 관리** | 시즌 설정 | `/admin/seasons` | |
| | 미션 관리 | `/admin/missions` | **[개선필요]** 영문 라벨 혼재 |
| | 스트릭 보상 운영 | `/admin/streak-rewards` | |
| | 룰렛/주사위/복권 설정 | `/admin/roulette` 등 | |
| | 금고 관리 | `/admin/vault` | |
| | 상점 관리 | `/admin/shop` | |
| **회원 관리** | 마케팅 센터 | `/admin/marketing` | |
| | 회원 관리 | `/admin/users` | |
| | 메시지 발송 | `/admin/messages` | |
| | 팀 배틀 관리 | `/admin/team-battle` | |
| **티켓 관리** | 티켓 통합 관리 | `/admin/game-tokens` | |
| **데이터 관리** | 랭킹 입력 | `/admin/external-ranking` | |
| | 경제 지표 | `/admin/economy` | |
| | 사용자 분류 | `/admin/user-segments` | |
| | 설문조사 | `/admin/surveys` | |
| | UI 문구/CTA | `/admin/ui-config` | |

#### 1-2) 개선 제안 (To-Be Proposal)

`src/admin/components/AdminLayout.tsx`의 `navSections` 수정 제안 (재편성):

> **변경 핵심 전략**: "자산 정의(Rewards)"와 "게임 운영(Engagement)"을 분리, "시스템 검증(Audit)"을 격상. **[PLUS] 어드민 프론트 전역 한글화 패치(Global Localization)**.

| New Group | 메뉴명 (To-Be) | 경로 | 변경 사항 & 의도 |
|---|---|---|---|
| **대시보드** | 대시보드 | `/admin` | 시즌 현황판, Sync 신호등 위젯 추가 |
| **자산 및 보상** (신설) | **[NEW] 보상 타입 관리** | `/admin/reward-types` | **[한글화/ICON]** 하드코딩 제거를 위한 메타데이터 관리 |
| | **[NEW] 에셋 관리** | `/admin/assets` | 보상 이미지 업로드 및 URL 관리 중앙화 |
| | 상점 관리 | `/admin/shop` | (기존 "게임 관리"에서 이동) 상품/재화 관리로 통합 |
| **인게이지먼트** | 시즌 패스 | `/admin/seasons` | **[Preview]** 프리뷰 버튼, 레벨별 보상 렌더링 검증 |
| | 미션 및 업적 | `/admin/missions` | **[전역 한글화]** 영문 라벨(ActionType 등) 전면 한글화 |
| | 룰렛/주사위/복권 | `/admin/contents` (Group) | (기존) 룰렛, 주사위, 복권을 서브 메뉴로 그룹핑 권장 |
| | 스트릭/랭킹 | `/admin/competition` (Group) | 스트릭 보상, 랭킹 입력을 경쟁 요소로 통합 |
| | 설문조사 | `/admin/surveys` | (기존 "데이터 관리"에서 이동) 유저 소통/참여 메뉴로 편입 |
| **회원 및 CRM** | 회원 관리 | `/admin/users` | **[한글화]** 상태/유형 필드 한글 표기 적용 |
| | 마케팅/메시지 | `/admin/marketing` | 마케팅 센터 + 메시지 발송 통합 |
| | 팀 배틀 | `/admin/team-battle` | |
| | 사용자 분류(세그먼트) | `/admin/user-segments` | (기존 "데이터 관리"에서 이동) CRM 활동의 기초 데이터 |
| **시스템 및 검증** | **[NEW] 전역 동기화** | `/admin/sync-status` | Redis/DB/Client 버전 불일치 모니터링 |
| | 티켓/경제 지표 | `/admin/economy` | 티켓 관리 + 경제 지표 통합 |
| | UI 설정/CTA | `/admin/ui-config` | **[전역 한글화]** UI 문구 관리 화면 한글화 |
| | 감사 로그 | `/admin/audit-logs` | (신설/격상) 운영 기록 추적 |

#### 1-3) 구조 유기성 검증 (Structure Verification)

> **시나리오**: "새로운 보상(예: `PLATINUM_KEY`)을 만들어 시즌 패스에 적용하고 유저에게 노출하기"

1. **자산 정의 (Foundation)**:
    - `자산 및 보상 > 보상 타입 관리`에서 `PLATINUM_KEY`를 등록하고, "플래티넘 키"라는 **한글명**과 **아이콘 이미지**를 업로드합니다.
    - (이전에는 이 단계가 없어 개발자가 코드를 수정하고 배포해야 했음)
2. **상품 구성 (Packaging)**:
    - `인게이지먼트 > 시즌 패스` 설정 화면으로 이동합니다.
    - 레벨 10 보상을 선택할 때, 방금 등록한 "플래티넘 키"가 드롭다운에 **한글과 아이콘**으로 표시됩니다. (운영 실수 방지)
    - **프리뷰 버튼**을 눌러, 실제 스마트폰 화면에서 아이콘이 깨지지 않는지 미리 확인합니다.
3. **검증 및 배포 (Audit & Deploy)**:
    - 설정 저장 후, `시스템 및 검증 > 전역 동기화` 메뉴로 이동합니다.
    - "Config Version"이 갱신되었는지, Redis 캐시가 무효화되어 클라이언트가 새 Asset 정보를 받아가는지 신호등(Traffic Light)으로 확인합니다.
4. **결론 (Conclusion)**:
    - **[유기적 연결 성공]**: `자산 정의(Step 1) → 인게이지먼트 활용(Step 2) → 시스템 검증(Step 3)`의 흐름이 끊김 없이 이어지며, 개발자 개입 없이 운영자가 주도적으로 자산을 라이브할 수 있는 구조입니다.

<a id="improvement-dashboard"></a>

### 2. 대시보드 위젯 혁신 (Dashboard 2.0: Command Center)

단순한 데이터 나열을 넘어, 운영자가 **"현재 우리 서비스가 살아서 숨쉬고 있는지"**를 직관적으로 느끼고 즉각 반응할 수 있는 **지휘 통제실(Command Center)**로 격상시킵니다.

#### 2-1) 레이아웃 철학: "Grid System for Situational Awareness"

> 4단 그리드 시스템을 도입하여 정보의 위계를 *긴급도*와 *빈도*에 따라 재배치합니다.

| 구획 | 역할 (Role) | 핵심 컴포넌트 | 갱신 주기 |
|---|---|---|---|
| **Header (Hero)** | **상황판단 (Status)** | 시즌 상태, 서버/Sync 헬스, 긴급 제어(Kill Switch) | 실시간 (Socket/Polling 5s) |
| **Left Column** | **실시간 감지 (Pulse)** | [NEW] Live Operations Feed (입금/출금/1등당첨) | 실시간 (Stream) |
| **Center/Right** | **핵심 지표 (Metrics)** | Daily Ops Summary (접속/매출/리텐션/금고) | 1분 (Refetch) |
| **Bottom** | **빠른 대응 (Actions)** | Smart Quick Links, 개인화된 바로가기 | 정적 (Static) |

#### 2-2) [Hero] 시즌 작전 상황판 (Season Ops Board)

> **목표**: "지금 시즌, 문제 없나요?"라는 질문에 1초 만에 답할 수 있는 시각적 확신 제공.

- **비주얼 스펙**:
  - **D-Day Countdown**: 단순 텍스트가 아닌, 남은 시간을 시각화한 원형 게이지(Progress Circle). 임박 시(D-1) 붉은색 맥박 애니메이션(Pulse) 적용.
  - **Live Live Participation Graph**: 최근 1시간 동안의 동시 접속자/참여 추이를 보여주는 스파크라인(Sparkline) 차트. "지금 꺾였는지"를 타점.
- **컨트롤 패널 (Emergency Controls)**:
  - **`🚨 긴급 공지(Emergency Announce)`**: 클릭 시 프리셋(점검 중, 지연 안내 등) 선택 모달 → 즉시 전면 팝업 배포.
  - **`🛑 지급 락다운(Kill Switch)`**: "이상 징후 발견 시 보상 지급만 일시 정지"하는 기능. 유저 플레이는 허용하되 `PENDING` 처리하여 사고 확산 방지.

#### 2-3) [Left] 라이브 오퍼레이션 피드 (Live Ops Feed)

> **[신규 제안]**: 차가운 숫자 데이터 옆에, 실제 유저들의 "살아있는 움직임"을 로그 형태로 흐르게 합니다.

- **스트림 내용**:
  - `[입금]` User A님이 50,000원을 입금했습니다. (High Value 강조)
  - `[당첨]` User B님이 룰렛 1등(골드키)에 당첨되었습니다! (축하 효과)
  - `[출금]` User C님이 10,000원 출금을 요청했습니다. (승인 바로가기 버튼 제공)
  - `[위험]` User D님이 1분 내 티켓 100장을 소모했습니다. (매크로 의심 마킹)
- **기대 효과**: 운영자가 수동으로 새로고침하지 않아도 "뭔가 일어나고 있음"을 감지. 이상 패턴(도배 등)을 직관적으로 포착.

#### 2-4) [Center] 경제/리텐션 왓치타워 (Watchtower)

> 기존 `DailyOpsSummary`를 확장하여, 단순 카운트가 아닌 "건전성"을 보여줍니다.

- **경제 건전성 (Economy Health)**:
  - **인플레이션 모니터**: `금일 발행된 포인트` vs `소모된 포인트`의 비율을 Bar Gauge로 표시. 발행이 소모의 2배를 넘으면 🔴 경고 등
  - **금고 뱅크런 감지**: 출금 예약 급증 시 알림 뱃지 노출.
- **리텐션 레이더 (Churn Radar)**:
  - **"이탈 위험군" 심화**: `어제 접속 O / 오늘 접속 X` 유저 수를 클릭하면 -> 해당 유저 리스트 모달 -> **"푸시 발송(미끼 투척)"** 액션까지 원스톱 연결.
  - **웰컴 안착률**: D-Day 가입자가 D+1, D+2에 얼마나 남았는지 코호트 미니 히트맵 표시.

#### 2-5) [Header] 전역 동기화 신호등 (Sync Traffic Light)

> 시스템 신뢰도의 척도. "반영 됐나요?" 질문 삭제.

- **구성**:
  - **Config Sync**: `DB(v10)` ↔ `Redis(v10)` ↔ `Client(v10)`. 불일치 시 `Purge Cache` 버튼 활성화.
  - **Time Sync**: 서버 시간(UTC)과 운영 기준 시간(KST)의 차이를 보여주며, 현재 "골든 아워" 적용 여부를 ON/OFF 램프로 표시.

#### 2-6) 스마트 액션 & 개인화 (Smart Actions)

- **Context-Aware Recommendations**:
  - "오늘 출금 요청이 5건 대기 중입니다." -> `[출금 승인하러 가기]` 버튼 노출.
  - "시즌 종료 24시간 전입니다." -> `[다음 시즌 예약 확인]` 버튼 노출.
- **My Shortcuts**:
  - 운영자가 자주 쓰는 메뉴(예: "김철수 유저 조회", "아이템 지급")를 핀(Pin) 고정.

#### 2-7) 구현 로드맵 (확장)

- **Step 1 (Visual Upgrade)**: 레이아웃을 4단 그리드로 변경하고, 기존 위젯 재배치. Season Ops Board 디자인 고도화.
- **Step 2 (Simulated Live)**: `DailyOpsSummary` 데이터를 10초 단위 폴링으로 변경하여 "준 실시간" 느낌 구현.
- **Step 3 (Real Live)**: WebSocket 또는 SSE 도입하여 Live Ops Feed 구축. (Backend 지원 필요)
- **Step 4 (Automation)**: 이탈 위험군 "원클릭 푸시" 등 액션 연동.

<a id="improvement-as-is"></a>

### 3. 현황: 페이지/기능 인벤토리 (As-Is)

- 페이지 목록(현행): (경로/역할/주요 액션/백엔드 의존/문제점 요약)
  - 예: src/admin/pages/* 기준으로 표 작성
- 공통 레이아웃/컴포넌트 현황:
- 권한/로그/감사(Audit) 현황:

<a id="improvement-issues"></a>

### 4. 현재 문제점 파악 (Observed Issues)

> **근거**: `src/admin/pages/*` 26개 파일 정적 분석 및 이전 세션에서 확인된 코드 레벨 진단 결과 (2026-01-11)

| ID | 증상 | 영향 (운영/유저/매출) | 재현 절차 | 추정 원인 | 우선순위 | 상태 |
|---|---|---|---|---|---|---|
| **OI-001** | SeasonPassPage 보상 라벨 하드코딩 | 신규 보상 타입 추가 시 프론트 재배포 필수 | 시즌 설정에서 새 보상 타입 지정 → 유저 웹에서 "undefined" 표시 | `rewardTypeLabelMap` 객체가 TSX에 직접 정의됨 | 🔴 Critical | Open |
| **OI-002** | AdminMissionPage 영문 라벨 혼재 | 운영자 혼란, 학습 곡선 증가 | 미션 관리 진입 → "Action Type" 드롭다운 확인 | i18n 미적용, 개발 편의로 영어 그대로 둔 상태 | 🟠 High | Open |
| **OI-003** | UserAdminPage 1154줄, 단일 책임 위반 | 유지보수 어려움, 버그 발생 시 추적 지연 | 코드 열어서 확인 | 인라인 편집/모달/폼/뮤테이션 전량 한 파일에 존재 | 🟠 High | Open |
| **OI-004** | GameTokenGrantPage tokenOptions 하드코딩 | 신규 토큰 추가 시 코드 수정 필요 | 토큰 지급 페이지 진입 → 드롭다운 확인 | `z.enum()` 및 `const tokenOptions` 배열이 코드 내 정적 정의 | 🟠 High | Open |
| **OI-005** | VaultAdminPage 크리티컬 액션에 확인 모달 없음 | 금고 잔액 강제 리셋/즉시 만료 등 오클릭 사고 위험 | "Reset", "Expire Now" 버튼 클릭 즉시 실행 | `window.confirm()` 또는 모달 누락 | 🔴 Critical | Open |
| **OI-006** | SeasonListPage 프리뷰 기능 부재 | 시즌 활성화 전 유저 화면 검증 불가, 라이브 후 오류 발견 | 시즌 저장 후 유저 웹 직접 확인 필요 | 프리뷰 렌더링 로직 미구현 | 🟠 High | Open |
| **OI-007** | 대시보드 위젯 부족 | 시즌 D-Day, Sync 상태 등 미확인, 별도 페이지 이동 필요 | AdminDashboard 진입 → Quick Links만 존재 | `AdminDashboardPage.tsx`가 단순 링크 모음 | 🟡 Medium | Open |
| **OI-008** | RouletteConfigPage 확률 합계 100% 검증 없음 | 잘못된 확률 설정 시 보상 분배 오류 | 세그먼트 Weight 합계가 100이 아닌 상태로 저장 | 프론트엔드 유효성 검사 부재 | 🟠 High | Open |
| **OI-009** | ExternalRankingPage 엑셀 업로드만, UI 편집 불가 | 소규모 수정에도 엑셀 재업로드 필요 | 순위 1개 수정 위해 엑셀 다운로드 → 수정 → 업로드 | 인라인 편집 기능 미구현 | 🟡 Medium | Open |
| **OI-010** | FeatureSchedulePage 레거시 미사용 의심 | 혼란 유발, 사이드바 공간 낭비 | `/admin/feature-schedule` 진입 → 기능 동작 여부 불명확 | 감사 계획에서도 사용 여부 확인 필요로 표기됨 | 🟡 Medium | Open |
| **OI-011** | UserAdminPage 전체 유저 로딩 (확장성) | 유저 1만 명 시 브라우저 크래시 및 어드민 마비 | 회원 관리 진입 → 네트워크 탭 확인 | 클라이언트 사이드 필터링 및 전체 조회 API 사용 | 🔴 Critical | Open |
| **OI-012** | AdminTeamBattlePage 치명적 액션 무방비 | 오클릭 한 번으로 시즌 조기 종료 또는 영구 소실 | 팀 배틀 관리 → 정산/삭제 버튼 클릭 | 확인 모달(Unique Confirmation) 미구현 | 🔴 Critical | Open |
| **OI-013** | Frontend 하드코딩 필터 (운영 유연성) | 상품 체계 변경 시 어드민 기능 마비 | 상점 관리/팀 배틀 진입 → 코드 확인 | SKU 접두사(PROD_) 필터링 및 에러 메시지 하드코딩 | 🟡 Major | Open |
| **OI-014** | 상점 관리 이미지 미지원 (Blind Ops) | 엉뚱한 상품 판매로 인한 유저 클레임 폭증 | 상점 관리 진입 → 상품 이미지 확인 불가 | 이미지 URL 필드 및 미리보기 UI 부재 | 🟡 Major | Open |
| **OI-015** | 상점 설정 Race Condition (덮어쓰기) | 동시 수정 시 타 운영자 작업 무음 증발 | 운영자 A, B 동시 진입 → 저장 | 변경분(Patch)이 아닌 전체 덮어쓰기(Put All) 로직 | 🟡 Major | Open |

---

#### 운영 병목 Top 3

1. **하드코딩 의존**: 보상 타입/토큰 Enum이 코드에 박혀 있어, 운영 변경 시 개발자 개입 필수 (OI-001, OI-004).
2. **프리뷰 부재**: 시즌 패스 등 설정 변경 후 유저 화면 사전 검증 불가, 라이브 후 발견 (OI-006).
3. **대시보드 인사이트 미약**: 시즌 D-Day, 동기화 상태 등 핵심 운영 지표가 한눈에 안 보임 (OI-007).

#### 데이터 신뢰성 이슈

- RouletteConfigPage: 확률 합계 검증 로직 부재 (OI-008).
- VaultAdminPage: 크리티컬 액션(잔액 리셋) 시 Audit Log 기록 여부 재확인 필요.

#### UX/가독성/실수 유발 패턴

- 크리티컬 버튼(Reset, Purge)에 확인 모달/Dry-Run 미적용 (OI-005).
- 영문/한글 라벨 혼재로 운영자 인지 부담 증가 (OI-002).

### 5. 목표 UX/UI 리디자인 (To-Be)

- IA/네비게이션(사이드바 구조, 용어, 그룹핑):
- 레이아웃 규칙(대시보드/테이블/폼/모달):
- 디자인 토큰(색/타이포/간격/상태):
  - Loading / Empty / Error / Permission Denied
- 접근성/가이드:
  - 키보드 포커스, 대비, 테이블 가독성

### 6. 기능개선 및 정리 (리팩토링/정리 포함)

#### 6-1) "유지/개선/통합/폐기" 결정표

> **근거**: 섹션 4 (Observed Issues OI-001 ~ OI-010) 및 현행 코드 분석 결과

| 모듈/페이지 | 현행 문제 | 개선안 | 폐기/대체 여부 | API/DB 영향 | 비고 |
|---|---|---|---|---|---|
| **SeasonListPage** | 보상 라벨 하드코딩 (OI-001) | 보상 타입 API 메타데이터화 | 🔄 대폭 개선 | ✅ 신규 API: `/admin/reward-types` | 프론트 재배포 불필요 |
| **AdminMissionPage** | 영문 라벨 혼재 (OI-002) | i18n 전역 적용 (한글화) | 🔄 개선 | ❌ 없음 | 코드 수정만 |
| **UserAdminPage** | 1154줄, 단일 책임 위반 (OI-003) | 5개 컴포넌트로 분리 | 🔄 리팩토링 | ❌ 없음 | 유지보수성 개선 |
| **GameTokenGrantPage** | `tokenOptions` 하드코딩 (OI-004) | 보상 타입 API 통합 | 🔄 개선 | ✅ 기존 API 활용 | SeasonListPage와 동일 전략 |
| **VaultAdminPage** | 확인 모달 없음 (OI-005) | 2-Step 확인 + Audit Log | 🔄 개선 | ✅ Audit Log 확장 | 중대 사고 방지 |
| **SeasonListPage** | 프리뷰 기능 부재 (OI-006) | 프리뷰 모달 추가 | 🔄 신규 기능 | ❌ 없음 | 유저 화면 미리보기 |
| **AdminDashboardPage** | 위젯 부족 (OI-007) | 시즌 현황판, Sync 신호등 추가 | 🔄 개선 | ✅ 신규 API 필요 | 섹션 2 참조 |
| **RouletteConfigPage** | 확률 합계 검증 없음 (OI-008) | 프론트 Zod 검증 추가 | 🔄 개선 | ❌ 없음 | 100% 합계 강제 |
| **ExternalRankingPage** | 인라인 편집 불가 (OI-009) | 테이블 인라인 편집 추가 | 🔄 개선 | ❌ 없음 (기존 API 활용) | UX 개선 |
| **FeatureSchedulePage** | 레거시 미사용 의심 (OI-010) | 사용 여부 확인 후 결정 | ⚠️ 검토 중 | ❌ 폐기 시 DB 영향 없음 | Step 5 감사 대상 |

#### 6-2) 중복 기능 정리 원칙

1. **보상 타입 정의의 단일화**:
   - 현재: `SeasonListPage`, `GameTokenGrantPage`, `RouletteConfigPage` 등에서 각각 하드코딩
   - 개선: `/admin/reward-types` API 신설, 전역 캐싱 (`React Query`)

2. **사용자 검색의 통합**:
   - 현재: `UserAdminPage`, `VaultAdminPage`, `GameTokenGrantPage`에서 각각 구현
   - 개선: `UserIdentifierResolveConfirm` 컴포넌트를 표준으로 확정, 명시적 prefix (`uid:`, `tgid:`, `@`) 권장

3. **모달 컴포넌트 표준화**:
   - 현재: 각 페이지별로 인라인 모달 구현 (일관성 부족)
   - 개선: `<ConfirmModal />`, `<AlertModal />`, `<FormModal />` 공통 컴포넌트 제작

#### 6-3) 관리자 워크플로우 최적화 (Top 3 시나리오)

**시나리오 1: 신규 보상 타입 추가 및 시즌 패스에 반영** (빈도: 주 1회)

- **현행 (As-Is)**: 개발자가 코드 수정 → 프론트 빌드 → 배포 → 어드민이 시즌 설정
- **개선 (To-Be)**: 어드민이 `자산 및 보상 > 보상 타입 관리`에서 직접 추가 → 시즌 설정 드롭다운에 즉시 반영
- **소요 시간**: 30분 → **3분** (90% 감소)

**시나리오 2: 특정 유저 금고 잔액 조정** (빈도: 일 5회)

- **현행 (As-Is)**: Vault Admin 진입 → 유저 검색 → 잔액 조정 → 클릭 즉시 실행 (확인 없음)
- **개선 (To-Be)**: 동일 흐름 + **확인 모달 (사유 입력 필수)** + Audit Log 자동 기록
- **오류율**: 월 1~2건 오입력 → **0건** 예상

**시나리오 3: 시즌 패스 레벨 보상 변경 후 유저 화면 확인** (빈도: 주 2회)

- **현행 (As-Is)**: 설정 저장 → 별도 브라우저에서 유저 계정 로그인 → 화면 확인
- **개선 (To-Be)**: 설정 화면에서 **프리뷰 버튼** 클릭 → 모달에서 유저 화면 렌더링 확인
- **소요 시간**: 5분 → **30초** (90% 감소)

#### 6-4) 오류 방지 장치 (확인 모달, Dry-Run, Audit Log 필수화)

**필수 적용 대상 (Critical Actions)**:

| 액션 | 현행 | 개선 안 | 우선순위 |
|---|---|---|---|
| 금고 잔액 리셋 | 버튼 클릭 즉시 실행 | 사유 입력 모달 + "RESET" 타이핑 확인 | 🔴 Critical |
| 유저 계정 삭제/퍼지 | `window.confirm()` 1회 | 2-Step 확인 + Audit Log | 🔴 Critical |
| 시즌 패스 활성화 | 즉시 활성화 | 프리뷰 확인 → 활성화 확인 모달 | 🟠 High |
| 룰렛 확률 저장 | 검증 없음 | 합계 100% 검증 + 시뮬레이션 결과 표시 | 🟠 High |
| 대량 메시지 발송 | Dry-Run 없음 | Dry-Run 모드 + 발송 대상 미리보기 | 🟡 Medium |

**Audit Log 표준 형식**:

```typescript
{
  admin_user_id: number;
  action: "vault_reset" | "user_purge" | "season_activate" | ...;
  target_user_id?: number;
  before_value: JSON;
  after_value: JSON;
  reason: string; // 운영자 입력 사유 (필수)
  timestamp: ISO8601;
}
```

**Dry-Run 도입 권장**:

- 메시지 발송, 대량 지급 등 비가역 작업에 "테스트 실행" 모드 제공
- 결과 미리보기 후 "실제 실행" 버튼 노출

---

<a id="improvement-ops-log"></a>

### 5. 신규: 운영 로그 시스템 (Ops Log System)

> **[NEW FEATURE]** 상세 설계: [`202601운영로그설계서.md`](./202601운영로그설계서.md)
>
> 1인 운영 환경에서 운영 현황을 실시간으로 기록하고 추적하기 위한 **Enterprise-Grade 운영 로그 시스템** 설계입니다.

#### 5-1) 도입 배경 및 목표

| 문제 (Pain Point) | 해결책 (Solution) | 기대 효과 |
|---|---|---|
| 운영 일지가 마크다운 수동 작성 | **Organic Logging**: 시스템 이벤트 자동 기록 | 수동 입력 제로화 |
| 운영 루틴 누락/실행 미확인 | **Time-Based Routine Tracker**: 체크박스 클릭 시 자동 로그 | 체계적 루틴 관리 |
| 세그먼트 타겟팅 → DM → 결과 추적 불가 | **CRM 연동**: 세그먼트 쿼리 → DM 발송 → 응답률 자동 집계 | 전환율 측정 가능 |
| KPI 수동 집계 | **KPI 스냅샷**: 버튼 클릭 시 DAU/Revenue/Churn 자동 채움 | 실시간 지표 확보 |

#### 5-2) 핵심 구성 요소

1. **Operations Command Center** (대시보드 위젯)
    - KPI Command Panel (실시간 DAU/Revenue/Deposit/Withdraw/Churn)
    - Time-Based Routine Tracker (RTP-4.4 하루 루틴 연동)
    - Segment Targeting Panel (RTP-4.2 라이프사이클 개입)
    - Live Event Feed (WebSocket 실시간 이벤트)
    - Quick Ops Logger (특이사항 즉시 기록)

2. **Smart Editor Pro** (`/admin/ops/logs/{date}`)
    - Notion-Like 섹션형 블록 에디터
    - 세그먼트 빌더 (프리셋 + 커스텀 쿼리)
    - DM 발송 통합 (RTP-7 High-Touch 템플릿)
    - KPI 스냅샷 자동 삽입

3. **Event-Driven Architecture**
    - Event Bus Pattern으로 Organic Logging 구현
    - 모든 비즈니스 이벤트 → `OpsLogEntry` 자동 생성
    - 멱등키 기반 중복 방지

4. **Hybrid Input (Editable Combobox)**
    - 모든 입력 필드에 "드롭다운 + 직접 입력" 허용
    - 일자/시간/금액/유저/보상타입/태그 등 전역 적용
    - 히스토리 학습 + Unknown Value 경고 배지

#### 5-3) 데이터 모델

```sql
-- 일일 운영 로그 (Day-level)
CREATE TABLE admin_ops_daily_logs (
    id SERIAL PRIMARY KEY,
    log_date DATE NOT NULL UNIQUE,
    theme VARCHAR(200),
    status VARCHAR(20) DEFAULT 'DRAFT', -- DRAFT, PUBLISHED
    kpi_snapshot JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 개별 로그 엔트리 (Event-level)
CREATE TABLE admin_ops_log_entries (
    id SERIAL PRIMARY KEY,
    daily_log_id INT REFERENCES admin_ops_daily_logs(id),
    category VARCHAR(30) NOT NULL, -- ROUTINE, PAYOUT, CS, EVENT, ISSUE
    action_code VARCHAR(50) NOT NULL, -- 표준화된 액션 코드
    target_model VARCHAR(30), -- USER, TEAM, ITEM, VAULT, MISSION
    target_id INT,
    actor_id INT,
    description TEXT,
    meta_data JSONB,
    logged_at TIMESTAMP DEFAULT NOW()
);
```

#### 5-4) 로드맵 통합

| Phase | 주요 작업 | 연관 OI |
|---|---|---|
| **Phase 0** | DB 스키마 생성, 기본 CRUD API | - |
| **Phase 1** | Command Center 위젯, Quick Logger | OI-007 해결 |
| **Phase 2** | Smart Editor Pro, 템플릿 시스템 | - |
| **Phase 3** | Event Bus 연동, Organic Logging | - |

---

<a id="improvement-guidelines"></a>

### 6. 기술 설계(최소 변경 원칙)

> **원칙**: "코드를 새로 짜는 것"이 아니라 **"구조를 정리하고 안전장치를 심는 것"**에 집중합니다. 위험한 작업은 어렵게, 안전한 작업은 쉽게 만듭니다.

#### 6-1) Frontend (React/Next.js)

- **상수/로직의 API 위임 (Metadata-Driven)**
  - 프론트엔드에 하드코딩된 `RewardTypes`, `MissionActions`, `ItemCategories` 등을 제거합니다.
  - 대신 **API(`useQuery`)**를 통해 메타데이터를 받아오고, 이를 기반으로 드롭다운/라벨을 렌더링하도록 변경합니다.
  - 효과: 운영 정책 변경 시 배포 없이 즉시 반영 (SeasonPass 하드코딩 해결).
- **데이터 동기화 전략 (Global Sync)**
  - **Query Key Factory**: `['user', id]`, `['vault', id]` 등 쿼리 키를 중앙 객체로 관리하여 오타 방지 및 의존성 명확화.
  - **Smart Invalidation**: 데이터 수정(Mutation) 후, 단순 `refetch`가 아니라 **연관된 상위/형제 데이터**까지 정확히 갱신(`invalidate`)하여 "새로고침 없는 운영" 실현.
- **컴포넌트 분리 (Atomic/Domain)**
  - 거대 페이지(`UserAdminPage` 등 1000줄+)를 **기능 단위 컴포넌트**(`UserProfileCard`, `UserVaultPanel`, `UserActivityLog`)로 분할하여 유지보수성 확보.
  - 공통 모달 Standard (`<ConfirmReasonModal />`) 도입으로 모든 중요 액션에 사유 입력을 강제.

#### 6-2) Backend (FastAPI/Python)

- **표준화된 응답/에러 규격 (Response Standard)**
  - 성공: `{ "success": true, "data": ..., "meta": ... }`
  - 실패: `{ "success": false, "error": { "code": "USER_NOT_FOUND", "message": "...", "details": ... } }`
  - 효과: 프론트엔드에서 일관된 에러 모달/토스트(Toast) 처리가 가능해짐.
- **Audit Decorator 도입 (감사로그 자동화)**
  - 모든 변경(Write) API에 `@audit_log(action="...", resource="...")` 데코레이터를 적용.
  - 데코레이터 내부에서 `AdminAuditLog` 생성, 요청자 IP/ID, 변경 전/후 데이터(가능하다면) 기록.
- **엔드포인트 네이밍 정리 (RESTful)**
  - 동사 혼용(`get-users`, `user-list`)을 지양하고 **리소스 중심**(`GET /users`, `GET /users/{id}`)으로 점진적 정규화.

#### 6-3) 데이터/운영 안전장치 (Safety)

- **위험 작업 3단계 가드레일**
  1. **권한 체크 (RBAC)**: 해당 관리자가 `SUPER_ADMIN` 또는 특정 권한(`RESET_VAULT`)을 가졌는지 확인.
  2. **식별자 검증 (Validation)**: 타겟이 "전체"인지 "특정 유저"인지 명확히 구분 (전체 대상 작업은 별도 플래그 필수).
  3. **감사 기록 (Audit)**: 작업 수행 전 `reason`(사유) 입력을 강제하고 로그에 남김.
- **삭제/퍼지(Purge) 전략**
  - **Soft Delete 우선**: `is_deleted=True` 또는 `deleted_at` 타임스탬프 활용.
  - **Hard Delete (Purge)**: 법적/보안상 필요한 경우에만 별도 API(`DELETE /.../purge`)로 분리하고, 이중 확인(Double Confirmation) UI 강제.

<a id="improvement-execution"></a>

### 7. 실행 계획 (Execution Plan)

> **전략**: "진단 → 1단계(핵심) → 2단계(확산) → 3단계(안정화)" 순으로 진행하며, 각 단계마다 **운영자 피드백**을 수용합니다.

#### Phase 0: 진단 및 기반 마련 (Diagnosis & Foundation)

- **목표**: 현재 상태를 정확히 알고, 변경의 기준(Design System, SoT)을 확정.
- **주요 태스크**:
  - [x] 어드민 시스템 전수 감사 (Audit Report 작성)
  - [ ] **디자인 토큰 정의**: 어드민 전용 컬러 팔레트(가독성 중심), 간격, 타이포그래피 확정.
  - [ ] **SoT 문서화**: 유저 식별자, 금고 잔액 등 핵심 데이터의 "정본" 위치 확정 및 공유.
  - [ ] **공통 컴포넌트 개발**: `PageLayout`, `ConfirmReasonModal`, `SearchFilterBar`.

#### Phase 1: 뼈대 및 공통 기능 (Skeleton & Common)

- **목표**: 새로운 네비게이션 구조와 공통 UI가 적용된 "뼈대"를 배포하여 운영자가 적응하게 함.
- **주요 태스크**:
  - **신규 사이드바/레이아웃 적용**: 섹션 2 제안(자산/인게이지먼트/시스템 분리) 반영.
  - **전역 검색 바(Global Search)**: 어디서든 유저/메뉴를 찾을 수 있는 헤더 검색 기능.
  - **인증/권한 처리 강화**: 세션 만료 시 깔끔한 튕김 처리, 권한 없는 메뉴 숨김.

#### Phase 2: 핵심 운영 페이지 교체 (Core Pages Migration)

- **목표**: 운영 빈도 상위 20% 페이지(전체 업무의 80% 커버)를 신규 구조로 완전히 전환.
- **대상 페이지 (Top N)**:
  1. **회원 관리 상세 (User Detail)**: 정보 조회, 수정, 상담 이력 탭 뷰 적용. (OI-003 해결)
  2. **시즌 패스 설정 (Season Ops)**: 프리뷰 기능, 동적 보상 아이콘 적용. (OI-001, OI-006 해결)
  3. **금고 관리 (Vault Ops)**: 출금 승인/거절 안전장치, 로그 뷰어 통합. (OI-005 해결)
  4. **보상 타입 관리 (Reward Types)**: 신규 메타데이터 관리 페이지 오픈.

#### Phase 3: 확산 및 안정화 (Expansion & Stabilization)

- **목표**: 나머지 페이지들을 정리하고, 문서를 남겨 "누구나 유지보수 가능한" 상태로 만듦.
- **주요 태스크**:
  - **잔여 페이지 마이그레이션**: 설정(Config), 통계(Stats), 기타 로그 페이지.
  - **레거시 코드 제거**: 사용하지 않는 `admin_v1` 라우트 및 구형 컴포넌트 삭제.
  - **런북(Runbook) 작성**: "이럴 땐 이렇게 운영하세요" 매뉴얼화 및 어드민 내 `Help` 버튼 연동.

#### 롤백(Rollback) 및 배포 전략

- **점진적 배포 (Canary/Feature Flag 전략)**
  - 백엔드 변경이 크지 않다면, 프론트엔드 URL을 분리(`admin-v2`)하여 일부 운영자부터 테스트.
  - 주요 기능(예: 시즌패스 설정 V2)에 Feature Toggle을 심어, 문제 발생 시 즉시 V1 UI로 복귀 가능하도록 조치.
- **데이터베이스 호환성 유지**
  - 스키마 변경(`ALTER`)이 필요한 경우, **"새 컬럼 추가 → 코드 반영(Dual Write) → 데이터 마이그레이션 → 구 컬럼 삭제"**의 4단계를 준수하여 무중단 배포 지향.

<a id="improvement-verify"></a>

### 8. 검증 체크리스트

- UI: 로딩/에러/빈상태/반응형/접근성
- 기능: 지급/회수/설정 저장/권한/감사로그
- 성능: 대용량 테이블/필터/검색
- 운영: 장애 시 동작, 로그/알람 확인

### 10. 부록

- 관련 코드/라우트 맵
- 관련 문서 링크 모음
- 결정 로그(Why/Trade-off)
