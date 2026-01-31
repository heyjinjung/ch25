문서 타입: 트러블슈팅 (주간)
주차: W05 (2026-01-27 ~ 2026-02-02)
도메인: MISSION (미션/스트릭)
상태: ACTIVE

# W05 MISSION 트러블슈팅

## 요약
| 날짜 | 이슈 | 상태 |
|---|---|---|
| 01-31 | 이벤트 미션 로그인 카운트 미증가 | ✅ RESOLVED |
| 01-30 | CC 입금 미션 XP 미지급 | ✅ RESOLVED |

---

## 01-31 - 이벤트 미션 로그인 카운트 미증가

### 증상
- "신규 다음날 로그인 1일" 이벤트 미션
- 보상 수령은 정상 작동
- 로그인 카운트가 증가하지 않음

### 원인 분석

**증거 1: DB 미션 데이터**
```sql
SELECT id, title, action_type FROM mission WHERE id=8;
-- Result: action_type='CONSECUTIVE_LOGIN'
```

**증거 2: user_mission_progress 테이블**
```sql
SELECT * FROM user_mission_progress WHERE mission_id=8;
-- Result: 0 rows (진행 레코드 없음!)
```

**증거 3: 코드 분석**
```python
# 기존 코드 (버그)
def ensure_login_progress(cls, db, user_id):
    service.update_progress(user_id, "LOGIN", delta=1)  # LOGIN만 트리거
    # CONSECUTIVE_LOGIN은 트리거되지 않음!
```

### 근본 원인
- `ensure_login_progress()`가 `"LOGIN"` 액션만 트리거
- `CONSECUTIVE_LOGIN` 액션은 별도 alias 그룹 (`["NEXT_DAY_LOGIN", "LOGIN_STREAK"]`)
- 이벤트 미션 `action_type='CONSECUTIVE_LOGIN'`에 매칭되지 않음

### 해결
`mission_service.py` 수정:
```python
@classmethod
def ensure_login_progress(cls, db: Session, user_id: int) -> None:
    service = cls(db)
    service.update_progress(user_id, "LOGIN", delta=1)
    
    # CONSECUTIVE_LOGIN 미션 진행 추가
    try:
        user = db.execute(select(V2User).where(V2User.id == user_id)).scalar_one_or_none()
        if user and user.last_play_date:
            now_tz = service._now_tz()
            today = service._operational_play_date(now_tz)
            yesterday = today - timedelta(days=1)
            
            if user.last_play_date == yesterday or user.last_play_date == today:
                service.update_progress(user_id, "CONSECUTIVE_LOGIN", delta=1)
    except Exception:
        pass
```

### 관련 파일
- `app/v2/services/mission_service.py`
- `docs/v2_specs/90_troubleshooting/20260131_mission_login_v2_fk_patch.md`

---

## 01-30 - CC 입금 미션 XP 미지급

### 증상
- CC 입금 완료 후 미션 달성
- XP 보상이 지급되지 않음

### 원인
`xp_reward` 컬럼 값이 미설정 또는 0

### 해결
미션 생성 시 `xp_reward` 값 명시적 설정 필요

### 관련 파일
- `app/v2/services/mission_service.py` (claim_reward 로직)

---

## 변경 이력
- 2026-01-31: W05 MISSION 문서 생성, 기존 분산 문서 통합
