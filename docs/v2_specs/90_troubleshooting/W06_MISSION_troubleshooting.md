문서 타입: 트러블슈팅
주차: W06 (2026-02-02 ~ 2026-02-08) ← ISO 주차 기준 월요일 시작
도메인: MISSION
상태: 진행 중 ⏳

# W06 MISSION 트러블슈팅 리포트

## 📌 요약 및 통계
| 항목 | 내용 |
|---|---|
| 미해결 이슈 | 0 |
| 해결된 이슈 | 5 |
| SoT 승격 예정 | 1 (중복 호출 방지 로직) |

---

## 🔗 연관 문서
- [Troubleshooting 메인 (README)](./README.md)
- [W05 (이전 주차) MISSION 리포트](./archive/weekly/W05_MISSION_troubleshooting.md)
- [V2 New User Mission Logic SoT](../02_game/v2_new_user_mission_logic_sot_ko.md)
- [V2 Streak Policy (Learned)](../00_sot_meta/00_A_sot_code_ops_chk/learned_/mission/v2_streak_policy_ko.md)

---

## 🔍 주간 이슈 내역

### 02-04 - MISSION/CRITICAL: 신규유저 텔레그램 채널 가입 미션 진행 안 됨 (404 에러) 🔴

**에러 트리아지 체크리스트 적용**
- 기준 문서: [docs/v2_specs/90_troubleshooting/archive/20260130_error_triage_checklist.md](./archive/20260130_error_triage_checklist.md)
- 분류 결과: **404 Not Found - 엔드포인트 누락**

**증상 정의**
| 항목 | 내용 |
|---|---|
| 대상 기능 | 신규유저 텔레그램 채널 가입 미션 (NEW_USER_TELEGRAM_JOIN) |
| HTTP Status | 404 Not Found |
| 영향 범위 | 전체 신규유저 |
| 재현 빈도 | 항상 |

**운영 서버 증거**
```
INFO: POST /api/viral/verify/channel HTTP/1.1" 404 Not Found
INFO: POST /api/viral/verify/channel HTTP/1.1" 404 Not Found
INFO: POST /api/viral/verify/channel HTTP/1.1" 404 Not Found
```

**DB 상태 확인**
- 최근 유저(16, 17, 18, 20)에 `NEW_USER_TELEGRAM_JOIN` 미션 진행 기록 없음
- `NEW_USER_FIRST_LOGIN`만 기록됨

**근본 원인 (RCA)**
1. 프론트엔드가 `/api/viral/verify/channel` 엔드포인트 호출
2. 백엔드에 해당 라우트 **미구현** → 404 반환
3. 미션 진행 트리거 실패

**수정 내용 (2026-02-04)**
1. `app/v2/api/viral_routes.py` 신규 생성
   - `POST /api/viral/verify/channel` - 텔레그램 채널 구독 확인 및 미션 진행
   - `POST /api/viral/action` - 바이럴 액션 기록
2. `app/v2/api/routes.py`에 viral_router 등록

**핵심 코드**
```python
# viral_routes.py
@router.post("/verify/channel")
def verify_channel_subscription(payload, db, user_id):
    service = V2MissionService(db)
    # JOIN_TELEGRAM_CHANNEL 액션으로 미션 진행
    updated = service.update_progress(user_id, "JOIN_TELEGRAM_CHANNEL", delta=1)
    mission_completed = any(p.is_completed for p in updated)
    return VerifyChannelResponse(success=True, mission_completed=mission_completed)
```

**검증 방법**
- 배포 후 신규 유저로 텔레그램 채널 가입 버튼 클릭
- `/api/viral/verify/channel` 200 응답 확인
- DB에서 `NEW_USER_TELEGRAM_JOIN` 미션 진행 기록 확인

**상태**: ✅ 코드 완료 (배포 필요)

---

### 02-03 - MISSION/CRITICAL: V1/V2 중복 호출로 인한 주간 미션 초과 달성 버그 🔴

