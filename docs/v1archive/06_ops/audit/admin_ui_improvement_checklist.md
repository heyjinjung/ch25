# 어드민 UI/UX 개선 트랙 구현 체크리스트 (Admin UI Improvement Checklist)

> **목표**: RTP(Retention Turnaround Plan) 실행을 위한 "Engagement 중심" 메뉴 재편 및 "신규 제안 기능"의 접근성 확보.

## 1. 사이드바 메뉴 재편 (Sidebar Hierarchy To-Be)

- [x] **관제 센터 (Operations)**
  - [x] 운영 현황 (Dashboard)
    - [x] 운영현황 상세페이지 모두 구현되었는지 체크
    - [x] 테마: #91F402 (Neon Green) → #007acc (VS Code Blue) & #1e1e1e (Dark Gray) 폰트: 전역 최소 사이즈 16px 적용 (가독성 향상)
    - [x] 실시간 활동피드 전체 한글패치 여부 확인
    - [x] 경제 현황 모니터? → 자산 건전성 (Asset Health) 지표로 명칭 변경 및 도움말 툴팁 적용 완료
    - [x] 회원 유지 및 이탈 더 구체화 및 현재 구현된 자료 적극 활용 (리텐션/이탈 위험군 데이터 연동 완료)
    - [x] 스마트 운영 액션 영역 도움말 [배지/토스트/모달로 구현] (툴팁 적용 완료)
    - [x] 컴포넌트가 관련 API와 정상 연결되어 있음? (Season, Feed, Watchtower, Command 모두 연동 확인)
  - [x] **IA/네비게이션**: 용어 통일 및 한글화 패치 (Phase 1 완료) admin_ui_standards.md
  - [x] **레이아웃 규칙**: 대시보드/테이블/폼/모달 간격 및 정렬 표준화
  - [x] **디자인 토큰**: 색상(Semantic Palette), 타이포그래피, 상태별(Loading/Empty/Error) UI 강화
  - [x] **접근성**: 키보드 포커스 및 대비 최적화
  - [x] ~~실시간 상황판 (Pulse)~~ - `[Cancelled]` (사용자 요청에 의해 폐기됨)

- [x] **자산 및 경제 (Assets)**
  - [x] 금고 통합 관리 (Vault)
    - [x] 하위 컴포넌트(`Rules`, `Ui`, `Settings`, `Request`) 전면 디자인 토큰(`admin-*`) 교체 완료
    - [x] 타이포그래피 표준화 (`text-xs` → `text-base` 위주)
    - [x] 어두운 배경(`#111`)을 표준 사이드바(`bg-admin-sidebar`)로 통일
  - [x] 상점 레버 (Shop)
    - [x] **[OI-015]** 저장 로직 개선: 전체 덮어쓰기 → 변경된 항목만 Patch (Race Condition 방지)
    - [x] **[OI-013]** 하드코딩 필터 제거: `PROD_TICKET_` 접두사 의존성 제거 및 `item_type` 기반 동적 그룹핑으로 개선
    - [x] 디자인 표준화: 테이블 헤더(Bold Uppercase), 입력창(Compact), 버튼에 `admin-*` 토큰 적용 및 완전 한글화
    - [x] **[UX]** 수정 상태 시각화: 변경된 행 좌측에 Brand Color Bar 표시 및 입력창 강조
    - [x] **[UX]** 레이아웃 유연화: 하단 통계 위젯 높이 제한 해제(`h-[400px]` → `min-h`) 및 3단 Grid 적용
    - [x] **[Feature]** '거래 분석' 페이지 통합: 상품 관리 하단에 전체 통계 리스트 탑재
  - [x] ~~경제 지표 (Economy)~~ - `[Merged]` ('상점 관리' 페이지로 기능 통합 및 메뉴 제거)
  - [x] 티켓/토큰 통합 관리

- [x] **인게이지먼트 (Engagement)**
  - [x] 시즌 패스 (Season)
  - [x] 미션 관리 (Missions)
  - [x] 메시지 발송 (Inbox)
- [x] **멤버 및 CRM (CRM)**
  - [x] 회원 관리 (Users)
  - [x] 마케팅 센터
  - [x] 세그먼트 및 규칙 (Segments)
  - [x] 설문조사 관리
- [x] **시스템 및 설정 (System)**
  - [x] 스트릭 보상 운영
  - [x] 게임별 설정 (Hub) - `[Placeholder]` (룰렛/주사위/복권 통합 대기)
  - [x] UI 문구 및 설정 (Admin UI Config)
  - [x] 팀 배틀 설정

