# XMAS 미션 트리거/핸들러/이벤트 처리 구조 및 신규 미션 확장 가이드 (2026-01-26)

## 1. 전체 구조 요약

| 단계 | 주요 함수/핸들러 | 핵심 파일 | 설명 |
|------|------------------|-----------|------|
| 1 | 미션 등록 (logic_key/action_type) | models/mission.py, v2_admin_mission_service.py | DB에 신규 미션 row 생성 (logic_key/action_type 지정) |
| 2 | 트리거 발생 (ex: 로그인) | v2/api/routes.py, v2/services/mission_service.py | API/이벤트에서 update_progress 호출 (action_type 전달) |
| 3 | 미션 매칭 | v2/services/mission_service.py | action_type/logic_key로 Mission row 조회 및 UserMissionProgress 생성/갱신 |
| 4 | 달성 처리 | v2/services/mission_service.py | 목표치 도달 시 is_completed 처리, auto_claim이면 즉시 보상 지급 |
| 5 | 보상 지급 | v2/services/mission_service.py, reward_service.py | claim_reward에서 보상 지급 및 UserEventLog 기록 |
| 6 | 이벤트 로그 | models/feature.py | UserEventLog로 streak, reward 등 이벤트 기록 |

- **핵심 함수**: update_progress, claim_reward, get_user_missions, get_streak_info
- **핵심 모델**: Mission, UserMissionProgress, UserEventLog

---

## 2. 신규 logic_key 미션 추가/확장 가이드

### (1) DB/어드민에서 신규 미션 row 등록
- 필수: logic_key, action_type, target_value, reward_type, reward_amount 등 지정
- 예시: logic_key="login_next_day", action_type="LOGIN_NEXT_DAY"

### (2) 트리거 코드에 액션타입 처리 추가
- update_progress(user_id, action_type, delta) 호출부에서 신규 action_type이 실제로 호출되는지 확인
- ex) 로그인 후 "LOGIN_NEXT_DAY" 트리거가 필요한 경우, 로그인 처리 후 update_progress(user_id, "LOGIN_NEXT_DAY", 1) 호출 필요

### (3) mission_service.py에서 매칭/핸들러 확인
- Mission.action_type/logic_key가 update_progress의 _normalize_action_type() 결과와 매칭되어야 함
- 필요시 ACTION_TYPE_ALIASES에 alias 추가 가능

### (4) 보상/이벤트 처리 자동화
- target_value 달성 시 is_completed 처리, auto_claim이면 자동 보상
- 수동 클레임이면 claim_reward(user_id, mission_id) 호출 필요

---

## 3. 주요 확장 포인트/코드 예시

### (A) 신규 트리거 추가 예시 (ex: "login_next_day")
```python
# 1. 어드민에서 신규 미션 등록
# logic_key: "login_next_day", action_type: "LOGIN_NEXT_DAY"

# 2. 로그인 성공 시 트리거 코드에 추가
from app.v2.services.mission_service import V2MissionService
...
service = V2MissionService(db)
service.update_progress(user_id, "LOGIN_NEXT_DAY", 1)

# 3. (필요시) ACTION_TYPE_ALIASES에 alias 추가
ACTION_TYPE_ALIASES = {
    ...
    "LOGIN_NEXT_DAY": ["LOGIN_NEXT_DAY", "login_next_day"]
}
```

### (B) 미션 달성/보상/이벤트 로그 자동화
- target_value 도달 시 UserMissionProgress.is_completed 자동 처리
- auto_claim=True면 보상 자동 지급, 아니면 claim_reward로 수동 지급
- UserEventLog에 보상/스트릭/리셋 등 이벤트 자동 기록

---

## 4. 검증 체크리스트
- [ ] 어드민/DB에 신규 미션 row가 정상 등록되어 있는가?
- [ ] 트리거 코드에서 update_progress가 신규 action_type으로 호출되는가?
- [ ] Mission.action_type/logic_key가 코드 내에서 매칭되는가?
- [ ] 미션 달성 시 UserMissionProgress.is_completed가 True로 변경되는가?
- [ ] auto_claim/수동 클레임 동작이 정책대로 동작하는가?
- [ ] 보상 지급 및 UserEventLog 기록이 정상적으로 남는가?

---

### 참고: 정책/예시/최신 SoT는 docs/v2_specs/00_sot_meta/artifacts/20260124/api/mission_list_response_v2.json 참고

---

> 본 가이드는 2026-01-26 기준 XMAS Event System 미션 트리거/핸들러/이벤트 처리 구조 및 확장 방법을 요약한 것입니다.
