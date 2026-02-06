──────────────────────────────

## [부록] 어드민 페이지 반자동 데이터 추출 & 서버 업로드 자동화 설계안 (2026-01-22)

### 1. 목적
- 어드민 페이지에 1회 수동 로그인 후, 세션을 유지한 채 30분마다 자동으로 데이터를 추출하여 우리 서버(내부 API/DB/구글시트 등)로 업로드
- 2FA/캡차 등 추가 인증이 필요한 환경에서도 “사람 개입 최소화+자동화” 실현

### 2. 전체 아키텍처
- PC/서버(윈도우/리눅스)에서 크롬(또는 Edge) 브라우저를 띄워 어드민 페이지 로그인 상태 유지
- puppeteer/selenium 등 자동화 도구가 “이미 열린 브라우저 세션”에 attach하여 DOM 데이터 추출
- 추출 데이터는 fetch/axios 등으로 우리 서버 API로 POST, 또는 파일로 저장
- 스케줄러(cron, 작업 스케줄러 등)로 30분마다 자동 실행
- 세션 만료/오류 발생 시 알림(메일/슬랙 등) 발송

### 3. 상세 워크플로우
① 초기 세팅
  - 크롬/Edge 브라우저를 “원격 디버깅 모드”로 실행 (예: chrome.exe --remote-debugging-port=9222)
  - 어드민 페이지에 수동 로그인(2FA/캡차 등 직접 처리)
  - puppeteer/selenium 스크립트에서 해당 브라우저 세션에 connect

② 데이터 추출 자동화
  - 30분마다 스크립트 실행(윈도우 작업 스케줄러, cron 등)
  - attach된 세션에서 어드민 페이지 새로고침
  - 필요한 DOM 요소에서 데이터 추출(예: 테이블, 랭킹, 입금 내역 등)
  - 데이터 파싱/정제(엑셀/CSV/JSON 등)

③ 데이터 업로드
  - 추출 데이터 → 우리 서버 API로 POST(axios/fetch 등)
  - 또는 파일로 저장 후 SFTP/구글시트 등으로 업로드

④ 예외/오류 처리
  - 세션 만료/로그아웃 감지 시 알림(메일/슬랙 등) 발송
  - 데이터 추출/업로드 실패 시 로그 기록 및 알림

⑤ 유지보수/확장
  - 어드민 페이지 구조 변경 시, DOM 선택자/파싱 로직만 수정
  - 필요시 여러 페이지/탭 동시 추출도 확장 가능

### 4. 보안/운영 체크리스트
- 자동화 스크립트는 내부망/보안 PC에서만 실행
- 어드민 계정/세션 정보는 안전하게 관리(환경변수, vault 등)
- 서버 API 업로드 시 인증/권한 체크
- 접근/실행 이력 및 실패 로그 주기적 점검

### 5. 예시 기술 스택
- 브라우저: Chrome/Edge (원격 디버깅 모드)
- 자동화: puppeteer(노드), selenium(파이썬/노드)
- 스케줄러: cron(리눅스), 작업 스케줄러(윈도우)
- 데이터 업로드: axios/fetch(HTTP), paramiko(SFTP), gspread(구글시트)
- 알림: nodemailer, slack webhook 등

### 6. 확장/고도화 방안
- 여러 어드민 페이지/탭 동시 추출
- 추출 데이터 자동 정제/이상치 감지
- 업로드 실패 시 자동 재시도/백업 저장
- 세션 만료 자동 감지→알림→수동 로그인 유도

> 실제 적용 환경(운영체제, 어드민 페이지 구조 등)에 따라 세부 구현/코드 예시를 맞춤 제공할 수 있습니다.
# v2 프론트/어드민 페이지/컴포넌트 인덱스

─────────────────────────────
## [프론트 일반 페이지]

### 대시보드
- src/v2/pages/dashboard/DashboardPage.tsx

### 홈/배너/게임 카드
- src/v2/pages/home/HomePage.tsx
- src/v2/pages/home/PokemonHomePage.tsx
- src/v2/pages/home/components/SeollalHeroBanner.tsx
- src/v2/pages/home/components/GameCardGrid.tsx
- src/v2/pages/home/components/GameCard.tsx
- src/v2/pages/home/components/AssetButtons.tsx

