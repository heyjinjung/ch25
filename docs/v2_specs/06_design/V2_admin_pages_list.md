# V2 Admin 페이지 구현 점검 및 플로우 체크

**목적**: V2 어드민 프론트엔드 페이지의 구현 현황, API 연동 상태, 그리고 실제 접근 가능한 플로우를 점검하기 위한 문서입니다.

## 1. 네비게이션 구조 및 구현 현황

사이드바 메뉴 구조를 기준으로 분류했습니다.

- 사이드바는 **섹션 단위(운영/코어/게임관리/시스템)**로 구성
- **중간 메뉴 필터**로 섹션만 골라보기 가능
- 각 섹션은 **토글(접기/펼치기)**로 관리

### 1-1. 운영 (OPS)
| 페이지명 | 경로 (Route) | UI 상태 | API 상태 | 비고 |
| :--- | :--- | :---: | :---: | :--- |
| **대시보드** | `/v2/admin/dashboard` | ✅ 완료 | **Real** | `getOpsDashboardStatus` 연동 (시스템 상태, 매출 등)<br/>- 서브: `/v2/admin/dashboard/radar` (레이더), `/v2/admin/marketing` (마케팅 센터) |
| **메시지발송** | `/v2/admin/marketing/messages` | ✅ 완료 | **Real** | V2 어드민 래핑 완료<br/>- `GET /api/v2/admin/marketing/messages` (목록)<br/>- `POST /api/v2/admin/marketing/messages` (발송/팬아웃) |
| **설문조사** | `/v2/admin/marketing/surveys` | ✅ 완료 | **Real** | V2 어드민 래핑 완료 (레거시 설문 모델 재사용)<br/>- `GET /api/v2/admin/marketing/surveys` (목록)<br/>- `GET /api/v2/admin/marketing/surveys/{id}` (단건)<br/>- `POST /api/v2/admin/marketing/surveys` (생성)<br/>- `PUT /api/v2/admin/marketing/surveys/{id}` (수정: 질문/옵션 전체 교체)<br/>- `DELETE /api/v2/admin/marketing/surveys/{id}` (삭제=ARCHIVED)<br/>- `PUT /api/v2/admin/marketing/surveys/{id}/toggle` (토글: 경로 충돌 방지)<br/>- `GET /api/v2/admin/marketing/surveys/{id}/results` (결과 통계) |
| **세그먼트** | `/v2/admin/users/segments` | ✅ 완료 | **Real** | 배치 실행 및 통계(`GET /stats`), 규칙(`GET /rules`) 연동 완료 (404 해결) |

### 1-2. 코어 (Core)
| 페이지명 | 경로 (Route) | UI 상태 | API 상태 | 비고 |
| :--- | :--- | :---: | :---: | :--- |
| **유저관리** | `/v2/admin/users` | ✅ 완료 | **Real** | v1 스타일 아이콘 기반 모달 확장 패턴 적용 완료<br/>- 테이블: UID/닉네임/텔레ID/레벨/금고잔액/최근접속일/관리(7개 아이콘)<br/>- 아이콘 클릭 → 모달 해당 탭 직접 접근<br/>- 검색, 필터, 정렬, 페이지네이션 완벽 구현 |
| **유저 상세 (Drawer)** | *(Drawer)* | ✅ 완료 | **Real** | 8개 탭(기본정보, 지갑, 금고, 인벤토리, 활동로그, 미션, 메모, 세그먼트)<br/>- defaultTab prop으로 탭 직접 접근 가능<br/>- 완전 한글화 |
| **레벨관리** | `/v2/admin/game/level` | ✅ 완료 | **Mock** | 경험치 테이블 및 보상 설정 |
| **금고현황** | `/v2/admin/economy/vault` | ✅ 완료 | **Real** | **완전 풀스택 구현 완료** (GSAP + 매직 UI)<br/>- 실시간 금고 통계 대시보드 (NumberTicker 애니메이션)<br/>- 회원별 금고 조회 (검색, 정렬, 페이지네이션)<br/>- 출금 승인/반려 처리<br/>- 금고 강제 조정 (닉네임 검색 지원, Audit Log 자동 기록)<br/>- 일자별 추이 차트 (Recharts AreaChart 30일) |
| **입금관리** | `/v2/admin/economy/deposits` | ✅ 완료 | **Real** | CC 입금 대기열 확인 및 승인<br/>- 닉네임, 입금횟수, 입력일 표시 개선 (백엔드 연동 완료) |
| **티켓/토큰관리** | `/v2/admin/inventory/tickets` | 🚧 UI만 | **Mock** | 유저 티켓 로그 조회 (날짜 필터 등) |
| **미션관리** | `/v2/admin/game/missions` | ✅ 완료 | **Mock** | 미션 목록 조회 및 수정 UI |
| **상점관리** | `/v2/admin/economy/shop` | ✅ 완료 | **Hybrid** | 상품(Real) + 환율(Mock) |

