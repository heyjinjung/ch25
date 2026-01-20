# V2 Admin 페이지 구현 점검 및 플로우 체크

**목적**: V2 어드민 프론트엔드 페이지의 구현 현황, API 연동 상태, 그리고 실제 접근 가능한 플로우를 점검하기 위한 문서입니다.

## 1. 네비게이션 구조 및 구현 현황

사이드바 메뉴 구조를 기준으로 분류했습니다.

### 1-1. 대시보드 (Dashboard)
| 페이지명 | 경로 (Route) | UI 상태 | API 상태 | 비고 |
| :--- | :--- | :---: | :---: | :--- |
| **운영 대시보드** | `/v2/admin/dashboard` | ✅ 완료 | **Real** | `getOpsDashboardStatus` 연동 (시스템 상태, 매출 등) |
| **위기 감지 레이더** | `/v2/admin/dashboard/radar` | ✅ 완료 | **Check** | 대시보드 내 섹션 상세 조회 페이지 |
| **마케팅 센터** | `/v2/admin/marketing` | ✅ 완료 | **Check** | 마케팅 캠페인 요약 및 바로가기 |

### 1-2. 유저 관리 (Users)
| 페이지명 | 경로 (Route) | UI 상태 | API 상태 | 비고 |
| :--- | :--- | :---: | :---: | :--- |
| **유저 리스트** | `/v2/admin/users` | ✅ 완료 | **Real** | v1 스타일 아이콘 기반 모달 확장 패턴 적용 완료<br/>- 테이블: UID/닉네임/텔레ID/레벨/금고잔액/최근접속일/관리(7개 아이콘)<br/>- 아이콘 클릭 → 모달 해당 탭 직접 접근<br/>- 검색, 필터, 정렬, 페이지네이션 완벽 구현 |
| **유저 상세 (Drawer)** | *(Drawer)* | ✅ 완료 | **Real** | 8개 탭(기본정보, 지갑, 금고, 인벤토리, 활동로그, 미션, 메모, 세그먼트)<br/>- defaultTab prop으로 탭 직접 접근 가능<br/>- 완전 한글화 |
| **고객 세그먼트** | `/v2/admin/users/segments` | ✅ 완료 | **Real** | 배치 실행 및 통계 조회 연동 완료 |

### 1-3. 경제 관리 (Economy)
| 페이지명 | 경로 (Route) | UI 상태 | API 상태 | 비고 |
| :--- | :--- | :---: | :---: | :--- |
| **금고 제어** | `/v2/admin/economy/vault` | ✅ 완료 | **Real** | **완전 풀스택 구현 완료** (GSAP + 매직 UI)<br/>- 실시간 금고 통계 대시보드 (NumberTicker 애니메이션)<br/>- 회원별 금고 조회 (검색, 정렬, 페이지네이션)<br/>- 출금 승인/반려 처리<br/>- 금고 강제 조정 (Audit Log 자동 기록)<br/>- 일자별 추이 차트 (Recharts AreaChart 30일) |
| **입금 관리** | `/v2/admin/economy/deposits` | ✅ 완료 | **Real** | CC 입금 대기열 확인 및 승인 |
| **상점 관리** | `/v2/admin/economy/shop` | ✅ 완료 | **Hybrid** | 상품(Real) + 환율(Mock) |
| **티켓/인벤토리** | `/v2/admin/inventory/tickets` | 🚧 UI만 | **Mock** | 유저 티켓 로그 조회 (날짜 필터 등) |

### 1-4. 게임 운영 (Game Ops)
*현재 대부분 Mock 데이터 사용 중*

| 페이지명 | 경로 (Route) | UI 상태 | API 상태 | 비고 |
| :--- | :--- | :---: | :---: | :--- |
| **미션 관리** | `/v2/admin/game/missions` | ✅ 완료 | **Mock** | 미션 목록 조회 및 수정 UI |
| **레벨 설정** | `/v2/admin/game/level` | ✅ 완료 | **Mock** | 경험치 테이블 및 보상 설정 |
| **룰렛 설정** | `/v2/admin/game/roulette` | ✅ 완료 | **Mock** | 확률 및 보상 설정 |
| **주사위 설정** | `/v2/admin/game/dice` | ✅ 완료 | **Mock** | 승/패 배율 설정 |
| **복권 설정** | `/v2/admin/game/lottery` | ✅ 완료 | **Mock** | 당첨금/확률 설정 |

### 1-5. 마케팅 (Marketing)
| 페이지명 | 경로 (Route) | UI 상태 | API 상태 | 비고 |
| :--- | :--- | :---: | :---: | :--- |
| **메시지 발송** | `/v2/admin/marketing/messages` | ✅ 완료 | **Mock** | 푸시/인박스 발송 UI |
| **설문 조사** | `/v2/admin/marketing/surveys` | ✅ 완료 | **Mock** | 설문 생성 및 결과 조회 |

### 1-6. 시스템 (System)
| 페이지명 | 경로 (Route) | UI 상태 | API 상태 | 비고 |
| :--- | :--- | :---: | :---: | :--- |
| **시스템 상태** | `/v2/admin/system/health` | ✅ 완료 | **Hybrid** | 상태(Real) + 로그(Mock/Hardcoded) |
| **모달 제어** | `/v2/admin/system/modals` | ✅ 완료 | **Hardcoded** | 클라이언트 상태 제어용 (API 없음) |

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

## 4. 향후 로드맵 (Action Items)

1.  [ ] **Game Ops 리얼 연동**: 미션, 룰렛, 로또 등의 설정을 실제 DB Config 테이블과 연동.
2.  [ ] **Shop 환율 기능 API 구현**: 현재 프론트엔드 모의 환율 계산기를 백엔드 로직으로 이관.
3.  [ ] **System Log 연동**: Health 페이지의 로그 섹션을 실제 서버 로그 스트림과 연결.
4.  [ ] **Modal 제어 전역화**: 모달 제어를 단순 로컬 상태가 아닌, 서버 설정(Config) 기반으로 변경 검토.
5.  [x] **금고 제어 풀스택 구현** ✅ 완료 (2026-01-20)
6.  [x] **유저 리스트 v1 스타일 적용** ✅ 완료 (2026-01-20)