### 금고/자산
- src/v2/pages/vault/VaultPage.tsx

### 상점/교환
- src/v2/pages/shop/ExchangePage.tsx

### 미션
- src/v2/pages/missions/MissionsPage.tsx

### 인벤토리
- src/v2/pages/inventory/InventoryPage.tsx

### 게임(복권/룰렛/허브/주사위)
- src/v2/pages/game/LotteryPage.tsx
- src/v2/pages/game/RoulettePage.tsx
- src/v2/pages/game/GameHubPage.tsx
- src/v2/pages/game/DicePage.tsx

### 인증/로그인
- src/v2/pages/auth/V2UserLoginPage.tsx

─────────────────────────────
## [v2 어드민 페이지/컴포넌트]

### 레이아웃/공통
- src/v2/admin/layouts/AdminLayout.tsx
- src/v2/admin/components/ui/AdminChart.tsx

### 유저 관리
- src/v2/admin/pages/users/UserListPage.tsx
- src/v2/admin/pages/users/UserDetailDrawer.tsx
- src/v2/admin/pages/users/UserManagementTabPage.tsx
- src/v2/admin/pages/users/UserSegmentPage.tsx

### 대시보드/운영
- src/v2/admin/pages/dashboard/OpsDashboard.tsx
- src/v2/admin/pages/dashboard/OpsLogPage.tsx
- src/v2/admin/pages/dashboard/CrisisRadarPage.tsx
- src/v2/admin/pages/dashboard/GoldenRealTimePage.tsx
- src/v2/admin/pages/dashboard/MarketingCenterPage.tsx

### 경제/금고/상점
- src/v2/admin/pages/economy/VaultControlPage.tsx
- src/v2/admin/pages/economy/ShopManagerPage.tsx
- src/v2/admin/pages/economy/CCDepositPage.tsx
- src/v2/admin/pages/economy/TicketInventoryPage.tsx
- src/v2/admin/pages/economy/TicketManagementTab.tsx
- src/v2/admin/pages/economy/InventoryManagementTab.tsx
- src/v2/admin/pages/economy/ShopMissionTabPage.tsx
- src/v2/admin/pages/economy/TicketInventoryTabPage.tsx

### 게임 관리
- src/v2/admin/pages/game/DiceConfigPage.tsx
- src/v2/admin/pages/game/RouletteConfigPage.tsx
- src/v2/admin/pages/game/LotteryConfigPage.tsx
- src/v2/admin/pages/game/LevelConfigPage.tsx
- src/v2/admin/pages/game/MissionManagerPage.tsx
- src/v2/admin/pages/game/ModalControlPage.tsx

### 인벤토리 관리
- src/v2/admin/pages/inventory/TicketInventoryPage.tsx

### 마케팅/메시지/설문
- src/v2/admin/pages/marketing/MarketingTabPage.tsx
- src/v2/admin/pages/marketing/MessageSenderPage.tsx
- src/v2/admin/pages/marketing/SurveyPage.tsx

─────────────────────────────
## [추가/수정 계획서]

### 1. 금고/자산 (VaultPage.tsx)
- 현황: 기프콘(기프트콘) 관련 기능/컴포넌트 미구현
- 계획: v1 VaultPage 및 기프콘 관련 컴포넌트/API 구조 참고하여, v2 VaultPage에 기프콘 내역/상태/수령/사용 기능 추가
  - 예시: 기프콘 리스트, 상태(보관/소멸/사용), 수령/사용 버튼, 금고 SoT(user.vault_locked_balance) 연동
  - 정책: 금고/기프콘 금지어, 정수 금액, 실시간 상태 반영
  - v2 최신 SoT 반영:
    - 인벤토리: user.inventory_items 기준으로 보관/소멸/사용 상태 관리, 아이템별 실시간 상태/수령/사용 기능 추가
    - 티켓: user.ticket_balance, ticket_inventory 테이블 기준으로 티켓 내역/락/소멸/사용 상태 관리, 실시간 반영
    - 보상: user.vault_locked_balance에만 신규 보상/차감 반영(기존 cash_balance write 금지), 보상 내역/수령/소멸/사용 모두 vault_locked_balance 기준으로 처리
    - 모든 자산/보상/티켓/기프콘은 v2 정책에 따라 단일 SoT(원본값 보존, 실시간 상태, 금지어/정수 금액)로 관리

