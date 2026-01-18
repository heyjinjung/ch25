문서 타입: 게임 정책/로직
버전: v1.0
작성일: 2026-01-19
작성자: Antigravity Agent
대상: 기획/개발 팀
상태: SoT

# V2 New User Mission Logic SoT (신규 유저 미션 로직)

## 1. 목적
신규 유저 정착을 위한 전용 미션 6종(웰컴 2종 + 스타터 4종)의 발동 조건, 진행 로직, 보상 지급 규칙을 정의한다. 본 문서는 `docs/v2_specs/02_game/v2_mission_glossary_sot_ko.md`의 상세 구현체가 된다.

## 2. 미션 구성 (Mission Structure)
신규 유저 미션은 총 6종으로 구성되며, 크게 **Welcome (즉시)**와 **Starter (달성)**로 구분된다.

### 2.1. Welcome Missions (2종)
조건 달성 즉시 지급 가능한 "가입 축하" 성격의 보상이다.
| ID | Logic Key | Title | Condition | Reward Type | Reward Value |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `M_WELCOME_01` | `welcome_signup` | 가입 축하금 | 계정 생성 즉시 | `POINT` | 3,000 |
| `M_WELCOME_02` | `welcome_telegram` | 텔레그램 연동 | 텔레그램 계정 연동 완료 | `ROULETTE_TICKET` | 1 |

### 2.2. Starter Missions (4종)
게임의 핵심 거동(Core Loop)을 학습시키기 위한 달성형 미션이다.
| ID | Logic Key | Title | Condition | Reward Type | Reward Value |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `M_START_01` | `start_play_roulette` | 룰렛 1회 플레이 | 룰렛 게임 1회 완료 | `EXP` | 100 |
| `M_START_02` | `start_play_dice` | 다이스 1회 플레이 | 다이스 게임 1회 완료 | `DICE_TICKET` | 1 |
| `M_START_03` | `start_first_win` | 첫 당첨의 기쁨 | 게임 종류 무관 1회 승리 | `POINT` | 1,000 |
| `M_START_04` | `start_first_deposit` | 첫 충전 도전 | 생애 첫 입금 완료 (금액 무관) | `BUNDLE` | Starter Pack A |

---

## 3. 정책 및 제한 (Policies & Constraints)

### 3.1. 참가 자격 (Eligibility)
- **대상**: `user.created_at` 기준 72시간(3일) 이내의 유저.
- **예외**: 어뷰징 의심 유저(`is_abuser=True`)는 미션 목록 노출 및 수령 불가.

### 3.2. 유효 기간 (Time Window)
- **Start**: 가입 시점(`created_at`)부터 타이머 시작.
- **End**: 72시간 경과 시 `EXPIRATION` 처리되어 더 이상 달성/수령 불가.
- **UI 표시**: 남은 시간을 "00:00:00" 형태로 카운트다운 노출.

### 3.3. 보상 및 재화 (Rewards)
- 모든 보상은 `v2_reward_type_standard_sot_ko.md`를 준수해야 한다.
- `BUNDLE` 타입 보상은 `Inventory`로 `Box Item` 형태로 지급되며, 유저가 직접 "사용"해야 실제 내용물을 획득한다.

---

## 4. 데이터 연동 규칙 (Integration Rules)

### 4.1. API Response Spec
`GET /api/new-user/status` 응답에 6종 미션 상태가 모두 포함되어야 한다.
- `missions`: 배열 내에 6개 객체가 존재하며 `logic_key`로 구분.
- `actions`: "Welcome" 미션 수령은 별도 액션이 아닌, 미션 리스트 내 `claim` 동작으로 통합 권장 (단, 레거시 호환을 위해 `/claim-welcome` 유지 가능).

### 4.2. Redis Golden Channel Interaction
- 미션 달성 시 실시간 피드백을 위해 `golden:v2:mission:complete` 채널로 이벤트를 발행한다.
- **Format**: `{"user_id": 123, "mission_key": "start_first_win", "reward": {...}}`

---

## 5. 운영/검증 (QA)
- [ ] 신규 가입 후 72시간 카운트다운 정확성 검증.
- [ ] 텔레그램 미연동 상태에서 연동 시 실시간 미션 달성 처리 확인.
- [ ] 첫 충전 시 `M_START_04` 자동 달성 및 보상 지급 확인.

## 6. 변경 이력
- v1.0 (2026-01-19, Antigravity Agent): 신규 유저 미션 6종 SoT 최초 정의.