### 1-3. 게임관리 (Game Management)
*현재 대부분 Mock 데이터 사용 중*

| 페이지명 | 경로 (Route) | UI 상태 | API 상태 | 비고 |
| :--- | :--- | :---: | :---: | :--- |
| **룰렛** | `/v2/admin/game/roulette` | ✅ 완료 | **Mock** | 확률 및 보상 설정 |
| **주사위** | `/v2/admin/game/dice` | ✅ 완료 | **Mock** | 승/패 배율 설정 |
| **복권** | `/v2/admin/game/lottery` | ✅ 완료 | **Mock** | 당첨금/확률 설정 |
| **팀배틀** | `/v2/admin/game/team-battle` | 🚧 홀더 | **Hardcoded** | 구현 전: Placeholder 페이지로만 연결 |
| **이벤트페이지 (골든아워관리)** | `/v2/admin/game/golden-hour` | 🚧 홀더 | **Hardcoded** | 구현 전: Placeholder 페이지로만 연결 |

### 1-4. 시스템 (System)
| 페이지명 | 경로 (Route) | UI 상태 | API 상태 | 비고 |
| :--- | :--- | :---: | :---: | :--- |
| **시스템 상태** | `/v2/admin/system/health` | ✅ 완료 | **Hybrid** | 상태(Real) + 로그(Mock/Hardcoded) |

### 1-5. 사이드바 숨김/서브 페이지 (접근은 가능)

| 페이지명 | 경로 (Route) | UI 상태 | API 상태 | 비고 |
| :--- | :--- | :---: | :---: | :--- |
| **위기 감지 레이더** | `/v2/admin/dashboard/radar` | ✅ 완료 | **Check** | 대시보드 내 섹션 상세 조회 페이지 (사이드바 숨김) |
| **마케팅 센터** | `/v2/admin/marketing` | ✅ 완료 | **Check** | 마케팅 캠페인 요약 및 바로가기 (사이드바 숨김) |
| **모달 제어** | `/v2/admin/system/modals` | ✅ 완료 | **Hardcoded** | 클라이언트 상태 제어용 (API 없음, 사이드바 숨김) |

---

## 2. API 연동 상태 정의

*   **Real**: 실제 백엔드 API (`/api/v2/...`)와 완전하게 연동되어 DB 데이터를 읽고 씀.
*   **Hybrid**: 페이지 내 일부 섹션은 Real API, 일부는 Mock 데이터 또는 하드코딩.
*   **Mock**: `adminApi.ts` 내부의 가짜 데이터(배열 반환)를 사용. UI 테스트 가능.
*   **Hardcoded**: 컴포넌트 내부에 데이터가 고정되어 있음.

## 3. 최근 업데이트 하이라이트

### 3-1. 금고 제어 페이지 완전 재구현 (2026-01-20)

**풀스택 구현 완료**
- **백엔드 API** (Python/FastAPI)
  - `GET /api/v2/admin/vault/stats` - 금고 통계 (당일 총액, 출금 대기/승인/반려)
  - `GET /api/v2/admin/vault/users` - 회원별 금고 조회 (검색, 정렬, 페이지네이션)
  - `GET /api/v2/admin/vault/trend` - 일자별 금고 추이 (30일)
  - `POST /api/v2/admin/vault/force-edit` - 금고 강제 조정 (Audit Log 자동 기록)

