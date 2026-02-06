# 스트릭 클레임 버튼 미표시 문제 해결

**일자**: 2026-02-04  
**보고자**: 관리자  
**상태**: ✅ 해결됨

## 증상 (Symptom)
- 백엔드: Day 1-7 스트릭 보상 규칙 모두 설정됨
- 백엔드: `claimable_day=2`, `claimable_rewards=[2]` 정상 반환
- 프론트엔드: 스트릭 클레임 버튼 표시되지 않음

## 원인 분석 (Root Cause)

### 백엔드 응답 구조
```python
# app/v2/schemas/v2_mission.py
class StreakInfoSchema(BaseModel):
    current_streak: int = 0
    current_multiplier: float
    is_hot: bool
    is_legend: bool
    next_milestone: int
    claimable_day: Optional[int] = None  # ← 클레임 가능한 Day
    claimable_rewards: list[int] = Field(default_factory=list)  # ← Day 리스트
```

### 프론트엔드 매핑 오류

#### 문제 1: `StreakInfoDto`에 `claimable_day` 필드 누락
```typescript
// src/v2/api/missionApi.ts (AS-IS)
export interface StreakInfoDto {
  readonly current_streak: number;
  readonly today_completed: boolean;
  readonly last_completed_date: string | null;
  readonly claimable_rewards: number[];  // ❌ claimable_day 없음
}
```

#### 문제 2: `MissionsPage.tsx`에서 잘못된 필드 사용
```typescript
// src/v2/pages/missions/MissionsPage.tsx (AS-IS)
const claimableDay = streak_info?.claimable_rewards?.[0] ?? null;
// ❌ claimable_rewards 배열의 첫 번째 값을 사용 → 잘못됨
```

#### 문제 3: `V2AppHeader.tsx`도 동일한 오류
```typescript
// src/v2/components/layout/V2AppHeader.tsx (AS-IS)
const claimableDay = streakInfo?.claimable_rewards?.[0] ?? null;
const hasClaimable = (streakInfo?.claimable_rewards?.length ?? 0) > 0;
// ❌ 동일한 오류
```

## 해결 방법 (Solution)

### 1. `StreakInfoDto`에 `claimable_day` 필드 추가
```typescript
// src/v2/api/missionApi.ts (TO-BE)
export interface StreakInfoDto {
  readonly current_streak: number;
  readonly today_completed: boolean;
  readonly last_completed_date: string | null;
  readonly claimable_day?: number | null;  // ✅ 추가
  readonly claimable_rewards: number[];
}
```

### 2. `mapBackendStreakInfo` 함수 수정
```typescript
// src/v2/api/missionApi.ts (TO-BE)
const mapBackendStreakInfo = (
  info: BackendStreakInfoSchema | null | undefined,
): StreakInfoDto => {
  const currentStreak = info?.current_streak ?? info?.streak_days ?? 0;
  const claimableDay = info?.claimable_day ?? null;
  const claimableRewards =
    info?.claimable_rewards && info.claimable_rewards.length > 0
      ? info.claimable_rewards
      : claimableDay
        ? [claimableDay]
        : [];

  return {
    current_streak: currentStreak,
    today_completed: false,
    last_completed_date: null,
    claimable_day: claimableDay,  // ✅ 추가
    claimable_rewards: claimableRewards,
  };
};
```

### 3. `MissionsPage.tsx` 수정
```typescript
// src/v2/pages/missions/MissionsPage.tsx (TO-BE)
const { missions = [], streak_info } = data || {};
const claimableDay = streak_info?.claimable_day ?? null;  // ✅ 수정
```

### 4. `V2AppHeader.tsx` 수정
```typescript
// src/v2/components/layout/V2AppHeader.tsx (TO-BE)
const streakInfo = missionsData?.streak_info;
const claimableDay = streakInfo?.claimable_day ?? null;  // ✅ 수정
const hasClaimable = claimableDay !== null;  // ✅ 수정
```

## 검증 (Verification)

### 백엔드 테스트
```bash
$ docker compose exec backend python app/tests/test_v2_streak_claim.py

✅ V2User 확인:
   - user_id: 1
   - play_streak: 2

✅ Streak Info:
   - current_streak: 2
   - claimable_day: 2
   - claimable_rewards: [2]

✅ 클레임 버튼 활성화 조건 충족!
   - Day 2 보상 클레임 가능
```

### 프론트엔드 빌드
```bash
$ npm run build
✅ 빌드 성공! (타입 에러 0개)
```

## 영향 범위 (Impact)
- **수정 파일**:
  - `src/v2/api/missionApi.ts`
  - `src/v2/pages/missions/MissionsPage.tsx`
  - `src/v2/components/layout/V2AppHeader.tsx`
  - `app/tests/test_v2_streak_claim.py` (신규)

- **테스트 필요**:
  - [ ] 미션 페이지에서 스트릭 클레임 버튼 표시 확인
  - [ ] V2AppHeader에서 자동 모달 팝업 확인
  - [ ] 클레임 후 버튼 비활성화 확인

## 교훈 (Lessons Learned)
1. **백엔드 스키마와 프론트엔드 타입의 일관성**: `claimable_day`는 백엔드 스키마에 존재했지만, 프론트엔드 타입에 누락되어 있었음
2. **배열 인덱스 접근의 위험성**: `claimable_rewards[0]`는 의미상 `claimable_day`와 다름 (배열은 여러 개의 클레임 가능한 Day를 나타냄)
3. **타입 안전성**: TypeScript는 `claimable_day` 필드가 없어도 에러를 발생시키지 않았음 (`?.` 연산자 사용 시)
4. **백엔드 테스트의 중요성**: 백엔드가 올바른 데이터를 반환하는지 먼저 확인하여 프론트엔드 문제임을 빠르게 파악

## 관련 문서
- [V2 Mission Troubleshooting](./W06_MISSION_troubleshooting.md)
- [Streak Reward Rules SoT](../00_sot_meta/00_A_sot_code_ops_chk/learned_/mission/09.mission.md)
