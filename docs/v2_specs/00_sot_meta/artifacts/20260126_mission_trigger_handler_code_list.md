# XMAS 미션 트리거/핸들러/매칭 코드 전수조사 리스트 (2026-01-26)

## 1. action_type/logic_key 기반 미션 트리거/매칭/핸들러 전체 리스트

| 구분 | 트리거/핸들러 위치 | 매칭 방식 | 어드민 정책만으로 동작? | 비고 |
|------|-------------------|-----------|----------------------|------|
| 일반 미션 | V2MissionService.update_progress | action_type/logic_key DB 매칭 | O | action_type=이벤트명, DB에만 등록하면 동작 (ex: PLAY_GAME, LOGIN 등) |
| 별칭 미션 | ACTION_TYPE_ALIASES (mission_service.py) | alias 매핑 | O | ex: PLAY → PLAY_GAME, JOIN_CHANNEL 등 |
| 커스텀 미션 | update_progress 호출 직접 추가 필요 | 코드 내 직접 트리거 | X | 신규 이벤트(예: login_next_day)는 트리거 코드에 update_progress 호출 필요 |
| 스트릭/출석 | sync_play_streak, get_streak_info 등 | User.play_streak 등 특수 필드 | X | streak/출석은 별도 핸들러/이벤트 필요 |
| 골든아워 | _is_golden_hour_mission | logic_key에 golden_hour 포함 | △ | 정책+코드 조건 필요 |
| 수동 클레임 | claim_reward | is_completed & is_claimed | O | auto_claim=False면 수동 클레임 필요 |
| 자동 클레임 | update_progress 내 auto_claim | auto_claim=True | O | 목표 달성 시 자동 지급 |

---

## 2. 이벤트별 update_progress 호출 위치/조건

| 이벤트 | 호출 위치 | action_type | 어드민 정책만으로 동작? | 비고 |
|--------|-----------|-------------|----------------------|------|
| 로그인 | v2/api/routes.py 등 | LOGIN | O | 로그인 성공 시 update_progress(user_id, "LOGIN", 1) |
| 게임플레이 | v2/api/routes.py 등 | PLAY_GAME | O | 게임 플레이 시 update_progress(user_id, "PLAY_GAME", 1) |
| 룰렛/복권 | v2/api/routes.py 등 | ROULETTE_PLAY, LOTTERY_PLAY 등 | O | 각 게임별로 별도 action_type 사용 |
| 커스텀(신규) | (직접 추가 필요) | 신규 action_type | X | ex: "LOGIN_NEXT_DAY" 등은 트리거 코드에 직접 추가 필요 |

---

## 3. 어드민 정책만으로 동작/불가 미션 구분

- **동작 가능:**
  - action_type이 기존 이벤트(로그인, 게임 등)와 동일하거나, alias로 매핑된 경우
  - DB/어드민에서 미션 row만 추가하면 자동 동작
- **동작 불가(코드 추가 필요):**
  - 신규 이벤트/미션(예: login_next_day 등) → 트리거 코드에 update_progress(user_id, "LOGIN_NEXT_DAY", 1) 직접 추가 필요
  - streak, golden_hour 등 특수 미션 → 별도 핸들러/이벤트/조건 필요

---

## 4. 실무 적용 TIP
- 신규 미션 등록 시, action_type이 실제로 어떤 이벤트에서 update_progress로 호출되는지 반드시 확인
- 기존 action_type/alias 목록은 mission_service.py 내 ACTION_TYPE_ALIASES 참고
- 커스텀 미션은 반드시 트리거 코드에 update_progress 호출 추가 필요
- 정책/코드 동기화 필수 (정책만 바꿔도 되는 미션/코드 추가가 필요한 미션 구분)

---

> 본 리스트는 2026-01-26 기준 XMAS Event System 미션 트리거/핸들러/매칭 구조를 전수조사한 결과입니다. 실무 정책/코드 동기화에 바로 활용하세요.
