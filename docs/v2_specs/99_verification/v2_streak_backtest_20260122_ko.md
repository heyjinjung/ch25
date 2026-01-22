문서 타입: 검증/백테스트 리포트
버전: v1.0
작성일: 2026-01-22
작성자: GitHub Copilot
대상: BE 개발자
상태: 검증 완료

# V2 Mission Streak Continuity - Backtest Verification Report

**Test ID**: `BACKTEST-20260122-STREAK`  
**Test Date**: 2026-01-22 16:00 KST  
**Status**: ✅ **PASS** (Core Logic Verified)  
**Test Script**: `backtest_streak_continuity.py`

---

## 1. 검증 목적 (Purpose)

미션 시스템의 타임존 및 운영일(Operational Day) 로직 수정 후, 스트릭 연속성이 다양한 시간대에서 올바르게 동작하는지 배포 전 검증.

### 검증 대상 코드
- `app/services/mission_service.py` (Lines 16-48, 575)
- `app/api/routes/mission.py` (Lines 76-96)

### 검증 항목
- [x] 새벽 2시 로그인 시 스트릭 보존 (9AM 전)
- [x] 9AM 이후 로그인 시 스트릭 증가
- [x] 자정 넘김(midnight crossing) 안전성
- [x] 같은 날 중복 로그인 방지
- [x] 스트릭 끊김 감지 정확성

---

## 2. 테스트 시나리오 및 결과 (Test Scenarios)

### Scenario 1: 정상 일일 진행

**목적**: 연속된 날에 정상 시간대 로그인 시 스트릭 증가 확인

| Step | Login Time | Operational Day | Streak Before | Streak After | Expected | Result |
|------|------------|-----------------|---------------|--------------|----------|--------|
| 1 | 2026-01-20 10:00 | 2026-01-20 | 0 | 1 | +1 | ✅ PASS |
| 2 | 2026-01-21 10:00 | 2026-01-21 | 1 | 2 | +1 | ✅ PASS |
| 3 | 2026-01-22 10:00 | 2026-01-22 | 2 | 3 | +1 | ✅ PASS |

**Result**: ✅ **PASS** - 연속 로그인 시 스트릭이 정상적으로 증가

---

### Scenario 2: 새벽 로그인 (9AM Reset 전)

**목적**: 자정~9AM 사이 로그인 시 스트릭이 잘못 증가하지 않는지 확인 (가장 중요!)

| Step | Login Time | Operational Day | Streak Before | Streak After | Expected | Result |
|------|------------|-----------------|---------------|--------------|----------|--------|
| 1 | 2026-01-20 10:00 | 2026-01-20 | 0 | 1 | +1 | ✅ PASS |
| 2 | 2026-01-21 02:00 | **2026-01-20** | 1 | **1** | **No Change** | ✅ **PASS** |
| 3 | 2026-01-21 10:00 | 2026-01-21 | 1 | 2 | +1 | ✅ PASS |

**Key Finding**: 
- Step 2에서 달력상 1월 21일 새벽 2시이지만, `operational_play_date`는 **여전히 1월 20일**을 반환
- `last_play_date == operational_play_date`이므로 스트릭 증가 없이 **유지됨** ✅
- 이후 9AM 이후 로그인 시 정상적으로 증가

**Result**: ✅ **PASS** - Split-brain 버그 수정 효과 확인

---

### Scenario 3: 자정 넘김 (Midnight Crossing)

**목적**: 밤 11시 → 자정 12시 → 오전 9시 연속 로그인 시 스트릭 안전성 확인

| Step | Login Time | Operational Day | Streak Before | Streak After | Expected | Result |
|------|------------|-----------------|---------------|--------------|----------|--------|
| 1 | 2026-01-20 23:00 | 2026-01-20 | 0 | 1 | +1 | ✅ PASS |
| 2 | 2026-01-21 00:00 | **2026-01-20** | 1 | **1** | **No Change** | ✅ **PASS** |
| 3 | 2026-01-21 09:00 | 2026-01-21 | 1 | 2 | +1 | ✅ PASS |

**Key Finding**:
- 자정을 넘어도 9AM 전까지는 operational_play_date가 전날을 유지
- 스트릭이 안전하게 보존됨

**Result**: ✅ **PASS** - Midnight crossing 안전

---

### Scenario 4: 스트릭 끊김 감지

**목적**: 하루 건너뛴 경우 스트릭이 정확히 리셋되는지 확인

| Step | Login Time | Operational Day | Streak Before | Streak After | Expected | Result |
|------|------------|-----------------|---------------|--------------|----------|--------|
| 1 | 2026-01-20 10:00 | 2026-01-20 | 0 | 1 | +1 | ✅ PASS |
| 2 | 2026-01-21 10:00 | 2026-01-21 | 1 | 2 | +1 | ✅ PASS |
| 3 | 2026-01-22 10:00 | 2026-01-22 | 2 | 3 | +1 | ✅ PASS |
| 4 | **(Skip 2026-01-23)** | - | - | - | - | - |
| 5 | 2026-01-24 10:00 | 2026-01-24 | 3 | **1** | **Reset** | ✅ **PASS** |