## 2. 디자인 및 레이아웃 시스템 (To-Be Design)

- [x] **4단 그리드 시스템 도입**
  - [x] Header (Hero): 상황판단 및 상단 상황판
  - [x] Left Column: 실시간 Live Ops Feed
  - [x] Center/Right: 핵심 지표 (Metrics) 위젯
  - [x] Bottom: 빠른 대응 (Actions) 및 링크
- [x] **[Header] 시즌 작전 상황판 (Season Ops Board)**
  - [x] D-Day Countdown (Progress Circle + Pulse Animation)
  - [x] Live Participation Graph (Sparkline Chart)
  - [x] 긴급 공지 (Emergency Announce) 컨트롤
  - [x] 지급 락다운 (Kill Switch) 버튼
- [x] **[Left] 라이브 오퍼레이션 피드 (Live Ops Feed)**
  - [x] `[입금]` 로그 노출 및 High Value 강조
  - [x] `[당첨]` 1등 당첨 로그 및 축합 효과
  - [x] `[출금]` 요청 로그 및 승인 바로가기
  - [x] `[위험]` 어뷰징 의심(매크로) 마킹
- [x] **[Center] 경제/리텐션 왓치타워 (Watchtower)**
  - [x] 인플레이션 모니터 (Bar Gauge)
  - [x] 금고 뱅크런 감지 알림
  - [x] 이탈 위험군 심화 및 "미끼 투척" 원스톱 연동
  - [x] 웰컴 안착률 (Cohort Heatmap)
- [x] **[Header] 전역 동기화 신호등 (Sync Traffic Light)**
  - [x] Config Sync 상태판 (`DB` ↔ `Redis` ↔ `Client`)
  - [x] Time Sync 및 골든 아워 ON/OFF 램프
- [x] **스마트 액션 & 개인화**
  - [x] 상황별 추천 액션 노출 (출금 대기, 시즌 종료 임박 등)
  - [x] My Shortcuts (메뉴 핀 고정 기능)

## 3. 기 식별된 문제점 수정 (Observed Issues Fix)

- [ ] **OI-001**: SeasonPassPage 보상 라벨 하드코딩 제거 (`/admin/reward-types` API 연동)
- [ ] **OI-002**: AdminMissionPage 영문 라벨(Action Type 등) 전면 한글화
- [ ] **OI-003**: UserAdminPage 단일 책임 위반 리팩토링 (컴포넌트 분리)
- [ ] **OI-004**: GameTokenGrantPage `tokenOptions` 하드코딩 제거
- [ ] **OI-005**: VaultAdminPage 크리티컬 액션에 확인 모달(2-Step) 추가
- [ ] **OI-006**: SeasonListPage 시즌 패스 프리뷰 기능 구현
- [ ] **OI-007**: 대시보드 위젯 고도화 (시즌 D-Day, Sync 상태 등)
- [ ] **OI-008**: RouletteConfigPage 확률 합계 100% 검증 로직 추가 (Zod/Frontend)
- [ ] **OI-009**: ExternalRankingPage 인라인 테이블 편집 기능 추가
- [ ] **OI-010**: FeatureSchedulePage 사용 여부 검토 및 정리
- [ ] **OI-011**: UserAdminPage 대량 데이터 로딩 개선 (Server-side Pagination 등)
- [ ] **OI-012**: AdminTeamBattlePage 치명적 액션 확인 모달 추가
- [x] **OI-013**: Frontend 하드코딩 필터(SKU 접두사 등) 유연화 - `[Completed]` (동적 그룹핑 적용)
- [ ] **OI-014**: 상점 관리 상품 이미지 미리보기 지원
- [x] **OI-015**: 상점 설정 Race Condition 방지 (Patch 방식 검토) - `[Completed]` (Diff 기반 Patch 적용)

## 4. 모듈 고도화 정리 (Decision Table 구현)

- [ ] **보상 타입 정의 단일화**: 전역 `reward-types` API 기반 관리
- [ ] **사용자 검색 통합**: `UserIdentifierResolveConfirm` 표준화 준수
- [ ] **모달 컴포넌트 표준화**: `ConfirmModal`, `AlertModal`, `FormModal` 공통화

## 5. UI/UX 리디자인 상세

