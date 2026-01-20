# V2 스트릭 모달 검증 결과 (최종 완료)

## ✅ 전체 작업 완료 상태

### 1. v1 로직을 v2 API로 교체 ✅
- `V2StreakModalContainer`에서 `useV2StreakRules`, `useV2ClaimStreakReward` 사용
- 백엔드 v2 API (`/api/v2/mission/streak/rules`, `/api/v2/mission/streak/claim`) 연동 완료

### 2. v2 미션 페이지 통합 ✅
- **V2AppHeader** 생성 완료 (`src/v2/components/layout/V2AppHeader.tsx`)
- `useV2Missions()` hook으로 스트릭 정보 자동 조회
- 자동 모달 노출 로직 구현:
  - 어드민 강제 노출 (`showModalOverride === "STREAK_ATTENDANCE"`)
  - 클레임 가능 시 자동 노출 (`claimable_rewards` 존재 시)

### 3. 어드민 모달 관리 기능 연동 ✅
- **ModalVisibilityPage**에 `attendance_streak_enabled` 토글 존재 확인
- **V2AppHeader**에서 `useModalVisibility()` 적용
- 어드민에서 OFF 시 v2 스트릭 모달 완전 차단 구현

### 4. 어드민 스트릭 보상 관리 ✅
- **StreakRewardsAdminPage** 기존 존재 (v1/v2 공용)
- `ui_config.streak_reward_rules`로 Day 3, Day 7 보상 설정 가능
- v2 API가 동일한 설정 참조 (`UiConfigService.get(db, "streak_reward_rules")`)

---

## 📁 생성된 파일

### V2 컴포넌트
```
src/v2/components/
├── mission/
│   ├── V2AttendanceStreakModal.tsx    # 메인 모달 UI (v1 디자인)
│   ├── V2StreakModal.tsx               # Wrapper
│   ├── V2StreakModalContainer.tsx      # Hooks 연결
│   └── index.ts                        # Export barrel
└── layout/
    └── V2AppHeader.tsx                 # 어드민 연동 헤더
```

---

## ✅ 임포트 경로 검증 완료

### 수정된 경로
- `Button`: `@/components/common/Button` (tsconfig paths)
- `tryHaptic`: `@/utils/haptics`

---

## ✅ 스키마 타입 일치 검증 완료

### 백엔드 응답 구조 (Python)
```python
# app/v2/api/routes.py - GET /api/v2/mission/streak/rules
return [
    {
        "day": 3,
        "enabled": True,
        "grants": [
            {"kind": "WALLET", "token_type": "ROULETTE_COIN", "amount": 1},
            {"kind": "WALLET", "token_type": "DICE_TOKEN", "amount": 1},
            {"kind": "WALLET", "token_type": "LOTTERY_TICKET", "amount": 1},
        ],
    },
    {"day": 7, "enabled": True, "grants": [{"kind": "INVENTORY", "item_type": "DIAMOND", "amount": 1}]},
]
```

### 프론트엔드 타입 (TypeScript)
```typescript
// src/v2/api/missionApi.ts
export interface V2StreakRule {
  readonly day: number;
  readonly enabled: boolean;
  readonly grants: Array<{
    readonly kind: "WALLET" | "INVENTORY";
    readonly token_type?: string;
    readonly item_type?: string;
    readonly amount: number;
  }>;
}
```

**결과**: 100% 일치 ✅

---

## ✅ 어드민 연동 상세

### 모달 노출 제어 (`ModalVisibilityPage`)
```typescript
// src/admin/pages/ModalVisibilityPage.tsx
const toggles = [
    { key: "attendance_streak_enabled", label: "출석 스트릭 (Streak)" },
    // ... 기타 모달들
];
```

### V2AppHeader 연동 로직
```typescript
// src/v2/components/layout/V2AppHeader.tsx
const { attendance_streak_enabled } = useModalVisibility();

useEffect(() => {
    if (!attendance_streak_enabled) return; // 어드민 OFF 시 무시

    // 1. 어드민 강제 노출
    if (showModalOverride === "STREAK_ATTENDANCE") {
        const key = `forced_modal_${showModalOverride}`;
        if (!sessionStorage.getItem(key)) {
            setIsStreakModalOpen(true);
            sessionStorage.setItem(key, "true");
        }
    }
    // 2. 자동 노출 (클레임 가능)
    else if (hasClaimable && claimableDay) {
        const key = `v2_streak_claim_shown_${claimableDay}`;
        if (!sessionStorage.getItem(key)) {
            setIsStreakModalOpen(true);
            sessionStorage.setItem(key, "true");
        }
    }
}, [showModalOverride, streakInfo?.claimable_rewards, attendance_streak_enabled]);

// 렌더링
{attendance_streak_enabled && isStreakModalOpen && streakInfo && (
    <V2StreakModalContainer
        open={isStreakModalOpen}
        onClose={() => setIsStreakModalOpen(false)}
        currentStreak={streakInfo.current_streak ?? 0}
        claimableDay={streakInfo.claimable_rewards?.[0] ?? null}
    />
)}
```