### 2. 상점/교환 (ExchangePage.tsx)
- 현황: 보유재화(잔고/토큰 등) 확인 기능 미구현
- 계획: v1 상점/교환 페이지에서 잔고/재화 표시 방식 참고, v2 ExchangePage에 사용자 보유재화(토큰/포인트 등) 실시간 표시 영역 추가
  - 예시: 상단에 "보유 토큰: 1,000 T" 등 표시, 실시간 API 연동
  - 정책: 금지어/정수 금액, 실시간 상태 반영
  - v2 최신 SoT 반영:
    - 인벤토리: user.inventory_items 기준으로 교환 가능/불가 아이템, 실시간 상태/수량 표시, 교환 시 인벤토리/잔고 동기화
    - 티켓: user.ticket_balance, ticket_inventory 테이블 기준으로 티켓 교환/사용/락/소멸 상태 실시간 반영
    - 보상: user.vault_locked_balance 기준으로 교환/보상 지급/차감 처리(기존 cash_balance write 금지), 교환 결과/보상 내역 실시간 표시
    - 모든 교환/상점 자산/티켓/보상은 v2 정책에 따라 단일 SoT(원본값 보존, 실시간 상태, 금지어/정수 금액)로 관리

### 3. 인벤토리 (InventoryPage.tsx)
- 현황: 파일/컴포넌트 및 실시간 데이터 연동(useV2Inventory) 구현은 정상이나, 유저가 직접 접근할 수 있는 메뉴/라우트/버튼이 현재 코드상 없음
- 계획: 홈/메뉴/게임 카드 등에서 "/v2/inventory"로 연결하는 명시적 메뉴/버튼/링크 추가 필요
  - 예시: 홈 화면(GameCardGrid/GameCard)에 "나의 가방" 카드 추가, 사이드바/메뉴에 인벤토리 진입 경로 추가, 라우트 연결 확인
  - 정책: user.inventory_items 등 v2 SoT 기준으로 자산/아이템 관리, 금지어 미사용, 수량(정수) 표기, 실시간 상태(수량, 사용 등) 반영
- 결론: 인벤토리 페이지는 컴포넌트/기능/실시간 연동은 정상 구현되어 있으나, 실제 유저 노출을 위해서는 홈/메뉴/게임 카드 등에서 "/v2/inventory"로 연결하는 추가 구현이 필요함

## 4. 미션 (MissionsPage.tsx)
- 현황: v2 정책 기준, 실시간 미션 리스트/상태/보상/수동 Claim 등 API 연동 및 정책 적용이 필수이나, 현재 정적 UI만 구현되어 있음
- 계획: v2 미션 API/백엔드 연동 구조 점검 및 실시간 데이터 연동(미션 리스트/상태/보상/수동 Claim) 보장 필요
  - 예시: useQuery 기반 미션 리스트/상태/보상 API 연동, 수동 Claim 버튼/로직 구현, 실시간 상태 반영
  - 정책: 미션 금지어 미사용, 보상/수량 정수 표기, 수동 Claim 정책, 실시간 상태 반영, SoT(user.mission_status 등) 기준
연동 구조
현재 MissionsPage.tsx는 useQuery 등 API 연동 없이 정적 UI만 구현되어 있으며, 미션 리스트(데일리/이벤트) 및 진행도/보상 등은 하드코딩된 값으로 표시됨
실제 미션 상태/보상/수동 Claim 등 실시간 데이터 연동 및 정책 적용은 미구현 상태
수동 Claim 정책
미션 보상 수령 버튼/로직(수동 Claim)은 현재 코드에 포함되어 있지 않으며, "금고로 이동" 버튼 등은 안내/링크 역할만 수행
정책 적용 현황
미션명/상태/보상(정수), 금지어 미사용 등 UI 정책은 준수하나, 실시간 상태/수동 Claim/실제 API 연동 등 v2 정책은 미구현
결론 및 개선 방향
MissionsPage.tsx는 v2 정책(실시간 상태, 수동 Claim, 금지어/정수 금액, SoT 등) 기준으로 실시간 미션 리스트/상태/보상/수동 Claim 연동이 반드시 필요함
실무 적용을 위해 useQuery 기반 API 연동, 수동 Claim 버튼/로직, 실시간 상태 반영 등 구체적 개선 작업이 요구됨
─────────────────────────────