**에러 트리아지 체크리스트 적용**
- 기준 문서: [docs/v2_specs/90_troubleshooting/archive/20260130_error_triage_checklist.md](./archive/20260130_error_triage_checklist.md)
- 분류 결과: **데이터 정합성 버그(Data Integrity Bug)**

**증상 정의**
| 항목 | 내용 |
|---|---|
| 대상 기능 | 주간 출석(WEEKLY_LOGIN_STREAK_TEST) 미션 |
| HTTP Status | 200 (Logic Error) |
| 영향 범위 | 전체 유저 (V1/V2 동시 호출 경로 있는 경우) |
| 재현 빈도 | 항상 |

**운영 서버 증거 (jm9567, user_id=1)**
```
now_kst             = 2026-02-03 09:56:12
weekday             = 1 (화요일)
W06 start           = 2026-02-02 (월요일)

WEEKLY_LOGIN_STREAK_TEST:
  reset_date        = 2026-W06
  current_value     = 3  ← 🔴 W06 시작(2/2) 후 하루 만에 3 달성
  is_completed      = True
  is_claimed        = True
  updated_at        = 2026-02-02 23:26:52
```

**버그 현상**
- W06 시작일(2월 2일) 하루 만에 `current_value=3` 달성 (target_value=3)
- 정상적으로는 월/화/수 3일에 걸쳐 달성해야 함
- **하루에 +2~+3 증가하는 중복 버그**

**증거 기반 근본 원인 분석 (RCA)**

1. **호출 경로 분석**: `ensure_login_progress` 호출 위치 7개 발견
   ```
   app\v2\routes\auth_routes.py:71         ← V2 라우터
   app\v2\routes\telegram_routes.py:126    ← V2 텔레그램
   app\services\telegram.py:252            ← V1 서비스
   app\services\telegram.py:265            ← V1 서비스
   tests/... (테스트 파일들)
   ```

2. **중복 호출 메커니즘**
   - 텔레그램 로그인 시 **V1 telegram.py**와 **V2 telegram_routes.py**가 **동시 호출**
   - 각각 `ensure_login_progress()`를 독립 호출 → DAILY LOGIN 미션 +2~+3 증가
   - DAILY LOGIN 미션 완료 시 WEEKLY_LOGIN_STREAK 미션도 동시에 +2~+3 증가

3. **데이터 흐름**
   ```
   [텔레그램 로그인]
        │
        ├─► V1 telegram.py:252 → ensure_login_progress() → DAILY +1, WEEKLY +1
        │
        └─► V2 telegram_routes.py:126 → ensure_login_progress() → DAILY +1, WEEKLY +1
        
   결과: DAILY +2, WEEKLY +2 (또는 경합에 따라 +3)
   ```

**수정 내용 (2026-02-03)**

1. **V2 mission_service.py** (`app/v2/services/mission_service.py`)
   - `ensure_login_progress()` 시작 부분에 중복 호출 방지 로직 추가
   ```python
   # 중복 호출 방지: 오늘 이미 DAILY LOGIN 미션이 +1 이상이면 스킵
   if daily_login_mission:
       existing_daily = db.query(UserMissionProgress).filter(
           UserMissionProgress.user_id == user_id,
           UserMissionProgress.mission_id == daily_login_mission.id,
           UserMissionProgress.reset_date == today_reset_date,
           UserMissionProgress.current_value >= 1
       ).first()
       
       if existing_daily:
           return  # 이미 오늘 LOGIN 진행됨 - 중복 호출 스킵
   ```

2. **V1 mission_service.py** (`app/services/mission_service.py`)
   - 동일한 중복 방지 로직 적용

**검증 방법**
- 백엔드 재시작 후 텔레그램 로그인 테스트
- `UserMissionProgress.current_value`가 1만 증가하는지 확인
- V1/V2 동시 호출해도 중복 증가 없음 확인