### 스트릭 보상 설정 (`StreakRewardsAdminPage`)
- **경로**: `/admin/streak-rewards`
- **설정 키**: `ui_config.streak_reward_rules`
- **v1/v2 공용**: 동일한 UiConfig 참조
- **기능**:
  - Day 3, Day 7 등 마일스톤별 보상 설정
  - 토큰 종류/개수 동적 변경
  - 보상 지급 이력 조회

---

## 🎯 작업 완료 체크리스트

- [x] 임포트 경로 절대경로(@/) 변경
- [x] 백엔드 응답 스키마와 프론트 타입 100% 일치
- [x] 중복 타입 정의 제거 (V2StreakRule로 통일)
- [x] 용어 일관성 확인 (camelCase, snake_case)
- [x] Export barrel 패턴 적용
- [x] Container 패턴으로 hooks 분리
- [x] v1 디자인 100% 보존
- [x] **v2 미션 페이지 통합 (V2AppHeader)**
- [x] **어드민 모달 노출 제어 연동**
- [x] **어드민 스트릭 보상 설정 확인**
- [x] 스타일/UX 검증 (v1과 동일)

---

## 🚀 사용 방법

### 1. V2 페이지에서 사용
```typescript
// src/v2/pages/HomePage.tsx (예시)
import V2AppHeader from '@/v2/components/layout/V2AppHeader';

function V2HomePage() {
  return (
    <>
      <V2AppHeader /> {/* 자동으로 스트릭 모달 처리 */}
      {/* 페이지 컨텐츠 */}
    </>
  );
}
```

### 2. 개별 모달만 사용
```typescript
import { V2StreakModalContainer } from '@/v2/components/mission';

<V2StreakModalContainer
  open={isOpen}
  onClose={() => setIsOpen(false)}
  currentStreak={5}
  claimableDay={3}
/>
```

### 3. 어드민 제어
1. **노출 ON/OFF**: `/admin/modal-visibility` → "출석 스트릭 (Streak)" 토글
2. **보상 설정**: `/admin/streak-rewards` → Day별 보상 편집
3. **강제 노출**: Vault API `showModalOverride: "STREAK_ATTENDANCE"` 설정

---

## 🔍 테스트 시나리오

### 시나리오 1: 정상 클레임
1. 유저가 3일 연속 플레이 (스트릭 3달성)
2. V2AppHeader에서 `claimable_rewards: [3]` 감지
3. 자동으로 V2StreakModal 노출
4. "오늘의 보상 받기" 버튼 클릭
5. `/api/v2/mission/streak/claim` 호출 → 성공
6. 토큰 지급 + 모달 닫힘

### 시나리오 2: 어드민 강제 노출
1. 어드민이 Vault `showModalOverride: "STREAK_ATTENDANCE"` 설정
2. 유저 접속 시 스트릭 무관하게 모달 노출
3. 세션 키로 중복 노출 방지

### 시나리오 3: 어드민 OFF
1. `/admin/modal-visibility`에서 "출석 스트릭" OFF
2. 모든 유저에게 스트릭 모달 미노출
3. Vault API 호출은 정상 동작 (프론트만 차단)

---

## 📊 최종 상태 요약

| 항목 | v1 | v2 | 상태 |
|------|----|----|------|
| API 엔드포인트 | `/api/mission/streak/*` | `/api/v2/mission/streak/*` | ✅ 분리 |
| 모달 컴포넌트 | `AttendanceStreakModal` | `V2AttendanceStreakModal` | ✅ 복사 |
| Hooks | `useMissionStore` | `useV2Missions` | ✅ 분리 |
| 헤더 통합 | `AppHeader` | `V2AppHeader` | ✅ 완료 |
| 어드민 제어 | ✅ 동일 | ✅ 동일 | ✅ 공유 |
| 스타일/UX | ✅ 원본 | ✅ 동일 | ✅ 100% 일치 |

---

## 🎉 결론

**v1의 연속스트릭 모달을 v2로 완전히 이관 완료!**

- ✅ 백엔드 v2 API 사용
- ✅ 프론트 v2 컴포넌트/Hooks 분리
- ✅ 어드민 모달 관리 기능 완전 연동
- ✅ v1과 동일한 UX 유지
- ✅ v1/v2 독립적 운영 가능

추가 작업이 필요하면 요청해주세요!

## ✅ 임포트 경로 검증 완료

### 수정된 경로
- `Button`: `../../../components/common/Button` → `@/components/common/Button` (tsconfig paths 사용)
- `tryHaptic`: `../../../utils/haptics` → `@/utils/haptics`

### 경로 맵
```typescript
// tsconfig.json에 정의됨
"paths": {
  "@/*": ["./src/*"],
  "@/v2/*": ["./src/v2/*"]
}
```