요약:

InventoryPage.tsx는 v2 기준 실시간 연동/정책 적용이 정상이며, 라우트/메뉴 연결 시 실제 노출됩니다.
어드민 사이드바에는 직접 노출되지 않으나, 유저 메뉴/라우트에서 연결 가능.
정책/실시간 연동 모두 코드상 구현되어 있습니다.

HomePage.tsx/메인 메뉴
[src/v2/pages/home/HomePage.tsx]는 게임 카드 그리드(GameCardGrid)를 통해 주요 게임/기능 진입 경로를 제공
GameCardGrid.tsx에서 각 게임/기능의 href(경로)를 명시적으로 선언
인벤토리(나의 가방)는 GameCardGrid/GameCard에서 직접 노출되지 않음(즉, 홈에서 바로 진입 불가)
인벤토리 페이지 직접 노출 여부
[src/v2/pages/inventory/InventoryPage.tsx]는 파일/컴포넌트로 존재하며, useV2Inventory()로 실시간 데이터 연동
하지만 홈/게임 카드/메뉴/라우트에서 "/v2/inventory"로 연결되는 코드가 현재 확인되지 않음
즉, 유저가 직접 "나의 가방" 페이지로 접근할 수 있는 명시적 메뉴/버튼/링크가 현재 코드상 없음
결론
인벤토리 페이지는 컴포넌트/기능/실시간 연동은 정상 구현되어 있으나, 유저가 직접 접근할 수 있는 메뉴/라우트/버튼이 현재 코드상 존재하지 않음
실제 노출을 위해서는 홈/메뉴/게임 카드 등에서 "/v2/inventory"로 연결하는 추가 구현이 필요함



### 4. 미션 (MissionsPage.tsx)
- 현황: 백엔드 연동(API/데이터) 정상 동작 여부 미확인
- 계획: v2 미션 API/백엔드 연동 구조 점검, 미션 리스트/상태/보상 수령(수동 Claim) 등 실시간 데이터 연동 보장
  - 예시: useQuery로 미션 리스트/상태/보상 API 연동, 수동 Claim 버튼/정책 적용
  - 정책: 미션 금지어, 정수 금액, 수동 Claim, 실시간 상태 반영
연동 구조
현재 MissionsPage.tsx는 useQuery 등 API 연동 없이 정적 UI만 구현되어 있음
미션 리스트(데일리/이벤트) 및 진행도/보상 등은 하드코딩된 값(진행도: 0/3 등)으로 표시됨
실제 미션 상태/보상/수동 Claim 등 실시간 데이터 연동은 미구현 상태
수동 Claim 정책
미션 보상 수령 버튼/로직(수동 Claim)은 현재 코드에 포함되어 있지 않음
"금고로 이동" 버튼 등은 이벤트 안내/링크 역할만 수행
정책 적용 현황
미션명/상태/보상(정수), 금지어 미사용 등 UI 정책은 준수
실시간 상태/수동 Claim/실제 API 연동 등 v2 정책은 미구현
결론 및 개선 방향
MissionsPage.tsx는 현재 정적 UI만 구현되어 있으며, 실시간 미션 리스트/상태/보상/수동 Claim 등은 useQuery 등으로 API 연동 필요
v2 정책(실시간 상태, 수동 Claim, 금지어/정수 금액 등) 적용을 위해 백엔드 연동/버튼/로직 추가가 필요함
─────────────────────────────

요약:

v2 미션 페이지는 UI만 구현되어 있고, 실시간 연동/수동 Claim 정책은 미구현 상태입니다.
실무 적용을 위해 useQuery 기반 API 연동, 수동 Claim 버튼/로직, 실시간 상태 반영이 반드시 추가되어야 합니다.


─────────────────────────────

> 본 인덱스는 2026-01-22 기준 v2 폴더 내 실제 구현된 프론트/어드민 페이지/컴포넌트 경로를 정리한 것입니다.
> 추가 세부 기능/코드/정책 적용 여부는 각 파일에서 확인 가능합니다.
