문서 타입: 트러블슈팅 (주간)
주차: W05 (2026-01-27 ~ 2026-02-02)
도메인: MISSION (미션/스트릭)
상태: ACTIVE

# W05 MISSION 트러블슈팅

## 요약
| 날짜 | 이슈 | 상태 |
|---|---|---|
| 01-31 | 이벤트 미션 로그인 카운트 미증가 | ✅ RESOLVED |
| 01-31 | [ADMIN/MISSION] 로그인 미션 검증 집계가 Admin만 표시 | ✅ RESOLVED |
| 01-31 | 신규 채널 가입 미션 UI 비활성화 | ✅ RESOLVED |
| 01-30 | CC 입금 미션 XP 미지급 | ✅ RESOLVED |
| 02-01 | 신규 유저 미션 타이머 UX 및 기간 정책 수정 + 텔레그램 채널 연동 UX | ✅ RESOLVED |

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

## 01-31 - [ADMIN/MISSION] 로그인 미션 검증 집계가 Admin만 표시

### 증상
- 어드민 > Mission Ops > "로그인 미션 검증" 섹션에서,
   - "오늘 로그인한 유저"/"오늘 미션 완료" 지표가 현실과 불일치
   - 유저 리스트가 Admin만 보이거나 일부 유저가 누락됨

### 원인 분석

**증거 1: 로그인 관련 미션이 복수 존재**
```sql
SELECT id, logic_key, title, is_active
FROM mission
WHERE is_active = 1 AND logic_key LIKE '%LOGIN%'
ORDER BY id ASC;
```

**증거 2: API가 "login 포함 첫 번째" 미션을 선택(비결정적)**
```python
# 기존 코드 (버그)
login_mission = db.query(Mission).filter(
      Mission.logic_key.ilike("%login%"),
      Mission.is_active == True,
).first()
```
- 위 방식은 DB에 어떤 login 관련 미션이 먼저 생성되었는지(id/정렬)에 따라, 의도와 다른 미션(예: 신규/주간 로그인 관련)을 집계 대상으로 잡을 수 있음.

### 근본 원인
- "로그인 미션 검증"의 집계 기준이 되어야 하는 **일일 출석/로그인 미션**을 명시적으로 선택하지 않고,
   `logic_key LIKE '%login%'`의 **첫 번째(active) 미션을 first()로 선택**함.
- 결과적으로 집계 대상 미션이 의도와 달라져, 완료자/미완료자 리스트와 비율이 현실과 어긋남.

### 해결
- 로그인 검증 대상 미션을 **결정적으로 선택**하도록 수정:
   - `daily_login_gift`(대소문자 무관) 우선
   - 없으면 `daily_login` → `login` 순서로 폴백
   - 최후에만 `LIKE '%login%'` 폴백
- 완료 유저 조회는 `outer join`을 사용해, `v2_user` 누락(아이디 불일치/미이관) 케이스도 드러나도록 보강.
- 유저 엔티티 전체를 SELECT하지 않고 필요한 컬럼만 조회하여 불필요한 컬럼 의존을 제거.

### 관련 파일
- `app/v2/api/admin/mission_routes.py`

### 검증 방법
1. 어드민에서 Mission Ops 페이지 접속 후 "로그인 미션 검증" 섹션 확인
2. "일일 출석/로그인" 미션 완료자가 Admin 외 유저도 포함되는지 확인
3. (데이터 불일치 의심 시) 완료 집계 기준 미션이 무엇인지 확인:
    ```sql
    SELECT id, logic_key, title
    FROM mission
    WHERE LOWER(logic_key) IN ('daily_login_gift','daily_login','login');
    ```

---

## 01-31 - [MISSION/FRONTEND] 신규 채널 가입 미션 UI 비활성화

**우선순위**: P1
**관련 도메인**: MISSION, FRONTEND

### 증상
- "신규 텔레그램 채널가입", "신규 CC채널가입" 미션 버튼이 "미션 진행 중"으로 고정되어 클릭 불가능(비활성) 상태로 노출됨.
- 채널 가입 페이지로의 링크 이동이 작동하지 않으며, 가입 후 '인증 확인' 버튼이 나타나지 않아 보상 수령이 불가능함.

