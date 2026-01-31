문서 타입: 트러블슈팅 (주간)
주차: W05 (2026-01-27 ~ 2026-02-02)
도메인: MISSION (미션/스트릭)
상태: ACTIVE

# W05 MISSION 트러블슈팅

## 요약
| 날짜 | 이슈 | 상태 |
|---|---|---|
| 01-31 | 이벤트 미션 로그인 카운트 미증가 | ✅ RESOLVED |
| 01-31 | 신규 채널 가입 미션 UI 비활성화 | ✅ RESOLVED |
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

## 01-31 - [MISSION/FRONTEND] 신규 채널 가입 미션 UI 비활성화

**우선순위**: P1
**관련 도메인**: MISSION, FRONTEND

### 증상
- "신규 텔레그램 채널가입", "신규 CC채널가입" 미션 버튼이 "미션 진행 중"으로 고정되어 클릭 불가능(비활성) 상태로 노출됨.
- 채널 가입 페이지로의 링크 이동이 작동하지 않으며, 가입 후 '인증 확인' 버튼이 나타나지 않아 보상 수령이 불가능함.

### 근본 원인
- **기술적 원인**: 프론트엔드 `MissionCard.tsx`에서 채널 가입형 미션을 식별하는 로직이 레거시/공통 타입(`JOIN_CHANNEL`, `SUBSCRIBE_CHANNEL`)에 국한되어 있었음.
- **분석**: 신규로 추가된 `JOIN_TELEGRAM_CHANNEL` 및 `JOIN_CC_CHANNEL` 액션 타입이 프론트엔드 판단 조건에서 누락되어, 시스템이 해당 미션을 일반적인(또는 알 수 없는) 미션으로 간주하고 기본 비활성 상태로 렌더링함.

### 해결 방법
#### Immediate Fix
- `src/v2/components/mission/MissionCard.tsx` 내 `handleAction` 및 `renderActionButton` 함수에서 신규 액션 타입 2종을 추가하여 "채널 가입형"으로 분류되도록 수정 완료.
#### Long-term Fix
- `MissionService`의 `ACTION_TYPE_ALIASES` 정보를 프론트엔드와 싱크하거나, 미션 메타데이터에 `action_category: 'CHANNEL_JOIN'` 필드를 명시적으로 추가하여 타입 확장에 유연하게 대응하도록 아키텍처 개선 검토.

### 검증 방법
- 로컬 환경 및 서버 배포 후 신규 유저 계정으로 접속하여 미션 카드 확인.
- 버튼이 "채널 가입" (또는 "가입 확인")으로 정상 노출되고 클릭 시 텔레그램 앱이 열리는지 확인.

### 예방 가이드라인
- 새로운 미션 액션 타입 정의 시 반드시 Frontend UI 대응 여부를 체크리스트에 포함할 것.
- 가급적 전역 상수(`types/mission.ts` 등)를 통해 액션 타입을 관리하고 공통 분류 로직을 사용할 것.

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
