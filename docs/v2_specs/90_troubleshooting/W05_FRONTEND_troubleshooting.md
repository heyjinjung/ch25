# W05 FRONTEND 트러블슈팅 (01-27 ~ 02-02)

## 02-02 - [FRONTEND/ADMIN] 회원관리 테이블 정렬 기능 확장 (UID, 닉네임, 텔레그램 ID)

### 증상 정의
| 항목 | 내용 |
|---|---|
| 대상 기능 | V2 관리자 회원관리 페이지 (`UserListPage`) |
| HTTP Status | N/A (신규 기능) |
| 영향 범위 | 어드민 UX 개선 |
| 재현 빈도 | N/A |

### 배경 (Why)
- 기존 정렬 옵션: `level(레벨)`, `vault_balance(금고 잔액)`, `last_active(최근 접속일)`, `created_at(생성일)`만 지원
- 사용자 요청: `uid(UID/CC ID)`, `nickname(닉네임)`, `telegram_id(텔레그램 ID)` 칼럼도 정렬 가능하도록 확장 필요
- 회원 관리 시 특정 필드로 검색/정렬하는 행정 작업 효율성 향상

### 해결 방법 (What)

#### 1. 프론트엔드 변경
```typescript
// 1) sortBy 상태 타입 확장
const [sortBy, setSortBy] = useState<
  "last_active" | "level" | "vault_balance" | "created_at" | "uid" | "nickname" | "telegram_id"
>("last_active");

// 2) handleSort 함수 타입 확장
const handleSort = (
  field: "last_active" | "level" | "vault_balance" | "created_at" | "uid" | "nickname" | "telegram_id"
) => {
  if (sortBy === field) {
    setSortOrder(sortOrder === "asc" ? "desc" : "asc");
  } else {
    setSortBy(field);
    setSortOrder("desc");
  }
};

// 3) 테이블 헤더에 클릭 가능한 정렬 버튼 추가
<TableHead className="w-[100px] text-zinc-400">
  <button
    className="flex items-center gap-1 hover:text-white transition-colors"
    onClick={() => handleSort("uid")}
  >
    UID
    <ArrowUpDown className="w-3 h-3" />
  </button>
</TableHead>

<TableHead className="text-zinc-400">
  <button
    className="flex items-center gap-1 hover:text-white transition-colors"
    onClick={() => handleSort("nickname")}
  >
    닉네임
    <ArrowUpDown className="w-3 h-3" />
  </button>
</TableHead>

<TableHead className="text-zinc-400">
  <button
    className="flex items-center gap-1 hover:text-white transition-colors"
    onClick={() => handleSort("telegram_id")}
  >
    텔레그램 ID
    <ArrowUpDown className="w-3 h-3" />
  </button>
</TableHead>
```

#### 2. TypeScript 타입 정의 변경
**파일:** `src/v2/api/adminApi.ts`
```typescript
export interface UserSearchParams {
  search?: string;
  status?: string;
  minLevel?: number;
  maxLevel?: number;
  sortBy?: "last_active" | "level" | "vault_balance" | "created_at" | "uid" | "nickname" | "telegram_id";
  sortOrder?: "asc" | "desc";
  page?: number;
  limit?: number;
}
```

#### 3. 백엔드 쿼리 로직 확장
**파일:** `app/v2/api/admin/user_routes.py`
```python
if sortBy == "vault_balance":
    order_col = func.coalesce(V2User.vault_locked_balance, 0)
elif sortBy == "created_at":
    order_col = V2User.created_at
elif sortBy == "uid":
    order_col = V2User.id
elif sortBy == "nickname":
    order_col = V2User.nickname
elif sortBy == "telegram_id":
    order_col = V2User.telegram_id
else:
    order_col = V2User.updated_at

if sortOrder == "asc":
    query = query.order_by(order_col.asc())
else:
    query = query.order_by(order_col.desc())
```