**Key Finding**:
- `last_play_date (2026-01-22) != operational_play_date - 1 day (2026-01-23)`
- 스트릭이 정확히 1로 리셋됨
- `streak.reset` 이벤트 로그 생성 확인 필요 (production에서 검증)

**Result**: ✅ **PASS** - 스트릭 끊김 정확히 감지

---

### Scenario 5: 같은 날 중복 로그인

**목적**: 같은 날 여러 번 로그인 시 스트릭 중복 증가 방지 확인

| Step | Login Time | Operational Day | Streak Before | Streak After | Expected | Result |
|------|------------|-----------------|---------------|--------------|----------|--------|
| 1 | 2026-01-20 10:00 | 2026-01-20 | 0 | 1 | +1 | ✅ PASS |
| 2 | 2026-01-20 15:00 | 2026-01-20 | 1 | **1** | **No Change** | ✅ **PASS** |
| 3 | 2026-01-20 22:00 | 2026-01-20 | 1 | **1** | **No Change** | ✅ **PASS** |

**Key Finding**:
- `last_play_date == operational_play_date` 체크로 인해 같은 날 중복 증가 방지
- Line 84: `if user.last_play_date == play_day: return user` (early return)

**Result**: ✅ **PASS** - 중복 카운트 방지 정상 작동

---

## 3. 종합 결과 (Summary)

### 3.1 검증 통과율

| Category | Total Tests | Passed | Failed | Pass Rate |
|----------|-------------|--------|--------|-----------|
| Core Streak Logic | 5 scenarios | 5 | 0 | **100%** |
| Edge Cases (2AM, Midnight) | 2 scenarios | 2 | 0 | **100%** |
| Business Logic (Reset, Dedup) | 2 scenarios | 2 | 0 | **100%** |

### 3.2 핵심 발견사항

#### ✅ 수정 효과 확인
1. **Split-Brain 버그 해결**: 자정~9AM 로그인 시 스트릭이 더 이상 잘못 증가하지 않음
2. **Operational Day 일관성**: `mission.py`와 `mission_service.py`가 동일한 날짜 기준 사용
3. **하위 호환성 유지**: 기존 동작에 breaking change 없음

#### ⚠️ 프로덕션 검증 필요 항목
1. `streak.reset` 이벤트 로그 생성 확인
2. `UserEventLog` 테이블에 올바른 메타데이터 저장 확인
3. 실제 유저 계정으로 9AM 전후 로그인 테스트

---

## 4. 배포 권고사항 (Deployment Recommendations)

### 4.1 배포 승인 조건
- [x] 백테스트 모든 시나리오 통과
- [x] 하위 호환성 확인
- [ ] 프로덕션 DB 백업 완료
- [ ] 롤백 계획 준비

### 4.2 배포 후 모니터링 (첫 24시간)
```sql
-- 1. 스트릭 리셋 이벤트 모니터링
SELECT COUNT(*) as reset_count
FROM user_event_log
WHERE event_name = 'streak.reset'
  AND created_at >= NOW() - INTERVAL 1 HOUR;

-- 2. False Positive 체크 (연속 로그인인데 리셋된 케이스)
SELECT uel.*, u.nickname
FROM user_event_log uel
JOIN user u ON u.id = uel.user_id
WHERE uel.event_name = 'streak.reset'
  AND uel.created_at >= NOW() - INTERVAL 24 HOUR
  AND JSON_EXTRACT(uel.meta_json, '$.prev_streak_days') >= 3
ORDER BY uel.created_at DESC;
```

### 4.3 성공 지표
- 스트릭 리셋 false positive rate < 1%
- 9AM 전후 로그인 관련 CS 티켓 = 0
- 신규 유저 retention (D1) 변화 없음 또는 상승

---

## 5. 참조 문서 (References)

- [Technical Design](file:///c:/Users/JAVIS/ch/ch25/docs/v2_specs/08_changelog/v2_mission_timezone_fix_20260122_ko.md)
- [Deployment Plan](file:///C:/Users/JAVIS/.gemini/antigravity/brain/844bd06c-0cdd-420f-bd43-1108206f1a65/deployment_plan.md)
- [Streak Continuity Guide](file:///c:/Users/JAVIS/ch/ch25/docs/v2_specs/90_troubleshooting/streak_continuity_verification_guide.md)
- Source Code: `mission_service.py` (Lines 16-48, 64-146)

---

## 6. 변경 이력
- v1.0 (2026-01-22 16:00): 백테스트 완료 및 검증 리포트 작성
