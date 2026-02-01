# W05 FRONTEND 트러블슈팅 (01-27 ~ 02-02)

## 02-01 - [FRONTEND/REFACTOR] MissionManagerPage 대규모 리팩토링 (2944→284줄, 90% 감소)

### 증상 정의
| 항목 | 내용 |
|---|---|
| 대상 기능 | 미션 관리 페이지 전체 |
| HTTP Status | N/A (리팩토링) |
| 영향 범위 | 어드민 페이지 UX/유지보수성 |
| 재현 빈도 | N/A |

### 배경 (Why)
- `MissionManagerPage.tsx` 파일이 **2944줄**로 비대해져 유지보수 및 코드 리뷰가 어려움
- 하나의 파일에 미션 CRUD, 유저 관리, 통계, 스트릭 규칙 설정 등 모든 기능이 혼재
- 컴포넌트 재사용 불가, 관심사 분리(SoC) 원칙 위반

### 해결 방법 (What)

#### 1. 컴포넌트 분리 구조
```
src/v2/admin/pages/game/mission/
├── components/
│   ├── index.ts              # 배럴 익스포트
│   ├── CollapsibleSection.tsx    # 접이식 섹션 (60줄)
│   ├── QuickStat.tsx             # 통계 카드 (44줄)
│   ├── MissionCard.tsx           # 미션 카드 (183줄)
│   ├── MissionDialogs.tsx        # 생성/편집 다이얼로그 (615줄)
│   ├── MissionPreview.tsx        # 미션 프리뷰 (81줄)
│   ├── StreakRulesSection.tsx    # 스트릭 규칙 CRUD (457줄)
│   ├── StreakRulesEditor.tsx     # 스트릭 에디터 (레거시)
│   ├── UsersTabContent.tsx       # 유저 관리 탭 (583줄)
│   └── StatsTabContent.tsx       # 통계 탭 (284줄)
├── constants/
│   └── missionConstants.ts   # 상수/옵션 정의 (245줄)
├── utils/
│   └── missionHelpers.ts     # 헬퍼 함수 (113줄)
└── types/
    └── index.ts              # 타입 정의 (23줄)
```

#### 2. 주요 분리 내용

| 분리 대상 | 파일명 | 라인 수 | 설명 |
|-----------|--------|---------|------|
| 상수/옵션 | `missionConstants.ts` | 245 | CATEGORIES, REWARD_OPTIONS, LOGIC_KEY_PRESETS 등 |
| 헬퍼 함수 | `missionHelpers.ts` | 113 | normalizeLogicKey, generateTitle, getCategoryMeaning 등 |
| 타입 정의 | `types/index.ts` | 23 | StreakGrant, StreakRule, CreateMissionForm |
| 미션 카드 | `MissionCard.tsx` | 183 | 개별 미션 카드 UI |
| 생성/편집 | `MissionDialogs.tsx` | 615 | CreateMissionDialog + EditMissionDialog |
| 스트릭 규칙 | `StreakRulesSection.tsx` | 457 | 연속 출석 보상 규칙 CRUD |
| 유저 관리 | `UsersTabContent.tsx` | 583 | 유저 미션/스트릭/마일스톤 관리 |
| 통계 탭 | `StatsTabContent.tsx` | 284 | DAU/WAU/MAU, 미션 완료율 통계 |

#### 3. 빌드 오류 해결 내역

| 오류 | 원인 | 해결 |
|------|------|------|
| JSX in `.ts` file | `getRewardIcon` 함수가 JSX 반환 | `.tsx` 파일로 이동 |
| `categoryStyle` undefined | 타입 가드 없이 직접 접근 | fallback 기본값 추가 |
| `newRules[ruleIdx]` undefined | 배열 인덱스 접근 시 undefined 가능성 | null check 추가 |
| 미사용 import 에러 | TS6133 strict mode | 해당 import 제거 |

### 검증 방법
```powershell
# 빌드 테스트
npm run build  # ✅ 성공

# 라인 수 확인
(Get-Content "src\v2\admin\pages\game\MissionManagerPage.tsx" | Measure-Object -Line).Lines
# 결과: 284줄 (2944줄 → 284줄, 90% 감소)
```

### 영향받는 파일
**수정:**
- `src/v2/admin/pages/game/MissionManagerPage.tsx` (2944→284줄)

**신규 생성:**
- `src/v2/admin/pages/game/mission/components/*.tsx` (8개 파일)
- `src/v2/admin/pages/game/mission/constants/missionConstants.ts`
- `src/v2/admin/pages/game/mission/utils/missionHelpers.ts`
- `src/v2/admin/pages/game/mission/types/index.ts`

**기타 수정 (미사용 import 정리):**
- `src/v2/admin/layouts/AdminLayout.tsx`
- `src/v2/admin/pages/dashboard/CrisisRadarPage.tsx`
- `src/v2/admin/pages/dashboard/GoldenRealTimePage.tsx`
- `src/v2/admin/pages/ops/AuditLogPage.tsx`
- `src/v2/admin/pages/ops/CSVImportPage.tsx`
- `src/v2/router/V2AdminRoutes.tsx`