- [x] **IA/네비게이션**: 용어 통일 및 한글화 패치 (Phase 1 완료)
- [ ] **레이아웃 규칙**: 대시보드/테이블/폼/모달 간격 및 정렬 표준화
- [ ] **디자인 토큰**: 색상(Semantic Palette), 타이포그래피, 상태별(Loading/Empty/Error) UI 강화
- [ ] **접근성**: 키보드 포커스 및 대비 최적화

## 6. 상세페이지 그룹별 디자인 개선안 (Detailed Page Design)

### 6-1) [대시보드] 데이터 가시성 및 실시간성 강화

- [ ] 대시보드 레이아웃 4단 그리드 전환
- [ ] '시즌 작전 상황판' (Season Ops Board) 컴포넌트 구현
- [ ] '라이브 오퍼레이션 피드' (Live Ops Feed) 연동 및 스타일링
- [ ] 경제 지표/리텐션 왓치타워 차트/게이지 최적화

### 6-2) [자산 및 보상] 재화 정의 및 상점 관리의 직관성

- [ ] **[NEW] 보상 타입 관리**: 타입별 아이콘/색상 매칭 및 미리보기
- [ ] **[NEW] 에셋 관리**: 이미지 라이브러리 UI (Grid View, 복사/삭제)
- [ ] **상점 관리**: 상품 이미지 썸네일 노출 및 카테고리별 필터링 강화

### 6-3) [인게이지먼트] 운영 안전성 및 프리뷰 강화

- [ ] **시즌 패스**: 레벨별 보상 리스트의 '유저 시점 프리뷰' 팝업 구현
- [ ] **미션 및 업적**: 카테고리별 탭 구분 및 '승인 대기' 건수 뱃지 노출
- [ ] **콘텐츠(룰렛/주사위/복권)**: 확률 설정 시 '기대값 계산기' 위젯 포함
- [ ] **설문조사**: 응답 현황 통계 시각화 및 결과 엑셀 추출 UI 개선

### 6-4) [회원 및 CRM] 유저 타겟팅 및 이력 추적성

- [ ] **회원 관리**: 사이드 패널 형태의 '유저 상세 뷰' 도입 (전체 페이지 이동 최소화)
- [ ] **마케팅/메시지**: 메시지 발송 전 '대상 유저수 미리보기' 및 템플릿 선택기
- [ ] **사용자 분류**: 세그먼트별 유저 분포 그래프 및 대표 페르소나 요약

### 6-5) [시스템 및 검증] 신뢰도 및 추적성 극대화

- [ ] **전역 동기화**: 신호등 UI (Green/Yellow/Red) 및 원클릭 캐시 퍼지 버튼
- [ ] **경제 지표**: 시간대별 재화 인플레이션 차트 (Area Chart)
- [ ] **감사 로그**: '누가/언제/무엇을' 검색 필터 강화 및 변경 전/후 데이터 비교 뷰

## 7. 트러블슈팅 및 장애리포트 (Troubleshooting & Incident Reports)

### [2026-01-12] Admin 401 Unauthorized Issue (Reward Types & Game Configs)

- **증상**: 관리자 로그인 상태임에도 `Reward Types` 및 `Dashboard > Game Config` 위젯에서 `401 Unauthorized` 지속 발생. 시크릿 탭에서도 동일.
- **원인**:
  - 해당 페이지의 API 요청 파일(`adminRewardTypesApi.ts`, `adminGameConfigApi.ts`)이 `adminApi`가 아닌 일반 유저용 `apiClient`를 import하여 사용.
  - 유저용 `apiClient`는 `Authorization` 헤더에 유저 토큰(`xmas_access_token`)만 담고, 관리자 토큰(`admin_token`)은 무시함.
  - 이로 인해 관리자 페이지에서 **"토큰 없이"** API 요청이 전송되어 401 에러 발생.
- **해결**:
  - `adminRewardTypesApi.ts` 및 `adminGameConfigApi.ts`의 import를 `apiClient` → `adminApi`로 교체.
  - 백엔드 라우터(`admin_reward_types.py`)의 불필요한 중복 의존성 제거 및 Trailing Slash 리다이렉트 방지 처리 병행.
- **교훈**:
  - 관리자용 API 파일 생성 시, 반드시 `httpClient.ts`의 `adminApi`를 사용하고 있는지 체크할 것.
  - `adminApi`는 `localStorage`의 `admin_token`을 참조하도록 인터셉터가 설정되어 있음.