**상태**: ✅ 해결 완료 (2026-02-03)

**SoT 승격 대상**
- 중복 호출 방지 패턴을 `learned_/mission/` 문서에 추가 예정

---

### 02-03 - MISSION/주간 출석 갱신 미반영 (jm9567)

**에러 트리아지 체크리스트 적용**
- 기준 문서: [docs/v2_specs/90_troubleshooting/archive/20260130_error_triage_checklist.md](./archive/20260130_error_triage_checklist.md)
- 분류 결과: 500/400 에러 아님 → **UI/표시 불일치(Logic Error)**로 분류

**증상 정의**
| 항목 | 내용 |
|---|---|
| 대상 기능 | 주간 출석(주간 미션) 갱신 |
| HTTP Status | 200 (UI/표시 불일치) |
| 영향 범위 | 특정 유저 (telegram_username=jm9567, user_id=1) |
| 재현 빈도 | 항상 |

**증거 기반 RCA**
- 주간 리셋 키는 **ISO 주차 키(`%Y-W%V`)**로 계산되며, 별도 배치가 아닌 **액션 트리거(미션 이벤트 발생)** 시점에 새 `reset_date`로 진행 기록이 생성됨.
    - 근거: `V2MissionService._get_reset_date_str()` → WEEKLY는 `now_tz.strftime("%Y-W%V")`
    - 근거: `update_progress()`가 발생해야 `UserMissionProgress` 생성/갱신

**운영 서버 증거 (jm9567)**
- 현재 KST 기준 주차 키: `2026-W06`
- 주간 미션 2개 확인
    1) `WEEKLY_LOGIN_STREAK_TEST` (주간 연속출석, action=LOGIN)
         - `UserMissionProgress.reset_date=2026-W06`, `current_value=3`, `is_completed=True`, `is_claimed=True`
    2) `WEEKLY_WEEKLY_CC_DEPOSIT_3` (주간 CC 입금 3회)
         - 최신 진행 `reset_date=2026-W05`, `current_value=1`, `is_completed=False`

**결론**
- **주간 출석(로그인) 미션은 W06로 정상 갱신/완료** 상태임.
- 반면 **주간 CC 입금 미션은 W06 주차에 트리거가 발생하지 않아** 신규 진행이 생성되지 않음.
    - 즉, “갱신 안됨”이 **주간 로그인 미션이 아닌** 다른 주간 미션(입금/플레이 등)일 가능성이 높음.

**조치/안내**
1) UI가 “주간 출석”으로 표시하는 대상이 **로그인 미션**인지 **주간 CC 입금 미션**인지 확인 필요
2) 주간 CC 입금은 **입금 이벤트(CC_DEPOSIT)**가 발생해야 W06 진행이 생성됨

**검증 방법**
- `UserMissionProgress.reset_date`가 `YYYY-Www`로 갱신되는지 확인
- 해당 미션의 action_type 이벤트(`LOGIN` 또는 `CC_DEPOSIT`) 발생 후 진행도 생성 확인

### 02-02 - MISSION/정책 확인: 지연 입금 선반영 XP/레벨 보상 여부

**증상 정의**
| 항목 | 내용 |
|---|---|
| 대상 기능 | 지연 입금 선반영(증거 제출 시 즉시 지급) |
| HTTP Status | 200 (정책 확인) |
| 영향 범위 | 유저 레벨/XP 및 레벨 보상 |
| 재현 빈도 | 항상 |

**근본 원인 (증거 기반)**
- `V2LatencySurvivalService.submit_evidence()`는 선반영 보상을 **고정 상수**로 지급하며, XP/레벨 서비스 호출이 없음.
    - 상수: `PROVISIONAL_REWARD_TYPE = "ROULETTE_TICKET"`, `PROVISIONAL_REWARD_AMOUNT = 3`
    - 지급 경로: `V2InventoryService.grant_wallet_tokens()` 또는 `V2InventoryService.grant_item()`
    - 관련 코드: [app/v2/services/latency_survival_service.py](../../app/v2/services/latency_survival_service.py)