### 동작 흐름

| 단계 | 사용자 액션 | 시스템 응답 |
|------|-----------|---------|
| 1 | UID 헤더 클릭 | `sortBy="uid"`, `sortOrder="desc"` 적용 |
| 2 | UID 헤더 재클릭 | 정렬 방향 토글 (`desc` → `asc`) |
| 3 | 닉네임 헤더 클릭 | `sortBy="nickname"` 변경, `sortOrder="desc"` 리셋 |
| 4 | API 호출 | `/users?sortBy=uid&sortOrder=desc...` 백엔드 쿼리 실행 |
| 5 | 테이블 갱신 | 정렬된 회원 목록 렌더링 |

### 검증 방법
```bash
# 1. 프론트엔드 타입 체크
npx tsc --noEmit

# 2. 빌드 테스트
npm run build

# 3. 로컬 브라우저 테스트
# - 관리자 로그인
# - 회원관리 페이지 진입
# - UID, 닉네임, 텔레그램 ID 헤더 클릭 및 정렬 동작 확인
# - 오름차순/내림차순 토글 확인
```

### 영향받는 파일

**수정:**
- `src/v2/admin/pages/users/UserListPage.tsx` - `sortBy` 상태, `handleSort` 함수, 테이블 헤더 업데이트
- `src/v2/api/adminApi.ts` - `UserSearchParams` 인터페이스 타입 확장
- `app/v2/api/admin/user_routes.py` - SQLAlchemy 쿼리 로직 확장

### 관련 문서
- learned_ 프론트엔드 도메인: `docs/v2_specs/00_sot_meta/00_A_sot_code_ops_chk/learned_/frontend/` (해당 문서 참조)
- 어드민 UX 설계 원칙: React Admin 패턴

---

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
| 01-20 | 무한 리다이렉트 루프 (Redirect Loop) | ✅ FIXED |
| 01-20 | 대시보드 런타임 크래시 (toLocaleString) | ✅ FIXED |
| 01-20 | 빌드 에러 (TS6133: Unused React) | ✅ FIXED |
---

## 01-20 - [FRONTEND/LOGIN] 무한 리다이렉트 루프 (Infinite Redirect Loop)

**우선순위**: P1
**관련 도메인**: FRONTEND, ADMIN

### 증상
- 로그인 후 대시보드 진입 시 URL이 `/v2/admin/login/dashboard/dashboard...` 형태로 무한 반복되며 브라우저 멈춤.

### 근본 원인
- `OpsDashboard.tsx` 또는 퀵 액션 버튼의 `navigate` 경로 설정 오류.
- V1 Admin Router(`/admin/*`) 경로로 진입하여 메인 라우터와 리다이렉트 경합 발생.

### 해결 조치
- 모든 내부 링크 경로를 V2 표준(`navigate("/v2/admin/...")`)으로 통일하여 수정.

### 검증 방법
- 로그인 후 대시보드 및 각 메뉴 이동 시 URL 정합성 확인.

---

## 01-20 - [FRONTEND/UI] 대시보드 및 유저 리스트 런타임 크래시 (toLocaleString)

**우선순위**: P1
**관련 도메인**: FRONTEND, BACKEND

### 증상
- 대시보드 로드 또는 유저 상세 드로어 오픈 시 흰 화면(White-out)과 함께 크래시 발생.
- 에러: `Cannot read properties of undefined (reading 'toLocaleString')`

### 근본 원인
- API 응답 데이터(`metrics`, `user.ticketBalance` 등)가 초기 로드 중이거나 값이 누락되어 `undefined` 상태일 때 방어 로직 없이 직접 메서드 호출.

### 해결 조치
- Optional Chaining(`?.`) 및 Nullish Coalescing(`??`) 연산자 적용.
- 예: `status?.metrics?.todayRevenue?.toLocaleString() ?? "0"`

