# V2 Admin 페이지 목록 및 데이터 상태

요약: V2 어드민 라우터(`V2AdminRoutes.tsx`)에 등록된 전체 **19개 페이지**의 목록과 각 페이지별 데이터 연동 상태(하드코딩 / Mock / 리얼 API)를 정리한 문서입니다.

---

## 1) 전체 페이지 목록 (카테고리별)

- Dashboard
  - OpsDashboard
  - CrisisRadarPage
  - MarketingCenterPage

- Users
  - UserListPage
  - UserSegmentPage

- Economy
  - VaultControlPage
  - CCDepositPage
  - ShopManagerPage
  - TicketInventoryPage

- Game Ops
  - MissionManagerPage
  - LevelConfigPage
  - RouletteConfigPage
  - DiceConfigPage
  - LotteryConfigPage

- Marketing
  - MessageSenderPage
  - SurveyPage

- System
  - HealthPage
  - ModalControlPage

- Auth
  - V2AdminLoginPage


현재 프론트 확인되는 페이지
http://localhost:3000/v2/admin/dashboard
http://localhost:3000/v2/admin/users
http://localhost:3000/v2/admin/economy/vault
http://localhost:3000/v2/admin/economy/shop
http://localhost:3000/v2/admin/game/missions
http://localhost:3000/v2/admin/system/modals


1. 페이지별 API 연결 상세 분석
페이지 (Page)	URL 경로	API 연결 상태	비고
OpsDashboard	/v2/admin/dashboard	Real API	getOpsDashboardStatus (/api/v2/admin/ops/status) 호출. 백엔드 데이터에 따라 골든 레이더/매출 지표 표시됨.
VaultControlPage	/v2/admin/economy/vault	Real API	getAdminWithdrawals (/api/v2/admin/withdrawals) 호출. 실제 출금 요청 대기열 조회.
ShopManagerPage	/v2/admin/economy/shop	Hybrid	상품 목록: Real API (/api/v2/admin/shop/products)환율(Exchange): Mock Data (프론트엔드 내장 가짜 데이터)
MissionManagerPage	/v2/admin/game/missions	Mock API	getAdminMissions가 adminApi.ts 내부의 하드코딩된 배열을 반환함. 실제 DB 연동 안됨.
ModalControlPage	/v2/admin/system/modals	Hardcoded	API 호출 없이 페이지 내부 변수(modals)로만 동작. 상태 변경 시 저장은 되지만 새로고침 시 초기화 가능성 있음.





## 2) 데이터 연동 상태 요약

| 페이지 | 데이터 소스 | 비고 |
|---|---:|---|
| OpsDashboard | 리얼 API | 주요 대시보드 지표/데이터는 백엔드 호출로 동작 (백엔드 구현 여부에 따라 에러 가능) |
| CrisisRadarPage | 리얼 API | 리얼 API 연동으로 상태/이벤트 집계 표시 |
| MarketingCenterPage | 리얼 API | 마케팅 집계 및 센터 기능(대체로 API 기반) |
| UserListPage | 리얼 API | 유저 리스트/검색 등 실제 엔드포인트 호출 |
| UserSegmentPage | 리얼 API/부분 | 세그먼트 조회는 API, 일부 UI 로직은 프론트 처리 가능 |
| VaultControlPage | 리얼 API / 관리용 | 금고 제어 관련 API 연동 (주의: Vault SoT는 `user.vault_locked_balance`) |
| CCDepositPage | 리얼 API | 충전/입금 관련 API 호출 |
| ShopManagerPage | 부분 Mock | 상품 목록은 리얼 API, 'Exchange Editor'(환율) 섹션은 Mock 데이터 사용 |
| TicketInventoryPage | Mock API | 티켓 로그 데이터는 프론트 Mock으로 동작 |
| MissionManagerPage | Mock API | 미션 목록 전체가 Mock 데이터로 동작 |
| LevelConfigPage | Mock API | 레벨 설정 전체 Mock 데이터 |
| RouletteConfigPage | Mock API | 룰렛 설정 전체 Mock 데이터 |
| DiceConfigPage | Mock API | 주사위 설정 전체 Mock 데이터 |
| LotteryConfigPage | Mock API | 복권 설정 전체 Mock 데이터 |
| MessageSenderPage | Mock API | 발송 메시지 이력은 Mock 데이터 |
| SurveyPage | Mock API | 설문 목록 및 결과는 Mock 데이터 |
| HealthPage | 부분 하드코딩 | 상단 상태 카드는 API 호출, 하단 'Recent System Events' 로그는 하드코딩된 데이터 사용 |
| ModalControlPage | 컴포넌트 레벨 하드코딩 | 모달 목록이 컴포넌트 내부 변수로 고정되어 있음 |
| V2AdminLoginPage | 리얼 API / Auth | 인증 로직은 백엔드 연동 (로그인 엔드포인트 호출)


## 3) 특이사항 & 권장 액션

- 일부 페이지는 "부분 구현" 상태로, 섹션 단위로 데이터 소스가 다름(예: `ShopManagerPage`의 환율 섹션은 Mock). 향후 통합 테스트/엔드포인트 제공 시 실제 API로 전환 필요합니다. ✅
- `HealthPage` 하단 로그와 `ModalControlPage`는 실제 데이터 연결이 필요하면 우선순위를 정해 API 계약서(사양)를 정의하세요. ⚠️


- 라우트 경로(예: `/v2-admin/shop`) 및 라우터 파일 `V2AdminRoutes.tsx` 내 등록 위치