- **프론트엔드** (React/TypeScript + GSAP)
  - 실시간 금고 대시보드 (4개 통계 카드, NumberTicker 애니메이션)
  - GSAP back.out 이징으로 카드 등장 효과
  - 3개 탭 구조: 출금 승인 / 회원별 금고 / 일자별 추이
  - Recharts AreaChart로 30일 추이 시각화
  - 매직 UI (Gradient 배경, Framer Motion, 다크 테마 최적화)

### 3-2. 유저 관리 UI/UX 개선 (2026-01-20)

**v1 스타일 아이콘 기반 모달 확장 패턴 적용**
- 테이블 필드 재구성: UID / 닉네임 / 텔레그램 ID / 레벨 / 금고잔액 / 최근접속일 / 관리(아이콘)
- 7개 기능별 아이콘 버튼
  - 👁️ 상세 정보 (회색)
  - 💳 지갑 관리 (인디고)
  - 💰 금고 관리 (에메랄드)
  - 📦 인벤토리 (보라)
  - 📜 활동 로그 (황금)
  - 💬 상담/메모 (파랑)
  - 🛡️ 제재 관리 (빨강)
- 아이콘 클릭 시 UserDetailDrawer가 해당 탭으로 자동 열림
- 완전 한글화 (페이지네이션, 필터, 모든 라벨)

### 3-3. 마케팅(설문) CRUD V2 래핑 완료 (2026-01-20)

**설문 CRUD(생성/수정/삭제) 포함 V2 어드민 경로로 래핑 완료**
- `/api/v2/admin/marketing/surveys...` 아래로 레거시 설문 기능을 단계적으로 이관
- 토글은 `PUT /surveys/{id}`(수정)와 충돌 방지로 `PUT /surveys/{id}/toggle`로 분리
- 삭제는 하드 삭제가 아니라 `status=ARCHIVED`로 처리(응답/히스토리 보존)

### 3-4. 입금 관리 페이지 고도화 (2026-01-20)
**운영 효율성을 위한 정보 표시 강화**
- 테이블 컬럼 개선: 닉네임(User ID), 입금횟수(Count), 입력일(Requested At) 추가
- 백엔드 로직 개선: `list_pending_deposits`에서 유저 닉네임 조인 및 `ExternalRankingDailyDepositDelta` 기반 입금 횟수 계산 로직 추가

### 3-5. 세그먼트 관리자 API 연결 (2026-01-20)
**콘솔 404 에러 해결 및 기능 정상화**
- `UserSegmentService` 및 `AdminSegmentRuleService`를 기반으로 API 엔드포인트 구현
- `GET /segments/stats`, `GET /segments/rules`, `POST/PUT/DELETE /segments/rules` 구현 완료

## 4. 향후 로드맵 (Action Items)

1.  [ ] **Game Ops 리얼 연동**: 미션, 룰렛, 로또 등의 설정을 실제 DB Config 테이블과 연동.
2.  [ ] **Shop 환율 기능 API 구현**: 현재 프론트엔드 모의 환율 계산기를 백엔드 로직으로 이관.
3.  [ ] **System Log 연동**: Health 페이지의 로그 섹션을 실제 서버 로그 스트림과 연결.
4.  [ ] **Modal 제어 전역화**: 모달 제어를 단순 로컬 상태가 아닌, 서버 설정(Config) 기반으로 변경 검토.
5.  [x] **금고 제어 풀스택 구현** ✅ 완료 (2026-01-20)
6.  [x] **유저 리스트 v1 스타일 적용** ✅ 완료 (2026-01-20)
7.  [x] **마케팅(설문) V2 래핑 완료** ✅ 완료 (2026-01-20)
8.  [x] **입금 관리 페이지 개선 (닉네임/횟수 표시)** ✅ 완료 (2026-01-20)
9.  [x] **세그먼트 관리자 API 404 에러 수정** ✅ 완료 (2026-01-20)