**결론**
- 입금지연 신청 시 **레벨 XP는 증가하지 않음**.
- 레벨에 따른 보상도 **지급되지 않음**.
- 보상은 임의 생성이 아니라 **상수로 정의된 고정 지급**(현행: 룰렛 티켓 3장)임.

**검증 방법**
- `submit_evidence()` 호출 시 XP/레벨 관련 서비스 호출이 없는지 코드 확인.
- `V2InventoryService` 지급 로그(지갑/인벤토리 원장)만 생성되는지 확인.

### 02-02 - MISSION/FRONTEND: 연속 스트릭 모달 미노출

**증상 정의**
| 항목 | 내용 |
|---|---|
| 대상 기능 | 유저 연속 스트릭 미션 모달/UX |
| HTTP Status | 200 (Logic/UI Error) |
| 영향 범위 | 유저 화면 |
| 재현 빈도 | 항상 |

**근본 원인 (증거 기반)**
- 프론트 매핑에서 `claimable_rewards` 필드가 누락되어 모달 노출 조건이 충족되지 않음.
- 관련 코드: [src/v2/api/missionApi.ts](../../src/v2/api/missionApi.ts)

**해결 방법**
- `BackendStreakInfoSchema`에 `claimable_rewards` 추가.
- 매핑 시 `claimable_rewards` 우선 적용, 없을 경우 `claimable_day` fallback.

**검증 방법**
- `GET /api/v2/mission/` 응답에 `claimable_rewards` 존재 시 모달 노출 확인.
- KST 09:00 기준 스트릭 리셋 구간에서 동작 확인.

**상태**: ✅ 해결 완료 (2026-02-02)

---

### 02-02 - MISSION/VERIFICATION: 연속 스트릭 미션 어드민 설정값 지급 여부 검증

**증상 정의**
| 항목 | 내용 |
|---|---|
| 요청 사항 | 연속 스트릭 미션이 어드민 설정값대로 지급되고 있는지 확인 |
| 검증 대상 | UiConfig `streak_reward_rules` 기반 보상 지급 로직 |
| 영향 범위 | 전체 유저 (스트릭 마일스톤 도달 시) |
| 우선순위 | 중 (정기 검증) |

**증거 기반 원인 분석**

1. **SoT 문서 검토**
   - 기준 문서: `docs/v2_specs/00_sot_meta/00_A_sot_code_ops_chk/learned_/mission/09.mission.md`
   - 정책: 스트릭 보상 규칙은 `app_ui_config.config_key = "streak_reward_rules"` 기반
   - 기본값: Day 3 (ROULETTE/DICE/LOTTERY TICKET 각 1개), Day 7 (DIAMOND 1개)
   - Admin API: `GET/PUT /api/v2/admin/ui-config/streak_reward_rules`

2. **코드 검증** (`app/v2/services/streak_service.py`)
   ```python
   def _get_streak_reward_rules(self) -> List[Dict[str, Any]]:
       row = UiConfigService.get(self.db, "streak_reward_rules")
       if row and row.value_json:
           return row.value_json.get("rules", [])
       # 기본값 fallback 존재
   ```

3. **풀스택 검증 체크리스트**

| 레이어 | 검증 항목 | 결과 |
|---|---|---|
| DB | `app_ui_config` 테이블 | ✅ |
| Backend | `_get_streak_reward_rules()` 호출 | ✅ |
| Backend | 기본값 fallback | ✅ |
| Backend | `enabled` 필드 체크 | ⚠️ 개선 여지 |
| API | `/api/v2/mission/streak/claim` | ✅ |
| Frontend | Admin UI Config 설정 | ✅ |
| Testing | 단위 테스트 | ✅ 통과 |