### 관련 문서
- learned_ 미션 도메인: `docs/v2_specs/00_sot_meta/00_A_sot_code_ops_chk/learned_/mission/09.mission.md`
- 컴포넌트 설계 원칙: React 공식 문서 "Thinking in React"

---

## 01-31 - [FRONTEND] 금고 내역에 상점 구매(차감) 안 보임

### 증상
- 유저 상세 드로어 → 금고 탭에서 상점 구매 내역이 안 보임
- 적립(EARN)만 보이고 차감(SPEND)은 누락

### 원인 분석
```
기존 코드: useAdminUserVaultHistory → VaultEarnEvent (적립만 기록)
정상 구조: useVaultUserLedger → VaultLedger (적립+차감 전체)
```

### 해결
1. **훅 교체**: `useAdminUserVaultHistory` → `useVaultUserLedger`
2. **UI 수정**: VaultLedger 응답 구조에 맞게 필드명 변경 (amount, type, ref_type 등)

**수정 파일:**
- `src/v2/admin/pages/users/UserDetailDrawer.tsx`

### 검증
- 금고 탭에서 상점 구매 내역(ref_type='SHOP')이 차감(-)으로 표시되는지 확인

---

## 01-31 - [FRONTEND] 게임 보상 내역 조회 UI 없음

### 증상
- 유저가 다이스/룰렛/복권에서 얻은 보상을 어드민에서 확인할 UI가 없음

### 해결
1. **백엔드 API 추가**: `GET /api/v2/admin/users/{userId}/game-logs`
   - 다이스/룰렛/복권 로그 통합 조회
   - 최신 50건 반환

2. **프론트 훅 추가**: `useUserGameLogs(userId)`

3. **UI 추가**: UserDetailDrawer에 "게임 로그" 탭 추가

**수정 파일:**
- `app/v2/api/admin/user_routes.py` - API 엔드포인트
- `src/v2/api/adminApi.ts` - 타입/함수
- `src/v2/hooks/useV2Admin.ts` - 훅
- `src/v2/admin/pages/users/UserDetailDrawer.tsx` - UI 탭

### 검증
- 유저 상세 → 게임 로그 탭에서 DICE/ROULETTE/LOTTERY 기록 표시

---

## 01-31 - [FRONTEND] 인벤토리 변동 이력(차감/사용) 안 보임

### 증상
- 유저 상세 드로어 → 인벤토리 탭에서 아이템 목록만 보이고 변동 이력이 없음
- 지급(GRANT)/사용(USE)/회수(REVOKE) 로그가 표시되지 않음

### 원인 분석
```
백엔드 API: GET /api/v2/admin/inventory/logs (존재함)
프론트 훅: useAdminInventoryLogs (존재함)
문제: UserDetailDrawer에서 훅 호출 안 함
```

### 해결
1. `useAdminInventoryLogs` import 추가
2. 인벤토리 탭 하단에 "인벤토리 변동 이력" 테이블 추가
   - GRANT: 지급 (초록색)
   - USE: 사용 (빨간색)
   - REVOKE: 회수 (노란색)

**수정 파일:**
- `src/v2/admin/pages/users/UserDetailDrawer.tsx`

### 검증
- 유저 상세 → 인벤토리 탭 하단에서 지급/사용/회수 로그 표시

---

## 02-01 - [FRONTEND] 어드민 페이지 허브화 및 레이아웃 최적화

### 증상
- 어드민 메뉴가 8개 이상으로 분산되어 운영 인지 부하 증가 및 접근성 저하
- 신규 탭 시스템 도입 시, 하위 페이지의 기존 Header와 가변 Padding이 '상자 안의 상자' 효과를 유발하여 화면 공간 낭비

### 해결
1. **허브 페이지 생성**: `ControlCenterPage.tsx`, `SystemSecurityPage.tsx`를 생성하여 8개의 기능을 2개의 허브로 집약.
2. **레이아웃 제거**: 통합된 하위 8개 페이지에서 개별 `<h1>`, `Description`, `min-h-screen`, `p-6` 클래스를 제거하여 탭 컨테이너에 자연스럽게 녹아들도록 수정.

**수정 파일:**
- `src/v2/admin/pages/dashboard/OpsDashboard.tsx`
- `src/v2/admin/pages/dashboard/CrisisRadarPage.tsx`
- `src/v2/admin/pages/dashboard/GoldenRealTimePage.tsx`
- `src/v2/admin/pages/economy/CircuitBreakerPage.tsx`
- `src/v2/admin/pages/economy/LatencySurvivalPage.tsx`
- `src/v2/admin/pages/ops/CSVImportPage.tsx`
- `src/v2/admin/pages/ops/AuditLogPage.tsx`

### 검증
- `/admin/control` 및 `/admin/system` 탭 전환 시 헤더 중복 없이 깔끔한 UI 확인

---

## 변경 이력
| 날짜 | 이슈 | 담당 |
|------|------|------|
| 02-01 | MissionManagerPage 대규모 리팩토링 (90% 감소) | Copilot |
| 01-31 | 금고 내역 차감 누락 | Copilot |
| 01-31 | 게임 로그 UI 추가 | Copilot |
| 01-31 | 인벤토리 로그 UI 추가 | Copilot |
| 02-01 | 어드민 페이지 허브화 및 최적화 | Copilot |