### 검증 방법
- 데이터 로딩 중 또는 데이터가 비어있는 계정의 상세 정보를 열람하여 화면 크래시 여부 재확인.

---

## 01-20 - [FRONTEND/BUILD] 미사용 변수/임포트로 인한 빌드 실패 (TS6133)

**우선순위**: P2
**관련 도메인**: FRONTEND, DEVOPS

### 증상
- `npm run build` 중 `error TS6133: 'React' is declared but its value is never read` 발생 및 배포 중단.

### 근본 원인
- `tsconfig.json`의 `noUnusedLocals` 옵션이 활성화된 상태에서, JSX 변환 방식 변경으로 인해 명시적인 `import React`가 불필요해졌음에도 코드에 남아있어 발생.

### 해결 조치
- 사용되지 않는 `import React` 구문 제거 또는 타입 전용 임포트(`import type { FC } from 'react'`)로 변경.

### 검증 방법
- `npx tsc --noEmit` 실행하여 타입/린트 에러 0건 확인.

---

---

## 02-02 - [FRONTEND/API] CSV 업로드/검증 시 500 에러 (Multipart Boundary 누락)

### 증상 정의
| 항목 | 내용 |
|---|---|
| 대상 기능 | CSV 업로드 및 검증 API (`adminApi.ts`) |
| HTTP Status | 500 (Internal Server Error) |
| 영향 범위 | 어드민 CSV 임포트 기능 전체 |
| 재현 빈도 | 항상 |

### 근본 원인
- `adminApi.ts`에서 `FormData`를 전송할 때 `Content-Type: multipart/form-data` 헤더를 수동으로 설정함.
- 브라우저와 Axios는 `multipart/form-data` 전송 시 데이터 구분을 위한 `boundary` 문자열을 자동으로 생성하여 헤더에 포함해야 함 (예: `boundary=----WebKitFormBoundary...`).
- 수동 헤더 설정 시 이 `boundary` 정보가 누락되어 서버(FastAPI/Pydantic)에서 멀티파트 데이터를 정상적으로 파싱하지 못하고 500 에러를 반환함.

### 해결 방법
#### 1. 프론트엔드 수정
- `src/v2/api/adminApi.ts` 내 `validateCSVFile` 및 `uploadCSVFile` 함수에서 Axios 요청 옵션의 수동 `Content-Type` 헤더를 제거.
- Axios가 `FormData`를 감지하여 올바른 `Content-Type`과 `boundary`를 자동으로 설정하도록 수정.

```patch
- await v2Client.post("/api/v2/admin/csv-import/validate", formData, {
-   headers: { "Content-Type": "multipart/form-data" },
- });
+ await v2Client.post("/api/v2/admin/csv-import/validate", formData);
```

### 검증 방법
- 관리자 페이지에서 CSV 파일 선택 후 "내용 확인하기" 버튼 클릭.
- 네트워크 탭에서 요청 헤더의 `Content-Type`에 `boundary` 값이 포함되어 전송되는지 확인.
- 서버가 200 OK와 함께 검증 결과를 반환하는지 확인.

---

## 변경 이력
- 2026-01-31: W05 FRONTEND 문서 생성 및 초기 UI 로직 안정화
- 2026-02-01: MissionManagerPage 대규모 리팩토링 및 관심사 분리(SoC) 적용
- 2026-02-02: 프론트엔드 빌드 에러 해결 및 대시보드 UI 최적화 내역 추가 (Antigravity)
- 2026-02-02: 초기 구동 루프 및 방어적 코딩 사례 추가 (Antigravity)
- 2026-02-02: 어드민 대시보드 및 기능 확장 분류 내역 추가 (Antigravity)
- 2026-02-02: 회원관리 테이블 정렬 기능 확장 (UID/닉네임/텔레그램 ID) (GitHub Copilot)
- 2026-02-02: CSV 업로드/검증 500 에러 (Multipart Boundary 누락) 해결 (Antigravity)