### 근본 원인
- **코드 수정 완료, 빌드 미배포**: 프론트엔드 `MissionCard.tsx`에서 채널 가입형 미션을 식별하는 로직이 레거시/공통 타입(`JOIN_CHANNEL`, `SUBSCRIBE_CHANNEL`)에 국한되어 있었음.
- **분석**: 신규로 추가된 `JOIN_TELEGRAM_CHANNEL` 및 `JOIN_CC_CHANNEL` 액션 타입이 프론트엔드 판단 조건에서 누락되어, 시스템이 해당 미션을 일반적인(또는 알 수 없는) 미션으로 간주하고 기본 비활성 상태로 렌더링함.
- **배포 문제**: 코드 수정은 완료되었으나 프론트엔드 빌드가 수행되지 않아 변경사항이 배포되지 않음.
  - MissionCard.tsx 수정 시간: 2026-01-31 13:56:35
  - 기존 빌드 시간: 2026-01-31 13:20:49 (36분 이전)

### 해결 방법
#### Immediate Fix (완료)
1. `src/v2/components/mission/MissionCard.tsx` 내 `handleAction` (line 47-52) 및 `renderActionButton` (line 136-141) 함수에서 신규 액션 타입 2종 추가:
   ```typescript
   if (
     actionType === "JOIN_CHANNEL" ||
     actionType === "SUBSCRIBE_CHANNEL" ||
     actionType === "JOIN_TELEGRAM_CHANNEL" ||  // ✅ 추가
     actionType === "JOIN_CC_CHANNEL"           // ✅ 추가
   ) {
   ```
2. 프론트엔드 빌드 및 배포:
   ```bash
   npm run build
   ```
   - 빌드 완료 시간: 2026-01-31 14:xx:xx

#### Long-term Fix
- `MissionService`의 `ACTION_TYPE_ALIASES` 정보를 프론트엔드와 싱크하거나, 미션 메타데이터에 `action_category: 'CHANNEL_JOIN'` 필드를 명시적으로 추가하여 타입 확장에 유연하게 대응하도록 아키텍처 개선 검토.

### 검증 방법
1. 로컬 개발 서버에서 확인:
   ```bash
   npm run dev
   ```
   - 미션 카드 버튼이 "채널 가입" → "가입 확인"으로 정상 전환되는지 확인

2. 프로덕션 배포 후 확인:
   - `dist/` 빌드 파일을 서버에 배포
   - 신규 유저 계정으로 미션 페이지 접속
   - 버튼 클릭 시 텔레그램 앱이 정상적으로 열리는지 확인

### 예방 가이드라인
1. **빌드/배포 체크리스트**:
   - 프론트엔드 코드 수정 후 반드시 `npm run build` 실행
   - 빌드 타임스탬프 확인: `stat -c "%y" dist/index.html`
   - 소스 수정 시간과 빌드 시간 비교하여 최신 빌드 여부 검증

2. **타입 관리**:
   - 새로운 미션 액션 타입 정의 시 반드시 Frontend UI 대응 여부를 체크리스트에 포함
   - 가급적 전역 상수(`types/mission.ts` 등)를 통해 액션 타입을 관리하고 공통 분류 로직 사용

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

## 02-01 - [MISSION/UX] 신규 유저 미션 타이머 UX 및 기간 정책 수정

**우선순위**: P1 (UX Critical)
**관련 도메인**: MISSION, FRONTEND

### 증상
- 신규 유저 탭의 타이머 위치가 부적절하다는 피드백(반려).
- 자격 기간에 대한 혼선 (기존 72시간 vs 시스템 7일).

### 근본 원인
- **정책 불일치**: SOT상 72시간이었으나 코드(`mission_service.py`)는 7일로 구현됨.
- **UX 설계**: 초기 카드 형태의 타이머가 메인 컨텐츠와 충돌.

### 해결 방법
#### Policy Fix
- 기간을 **7일 (168시간)**로 확정하고 SOT 및 로직을 일치시킴.

#### Frontend Fix (UX)
- 타이머를 메인 컨텐츠를 가리지 않는 **Floating Action Button(FAB)** 형태로 변경.
- **위치**: 우측 하단 고정 (`fixed bottom-20 right-4`).
- **디자인**: 검은색 반투명 배경 + Rose 컬러 텍스트 + 펄스 애니메이션 적용.
- **구현 파일**: `src/v2/pages/missions/MissionsPage.tsx` 내 `FloatingTimer` 컴포넌트.

### 검증 방법
1. 신규 가입 7일 이내 계정으로 미션 페이지 진입.
2. "신규 유저" 탭 선택.
3. 우측 하단에 FAB 타이머가 노출되며 "혜택 종료까지 00일 00:00:00" 카운트다운 동작 확인.
4. 스크롤 시에도 위치가 고정되는지 확인.

---

## 변경 이력
- 2026-01-31: W05 MISSION 문서 생성, 기존 분산 문서 통합