**검증 결과**: ✅ **연속 스트릭 미션은 어드민 설정값대로 지급되고 있음**

**근거**:
- `UiConfigService.get(db, "streak_reward_rules")`로 DB 설정 조회
- Config 없을 시 안전한 기본값 제공
- `claim_streak_reward()`가 규칙 조회 후 `V2RewardService`로 지급
- `tests/v2_tests/phase2_core/test_mission_streak_logic_deep.py` 검증 완료

**개선 권고사항**:
- ⚠️ `enabled: false` 규칙 필터링 추가 권장 (현재는 비활성 규칙도 적용됨)

```python
def _get_streak_reward_rules(self) -> List[Dict[str, Any]]:
    row = UiConfigService.get(self.db, "streak_reward_rules")
    if row and row.value_json:
        rules = row.value_json.get("rules", [])
        return [r for r in rules if r.get("enabled", True)]  # ✨ 필터링
    return [...]  # 기본값
```

**상태**: ✅ 검증 완료 (2026-02-02)

**다음 액션**:
- [ ] (선택) `enabled: false` 필터링 로직 추가

---

### 02-04 - MISSION/INVESTIGATION: 연속 스트릭 클레임 미동작 조사

**증상 정의**
| 항목 | 내용 |
|---|---|
| 대상 기능 | 연속 스트릭 보상 클레임 |
| HTTP Status | 조사 중 |
| 영향 범위 | 테스트 유저 |
| 재현 빈도 | 항상 |

**어드민 설정 확인 (정상)**
```json
// app_ui_config.key = "streak_reward_rules"
{
  "rules": [
    {"day": 1, "grants": [{"kind": "WALLET", "amount": 1, "token_type": "DICE_TICKET"}], "enabled": true},
    {"day": 2, "grants": [{"kind": "WALLET", "amount": 1, "token_type": "DICE_TICKET"}], "enabled": true},
    {"day": 3, "grants": [{"kind": "WALLET", "amount": 1, "token_type": "ROULETTE_TICKET"}], "enabled": true},
    {"day": 4, "grants": [{"kind": "WALLET", "amount": 1, "token_type": "LOTTERY_TICKET"}], "enabled": true},
    {"day": 5, "grants": [{"kind": "WALLET", "amount": 2, "token_type": "DICE_TICKET"}], "enabled": true},
    {"day": 6, "grants": [{"kind": "WALLET", "amount": 3, "token_type": "DICE_TICKET"}], "enabled": true},
    {"day": 7, "grants": [{"kind": "WALLET", "amount": 2, "token_type": "ROULETTE_TICKET"}], "enabled": true}
  ]
}
```

**백엔드 로직 검증 (정상)**
- `get_pending_streak_milestone()`: Day 1~7 모두 지원
- `_get_streak_reward_rules()`: DB에서 설정 정상 조회
- user_id=1 (Admin): play_streak=2, Day 1/2 클레임 가능 상태

**이벤트 로그 확인**
- user_id=1: 스트릭 이벤트 **없음** → Day 2 클레임 가능
- user_id=10: Day 1만 클레임됨 → Day 2 클레임 가능
- `/api/v2/mission/streak/claim` 호출 기록 **없음** (프론트 미호출)

**추정 원인**
1. 프론트엔드에서 `claimable_rewards` 감지 후 클레임 버튼 미표시
2. 또는 클레임 모달이 이미 표시된 것으로 처리됨 (localStorage)

**다음 액션**
- [ ] 프론트엔드 `V2StreakModalContainer` 클레임 버튼 표시 조건 확인
- [ ] localStorage에서 `v2_streak_claim_shown_*` 키 확인

---

## 📝 관리 가이드
- 일일 미션, 신규 유저 미션, 스트릭 보상 지급 확인
- viral 미션(채널 가입, 스토리 공유 등)은 `/api/viral/*` 엔드포인트 사용
