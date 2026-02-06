문서 타입: 기술설계서/변경로그
버전: v1.0
작성일: 2026-01-22
작성자: GitHub Copilot
대상: BE/FE 개발자
상태: 구현 예정

# Mission System Timezone & Reward Logic Fix - Technical Design

**Document ID**: `TECH-20260122-MISSION-TZ-FIX`  
**Date**: 2026-01-22  
**Status**: 🔵 Planning → Implementation Ready  
**Priority**: 🔴 Critical (User-Facing Revenue Impact)

---

## 1. Background & Problem Statement

### 1.1 User-Reported Issues

사용자들이 미션 시스템에서 다음과 같은 반복적 오류를 보고:

1. **재방문 시 보상 버튼 비활성화** (일일/스트릭 미션)
   - 자정 이후 재방문 시 미션은 어제 상태인데 로그인만 오늘로 체크되어 버튼 먹통
   - 오전 9시 이전 접속 시 "보상 받기" 버튼이 비활성화 상태로 고정

2. **텔레그램 채널/공유 보상 미지급**
   - 채널 가입 후 "확인" 버튼 클릭해도 미션 진행도가 올라가지 않음
   - API 호출은 성공하지만 DB 업데이트 실패

3. **완료 후 버튼 정체**
   - 미션 완료 후에도 UI에 반영 안 됨
   - 수동 새로고침 필요

### 1.2 Root Cause Analysis

#### Issue #1: Split-Brain Reset Logic
```python
# mission.py (API Layer) - 자정 기준
if last_login_kst.date() < today_kst_date:  # Midnight rollover
    MissionService(db).update_progress(user_id, "LOGIN", 1)

# mission_service.py - 오전 9시 기준  
def _operational_play_date(self, now_tz: datetime) -> date:
    if now_tz.hour < 9:  # Before 9AM
        return today - timedelta(days=1)
```

**문제**: 자정~오전9시 사이 로그인 시 `LOGIN` 미션은 "오늘"로 업데이트되지만, 미션 리셋은 "어제" 기준이라 `reset_date` 불일치 발생.

#### Issue #2: Action Type Mismatch
```python
# seed_missions_v2.py
{"action_type": "SUBSCRIBE_CHANNEL", ...}

# viral.py (API)
ms.update_progress(user_id, "JOIN_CHANNEL", 1)
```

**문제**: DB에 저장된 키와 API 호출 키가 달라 `update_progress`가 매칭 실패.

#### Issue #3: Static UI State
- `MissionsPage.tsx`가 하드코딩된 목데이터 사용
- Claim 후 폴링/refetch 없음

---

## 2. Technical Solution Design

### 2.1 Timezone Independence Strategy

#### Principle: "Server Time is Irrelevant to Business Logic"

서버의 시스템 시간(UTC/PST/etc)과 무관하게 **모든 비즈니스 로직은 KST 기준**으로 동작해야 함.

##### Implementation Rules

1. **Timezone-Aware Objects Only**
   ```python
   # ❌ BAD - Naive datetime (서버 시간에 종속)
   now = datetime.now()
   
   # ✅ GOOD - Timezone-aware
   from zoneinfo import ZoneInfo
   now_kst = datetime.now(ZoneInfo("Asia/Seoul"))
   ```

2. **Centralized Operational Day Calculation**
   ```python
   # MissionService 내부에서만 계산
   def _operational_play_date(self, now_tz: datetime) -> date:
       """현재 운영일 반환 (9AM KST reset)"""
       reset_hour = self.settings.streak_day_reset_hour_kst  # Default: 9
       today = now_tz.date()
       if now_tz.hour < reset_hour:
           return today - timedelta(days=1)
       return today
   ```

3. **No Direct Timezone Calculation in API Layer**
   - API routes는 `MissionService`에 위임만
   - 날짜 계산 로직 중복 금지

### 2.2 Unified Reset Logic

#### Code Changes

**File: `app/api/routes/mission.py`**
```python
# Before
if last_login_kst.date() < today_kst_date:
    MissionService(db).update_progress(user_id, "LOGIN", 1)

# After - Delegate to MissionService
service = MissionService(db)
op_date = service._operational_play_date(service._now_tz())

if last_login and last_login.date() < op_date:
    service.update_progress(user_id, "LOGIN", 1)
```

### 2.3 Action Type Normalization

#### Strategy: Canonical Mapping

```python
# mission_service.py
ACTION_TYPE_ALIASES = {
    "JOIN_CHANNEL": ["SUBSCRIBE_CHANNEL", "CHANNEL_JOIN"],
    "SHARE_STORY": ["SHARE", "STORY_SHARE"],
    "PLAY_GAME": ["PLAY"],
}

def _normalize_action_type(self, action: str) -> list[str]:
    """액션 타입과 그 동의어들을 모두 반환"""
    if action in ACTION_TYPE_ALIASES:
        return [action] + ACTION_TYPE_ALIASES[action]
    
    # Reverse lookup
    for canonical, aliases in ACTION_TYPE_ALIASES.items():
        if action in aliases:
            return [canonical] + aliases
    
    return [action]

def update_progress(self, user_id: int, action_type: str, delta: int = 1):
    action_variants = self._normalize_action_type(action_type)
    
    missions = self.db.query(Mission).filter(
        Mission.action_type.in_(action_variants),  # ✅ Match any variant
        Mission.is_active == True
    ).all()
    # ...
```

### 2.4 Frontend Real-Time Binding

**File: `src/v2/pages/missions/MissionsPage.tsx`**

```tsx
// Before - Static mock
const missions = MOCK_MISSIONS;

// After - Real-time API
const { data, refetch } = useV2Missions();
const claimMutation = useV2ClaimMission({
  onSuccess: () => {
    refetch();  // Auto-refresh after claim
    toast.success("보상을 받았습니다!");
  }
});

const handleClaim = (missionId: number) => {
  claimMutation.mutate({ missionId });
};
```

---

## 3. Implementation Phases

### Phase 1: Backend Core Logic (Priority 1)
- Add `ACTION_TYPE_ALIASES` to `mission_service.py`
- Implement `_normalize_action_type()` method
- Update `mission.py` lazy login check to use operational day
- Add unit tests for normalization

### Phase 2: Frontend Integration (Priority 2)
- Replace mock with `useV2Missions` hook
- Implement claim mutation with auto-refetch
- Add loading/error states

### Phase 3: Verification (Priority 3)
- Test 8:59 AM / 9:01 AM boundary cases
- Verify Telegram mission completion
- E2E claim flow validation

---

## 4. Success Metrics

- **Reward Claim Success Rate**: 95% → 99%+
- **9AM Reset Edge Case Failures**: 0 incidents
- **Telegram Mission Completion**: +50% increase
- **User Support Tickets (Mission)**: -80% reduction

---

## 5. References

- `docs/06_ops/202601/도파민2차/[20261월첫째주] daily_mission_system_ko_v5.md`
- `app/core/config.py` (Line 23: `timezone: "Asia/Seoul"`)
- `app/services/mission_service.py` (Lines 25-42: Operational Day Logic)

---

## 6. 변경 이력
- v1.0 (2026-01-22, GitHub Copilot): 최초 작성
