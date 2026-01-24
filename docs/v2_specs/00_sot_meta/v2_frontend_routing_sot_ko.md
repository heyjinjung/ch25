# V2 Frontend Routing SoT (Source of Truth)

## 1. 개요 (Overview)
현재 프로젝트는 V1 레거시 코드가 남아있으나, 실제 서비스는 `/v2/` 경로를 통해 제공됩니다. 본 문서는 **V2 전용** 라우팅 구조 및 탭 통합 체계를 정의합니다.

## 2. 관리자 페이지 (Admin Area: `/v2/admin/*`)
V2 관리자 경로는 `src/v2/router/V2AdminRoutes.tsx`를 통해 제어되며, 주요 기능들이 **모듈별 탭(Tab) 구조**로 통합되었습니다.

### 2.1 대시보드 및 관제
| 메뉴명 | 경로 | 실제 페이지 컴포넌트 | 설명 |
| :--- | :--- | :--- | :--- |
| **운영 대시보드**| `/v2/admin/dashboard` | `OpsDashboard` | 시스템 상태 및 주요 지표 |
| 위기 레이더 | `/v2/admin/dashboard/radar` | `CrisisRadarPage` | 리스크 유저 및 장애 감지 |
| 실시간 골든 | `/v2/admin/dashboard/golden`| `GoldenRealTimePage` | 실시간 리텐션 작업 현황 |

### 2.2 유저 및 세그먼트 (Tabbed)
* **경로**: `/v2/admin/users`
* **컴포넌트**: `UserManagementTabPage`

| 탭 이름 | 서브 컴포넌트 | 설명 |
| :--- | :--- | :--- |
| **회원 관리** | `UserListPage` | 유저 검색, 상세 정보, 자산 수정 |
| **세그먼트** | `UserSegmentPage` | 실시간 유저 그룹핑 설정 |

### 2.3 경제 및 운영 제어 (Tabbed)
경제 모듈은 입출금 관제와 상점/미션 설정으로 분리되어 있습니다.

#### [관제] 금고 및 입금
| 메뉴명 | 경로 | 실제 페이지 컴포넌트 | 설명 |
| :--- | :--- | :--- | :--- |
| **금고 현황** | `/v2/admin/economy/vault` | `VaultControlPage` | 출금 승인/반려 및 잔액 모니터링|
| **입금 관리** | `/v2/admin/economy/deposits`| `CCDepositPage` | 외부 결제(CC) 확정 및 XP 연동 |

#### [설정] 상점 및 미션
* **경로**: `/v2/admin/economy/shop`
* **컴포넌트**: `ShopMissionTabPage`

| 탭 이름 | 서브 컴포넌트 | 설명 |
| :--- | :--- | :--- |
| **상점 관리** | `ShopManagerPage` | 상품 진열, 가격 제어, 레버 조정 |
| **미션 관리** | `MissionManagerPage` | 일일/업적 미션 로직 설정 |

### 2.4 인벤토리 및 티켓 (Tabbed)
* **경로**: `/v2/admin/inventory/tickets`
* **컴포넌트**: `TicketInventoryTabPage`

| 탭 이름 | 서브 컴포넌트 | 설명 |
| :--- | :--- | :--- |
| **티켓 관리** | `TicketManagementTab` | 게임별 티켓 지급 및 회수 |
| **인벤토리 관리**| `InventoryManagementTab`| 아이템 대량 지급 및 원장 확인 |

### 2.5 게임 상세 설정
| 메뉴명 | 경로 | 실제 페이지 컴포넌트 | 설명 |
| :--- | :--- | :--- | :--- |
| **레벨/XP 설정** | `/v2/admin/game/level` | `LevelConfigPage` | 구간별 XP 요구량 및 캡 조정 |
| **룰렛 설정** | `/v2/admin/game/roulette` | `RouletteConfigPage` | 확률 테이블 및 보상(SoT) 설정 |
| **주사위 설정** | `/v2/admin/game/dice` | `DiceConfigPage` | 하이루/배수 정책 설정 |
| **복권 설정** | `/v2/admin/game/lottery` | `LotteryConfigPage` | 퍼즐 드롭 및 당첨금 설정 |
| **팀 배틀** | `/v2/admin/game/team-battle`| `AdminTeamBattlePage` | 시즌 일정 및 상금 풀 제어 |
| **팝업/공지** | `/v2/admin/game/modals` | `ModalControlPage` | 인게임 모달 노출 우선순위 제어 |

### 2.6 마케팅 및 소통 (Tabbed)
* **경로**: `/v2/admin/marketing/messages`
* **컴포넌트**: `MarketingTabPage`

| 탭 이름 | 서브 컴포넌트 | 설명 |
| :--- | :--- | :--- |
| **메시지 발송** | `MessageSenderPage` | 유저 인박스 및 전체 공지 발송 |
| **설문 조사** | `SurveyPage` | 설문 생성 및 응답 지표 확인 |

> [!IMPORTANT]
> `/admin/*` 경로는 레거시(Remnants)이며, 모든 V2 신규 기능 검증은 반드시 `/v2/admin/*`에서 수행해야 합니다.

## 3. 유저 페이지 (User Area: `/v2/*`)
유저 경로는 `src/v2/router/V2UserRoutes.tsx`를 통해 제어되며, `V2AppLayout`을 사용합니다.

| 경로 | 페이지 컴포넌트 | 설명 |
| :--- | :--- | :--- |
| `/v2/home` | `HomePage` | V2 메인 홈 |
| `/v2/game` | `GamedashPage` | 게임 로비 (Gamedash) |
| `/v2/vault` | `VaultPage` | 유저 V2 금고 UI |
| `/v2/shop` | `ExchangePage` | V2 상점/교환소 |
| `/v2/inventory` | `InventoryPage` | V2 인벤토리 |
| `/v2/missions` | `MissionsPage` | V2 미션 현황 |
| `/v2/team-battle` | `TeamBattlePage` | V2 팀 배틀 현황 |
| `/v2/game/roulette`| `RoulettePage` | 룰렛 플레이 |
| `/v2/game/dice` | `DicePage` | 주사위 플레이 |
| `/v2/game/lottery` | `LotteryPage` | 복권 플레이 |

## 4. E2E 테스트 반영 사항
- `admin_nav_smoke.cy.ts`는 위 `/v2/admin/` 경로를 기준으로 작성되었습니다.
- 탭 내부 요소는 `data-testid` 또는 `cy.contains`를 활용하여 탭 전환 후 요소를 검증합니다.