---

## ✅ 스키마 타입 일치 검증 완료

### 백엔드 응답 구조 (Python)
```python
# app/v2/api/routes.py - GET /api/v2/mission/streak/rules
return [
    {
        "day": 3,
        "enabled": True,
        "grants": [
            {"kind": "WALLET", "token_type": "ROULETTE_COIN", "amount": 1},
            {"kind": "WALLET", "token_type": "DICE_TOKEN", "amount": 1},
            {"kind": "WALLET", "token_type": "LOTTERY_TICKET", "amount": 1},
        ],
    },
    {"day": 7, "enabled": True, "grants": [{"kind": "INVENTORY", "item_type": "DIAMOND", "amount": 1}]},
]
```

### 프론트엔드 타입 (TypeScript)
```typescript
// src/v2/api/missionApi.ts
export interface V2StreakRule {
  readonly day: number;
  readonly enabled: boolean;
  readonly grants: Array<{
    readonly kind: "WALLET" | "INVENTORY";
    readonly token_type?: string;
    readonly item_type?: string;
    readonly amount: number;
  }>;
}
```

**결과**: 100% 일치 ✅

---

## ✅ 컴포넌트 타입 통일 완료

### 수정 전 (중복 정의)
- `V2AttendanceStreakModal.tsx`: 내부에 `Reward`, `Rule` 인터페이스 정의
- `V2StreakModal.tsx`: 별도로 `StreakRule` 인터페이스 정의
- `missionApi.ts`: `any[]` 타입 사용

### 수정 후 (단일 SoT)
- **모든 컴포넌트가 `V2StreakRule` 타입 import**
- 중복 정의 제거
- API 응답 타입 명확화

```typescript
// V2AttendanceStreakModal.tsx
import type { V2StreakRule } from '../../api/missionApi';

// V2StreakModal.tsx
import type { V2StreakRule } from '../../api/missionApi';

// V2StreakModalContainer.tsx
// hooks에서 자동으로 V2StreakRule[] 반환
```

---

## ✅ 용어 통일 검증

### 백엔드 ↔ 프론트엔드 용어 매칭

| 항목 | 백엔드 (Python) | 프론트엔드 (TS) | 상태 |
|------|----------------|-----------------|------|
| 스트릭 일수 | `play_streak` | `currentStreak` | ✅ Props 레벨에서 변환 |
| 클레임 가능 일 | `claimable_day` | `claimableDay` | ✅ camelCase 통일 |
| 보상 종류 | `kind: "WALLET" \| "INVENTORY"` | `kind: "WALLET" \| "INVENTORY"` | ✅ 동일 |
| 토큰 타입 | `token_type` | `token_type` | ✅ 동일 |
| 아이템 타입 | `item_type` | `item_type` | ✅ 동일 |

---

## ✅ 파일 구조

```
src/v2/components/mission/
├── V2AttendanceStreakModal.tsx    # 메인 모달 UI (v1 디자인 유지)
├── V2StreakModal.tsx               # Wrapper 컴포넌트
├── V2StreakModalContainer.tsx      # Hooks 연결 Container
└── index.ts                        # Export barrel

src/v2/api/
└── missionApi.ts                   # V2StreakRule 타입 정의 + API 함수

src/v2/hooks/
└── useV2Mission.ts                 # useV2StreakRules, useV2ClaimStreakReward
```

---

## ✅ 사용 예시

```typescript
import { V2StreakModalContainer } from '@/v2/components/mission';

function MyPage() {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <V2StreakModalContainer
      open={isOpen}
      onClose={() => setIsOpen(false)}
      currentStreak={5}        // user.play_streak
      claimableDay={3}         // service.get_pending_streak_milestone()
    />
  );
}
```

---

## 🔍 검증 완료 체크리스트

- [x] 임포트 경로 절대경로(@/) 변경
- [x] 백엔드 응답 스키마와 프론트 타입 100% 일치
- [x] 중복 타입 정의 제거 (V2StreakRule로 통일)
- [x] 용어 일관성 확인 (camelCase, snake_case 적재적소)
- [x] Export barrel 패턴 적용
- [x] Container 패턴으로 hooks 분리
- [x] v1 디자인 100% 보존

---

## 🚀 다음 단계

v2 미션 페이지에서 다음과 같이 사용:

```typescript
// src/v2/pages/MissionPage.tsx
import { V2StreakModalContainer } from '@/v2/components/mission';
import { useV2Missions } from '@/v2/hooks/useV2Mission';

const { data } = useV2Missions();
const streakInfo = data?.streak_info;

<V2StreakModalContainer
  open={showStreakModal}
  onClose={() => setShowStreakModal(false)}
  currentStreak={streakInfo?.current_streak ?? 0}
  claimableDay={streakInfo?.claimable_rewards?.[0] ?? null}
/>
```
