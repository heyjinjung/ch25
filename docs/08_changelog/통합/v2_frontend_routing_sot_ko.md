# V2 Frontend Routing SoT (Source of Truth)

## 1. 개요 (Overview)
현재 V2 프론트엔드(`src/`)의 실제 라우팅 구조를 정리하여 유저 및 개발팀의 혼선을 방지하고, E2E 테스트의 기준점으로 사용합니다.

## 2. 관리자 페이지 (Admin Area: `/admin/*`)
모든 관리자 경로는 `src/router/AdminRoutes.tsx`에 정의되어 있으며, `AdminLayout`을 공유합니다.

| Slug | 경로 | 실제 페이지 컴포넌트 | 설명 |
| :--- | :--- | :--- | :--- |
| **dashboard** | `/admin` | `AdminDashboardPage` | 운영 대시보드 |
| **marketing** | `/admin/marketing` | `MarketingDashboardPage` | 마케팅 관련 지표 |
| **ops** | `/admin/ops` | `AdminOpsPlanPage` | 운영 계획/플레이북 (Index) |
| ops/logs | `/admin/ops/logs` | `AdminOpsLogPage` | 운영 로그 조회 |
| ops/import | `/admin/ops/import` | `AdminOpsCsvUploadPage` | CSV 업로드 |
| **vault** | `/admin/vault` | `VaultAdminPage` | 금고 통합 관리 |
| **users** | `/admin/users` | `UserAdminPage` | 회원 상세 관리 |
| **game-tokens** | `/admin/game-tokens` | `TicketManagerPage` | 티켓/토큰 지급 및 원장 |
| **missions** | `/admin/missions` | `AdminMissionPage` | 미션 설정 |
| **seasons** | `/admin/seasons` | `SeasonListPage` | 시즌 패스 관리 |
| **shop** | `/admin/shop` | `AdminShopPage` | 상점 상품 레버 제어 |
| **user-segments**| `/admin/user-segments` | `UserSegmentsPage` | 실시간 세그먼트 |
| **surveys** | `/admin/surveys` | `SurveyAdminPage` | 설문조사 관리 |
| **messages** | `/admin/messages` | `MessageCenterPage` | 메시지/인박스 발송 |
| **team-battle** | `/admin/team-battle` | `AdminTeamBattlePage` | 팀 배틀 시즌 설정 |
| **roulette** | `/admin/roulette" | `RouletteConfigPage` | 룰렛 개별 설정 |
| **dice** | `/admin/dice` | `DiceConfigPage` | 주사위 개별 설정 |
| **lottery** | `/admin/lottery` | `LotteryConfigPage` | 복권 개별 설정 |
| **ui-config** | `/admin/ui-config` | `UiConfigTicketZeroPage` | 긴급구호/UI 설정 |

## 3. 유저 페이지 (User Area: `/*`)
유저 경로는 `src/router/UserRoutes.tsx`에 정의되어 있습니다.

| 경로 | 페이지 컴포넌트 | 설명 |
| :--- | :--- | :--- |
| `/landing` | `HomePage` | 메인 홈 (Primary) |
| `/vault` | `VaultPage` | 유저 금고 |
| `/rewards` | `InventoryPage` | 인벤토리/보상 |
| `/shop` | `ExchangePage` | 상점/교환소 |
| `/games` | `GameLobbyPage` | 게임 로비 |
| `/roulette` | `RoulettePage` | 룰렛 플레이 |
| `/dice" | `DicePage` | 주사위 플레이 |
| `/lottery` | `LotteryPage` | 복권 플레이 |
| `/missions` | `MissionPage` | 미션/스트릭 |

## 4. E2E 테스트 반영 사항
- `admin_nav_smoke.cy.ts`의 `NAV_ITEMS` 목록을 위 표와 일치하도록 최신화했습니다.
- 로그인 리다이렉트 대응을 위해 `cy.loginAdmin()` 커맨드를 추가하였습니다.
