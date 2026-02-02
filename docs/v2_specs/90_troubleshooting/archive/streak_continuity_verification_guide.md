# Streak Continuity Verification Script

**Purpose**: Critical validation to prevent user rage quits from streak reset bugs  
**Date**: 2026-01-22  
**Status**: Ready for Manual Testing

---

## Psychology of Streaks (User Retention Critical)

> "유저가 매일 접속하는 이유는 '연속 기록'에 대한 애착 때문입니다. 시스템 오류로 스트릭이 깨지면 유저는 '상실감'보다는 '배신감'을 느끼며, 이를 복구해주지 않을 경우 영구적으로 이탈(Rage Quit)합니다."

**Impact**: Streak bugs are NOT just technical issues—they are **trust-breaking betrayals** that cause permanent churn.

---

## Verification Checklist

### ✅ Core Architecture Validation (Completed)

- [x] `sync_play_streak()` uses `_operational_play_date()` (Line 75)
- [x] Streak calculation aligned with mission reset (9AM KST)
- [x] `streak.reset` event logs for observability (Lines 100-111)
- [x] Row-level locking prevents race conditions (Line 80: `with_for_update()`)

---

## Manual Test Scenarios (CRITICAL)

### Scenario C1: Normal Daily Progression
```
Day 1, 10:00 AM KST - First Login
Expected: play_streak = 1, last_play_date = Day 1

Day 2, 10:00 AM KST - Second Login
Expected: play_streak = 2, last_play_date = Day 2
```

### Scenario C2: Early Morning Login (Before 9AM Reset)
```
Day 2, 02:00 AM KST - Login before operational day rollover
Expected: 
- operational_play_date returns Day 1 (yesterday)
- play_streak STAYS 1 (no increment)
- last_play_date STAYS Day 1 (no update)
- User sees "yesterday's" missions still active

Day 2, 09:01 AM KST - Login after reset
Expected:
- operational_play_date returns Day 2 (today)
- play_streak increments to 2
- last_play_date updates to Day 2
```

**Why This Matters**: If 2AM login increments streak, then 9AM would see `last_play_date == operational_day` and skip increment, **breaking the streak**.

### Scenario C3: Late Night Edge Case
```
Day 3, 11:50 PM KST - Login before midnight
Expected: play_streak = 3, last_play_date = Day 3

Day 4, 12:01 AM KST - Login after calendar midnight but before 9AM
Expected: 
- play_streak STAYS 3 (operational day is still Day 3)
- last_play_date STAYS Day 3
- No streak break

Day 4, 09:01 AM KST - Login after operational reset
Expected: play_streak = 4
```

### Scenario C4: Streak Break Detection
```
Day 1, 10 AM: Login, streak = 1
Day 2, 10 AM: Login, streak = 2
Day 3, 10 AM: Login, streak = 3
[Skip Day 4 entirely]
Day 5, 10 AM: Login
Expected:
- play_streak resets to 1
- UserEventLog created with event_name = "streak.reset"
- meta_json includes prev_streak_days = 3
```

### Scenario C5: Multi-Session Same Day
```
Day 1, 10:00 AM: Login #1, streak = 1
Day 1, 15:00 PM: Logout and re-login
Expected:
- Line 84 check: last_play_date == play_day → return early
- play_streak STAYS 1 (no double-count)
```

### Scenario C6: Streak + Mission Cross-Feature Test
```
Day 1, 08:00 AM KST (before 9AM reset):
- Complete "Play 5 Games" mission
- Mission reset_date = Day 0 (yesterday's operational day)
- Streak is NOT updated yet (first play of the day triggers sync)

Day 1, 09:01 AM KST (after reset):
- Same user plays 1 more game
- sync_play_streak triggers: play_day = Day 1, last_play_date = Day 0
- Condition met: last_play_date == play_day - 1 day
- Streak increments to 2
- New missions appear with reset_date = Day 1
```

---

## Expected Event Logs (For Debugging)

### Successful Streak Increment
```json
{
  "user_id": 123,
  "feature_type": "STREAK",
  "event_name": "streak.promote",
  "meta_json": {
    "milestone": "HOT",
    "from_days": 2,
    "to_days": 3,
    "play_day": "2026-01-24"
  }
}
```

### Streak Break (User Skipped Days)
```json
{
  "user_id": 123,
  "feature_type": "STREAK",
  "event_name": "streak.reset",
  "meta_json": {
    "prev_streak_days": 5,
    "prev_last_play_date": "2026-01-20",
    "play_day": "2026-01-24"
  }
}
```

---

## Post-Deployment Monitoring

### Critical Metrics (Daily)
- [ ] Query `UserEventLog` for `streak.reset` events where `prev_streak_days >= 3`
- [ ] Calculate false-reset rate: `streak.reset` events within 24h of previous login
- [ ] Monitor user complaints mentioning "스트릭", "연속", "리셋"

### SQL Query for False Resets
```sql
SELECT 
    u.id, 
    u.nickname, 
    u.play_streak, 
    u.last_play_date,
    el.created_at,
    el.meta_json
FROM user_event_log el
JOIN user u ON u.id = el.user_id
WHERE el.event_name = 'streak.reset'
  AND el.created_at >= NOW() - INTERVAL 7 DAY
  AND JSON_EXTRACT(el.meta_json, '$.prev_streak_days') >= 3
ORDER BY el.created_at DESC;
```

---

## Rollback Criteria

If any of these occur within 24h of deployment:
1. More than 3 user reports of "unexpected streak reset"
2. `streak.reset` event rate increases by >50% vs. baseline
3. Retention metrics drop in "3+ day streak" cohort

**Action**: Immediate rollback + manual streak restoration for affected users.
