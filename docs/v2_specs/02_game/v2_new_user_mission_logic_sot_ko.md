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

## 3. 참여 자격 및 기간
1. **대상**: 신규 가입한 모든 유저
2. **기간**: 가입 시점(`created_at`)으로부터 **7일 (168시간)**
   - 기존 72시간에서 7일로 연장됨.
   - *기간 설정은 시스템 기본값이며, 추후 어드민 정책에 따라 변경될 수 있음.*
3. **만료 처리**:
   - 7일이 지나면 "신규 유저" 탭이 비활성화되거나 미션 수행 불가 상태로 전환.
   - **UX**: "신규 유저" 탭 진입 시 우측 하단에 **Floating Action Button(FAB)** 형태로 "혜택 종료까지 남은 시간"이 카운트다운됨.

## 4. 미션 상세 (Starter Missions)
신규 유저 미션은 **총 5종**의 Starter Mission으로 구성된다 (시스템 시드 기준).

### A. 게임 플레이 & 로그인
1. **[미션] 신규 첫로그인 (NEW_USER_FIRST_LOGIN)**
   - **조건**: 서비스 최초 가입 후 로그인
   - **보상**: 3,000 POINT
   - **자동 지급**: 미션 탭 진입 시 자동 체크

2. **[미션] 신규 첫게임 (NEW_USER_FIRST_GAME)**
   - **조건**: 아무 게임(Dice, Roulette, Lottery) 1회 플레이
   - **보상**: 2,000 POINT
   - **자동 지급**: 게임 플레이 후 미션 탭 진입 시 수령 가능

3. **[미션] 신규 다음날 로그인 1일 (NEW_USER_NEW_USER_NEXT_DAY_LOGIN_1)**
   - **조건**: 가입 다음날(D+1) 로그인 (09:00 KST 기준)
   - **보상**: 1,000 POINT

### B. 커뮤니티 (Channel Join)
4. **[미션] 신규 텔레그램 채널가입 (NEW_USER_TELEGRAM_JOIN)**
   - **조건**: 공식 텔레그램 채널 입장
   - **액션**: `JOIN_TELEGRAM_CHANNEL`
   - **보상**: **PIZZA_GIFTICON_10000** (피자 1만원권)
   - **검증**: '가입 확인' 버튼 클릭 시 멤버십 확인
   - **UX Flow**:
     1. **초기 상태**: "채널 입장하기" 버튼 노출.
     2. **클릭 시**: 텔레그램 앱(공식 채널)으로 딥링크 이동 (`tg://resolve?domain=...`).
     3. **복귀 후**: 버튼이 "가입 확인"으로 변경됨 (User Interaction 유도).
     4. **확인 클릭**: `verifyChannel` API 호출하여 실제 멤버십 여부 체크.
        - **성공**: "인증되었습니다" Toast 노출 → 보상 수령(Claim) 가능 상태로 전환.
        - **실패**: "채널 가입이 확인되지 않았습니다" 에러 Toast 노출.

5. **[미션] 신규 CC채널가입 (NEW_USER_CC_CHANNEL_JOIN)**
   - **상태**: ⛔ **폐기 (Deprecated)** - 운영 정책에 따라 더 이상 제공되지 않음.
   - **조건**: 공식 CC 채널 입장
   - **액션**: `JOIN_CC_CHANNEL` (비활성)
   - **보상**: 0 POINT

---

## 5. 데이터 연동 규칙 (Integration Rules)

### 5.1. API Response Spec
`GET /api/new-user/status` 응답에 6종 미션 상태가 모두 포함되어야 한다.
- `missions`: 배열 내에 6개 객체가 존재하며 `logic_key`로 구분.
- `actions`: "Welcome" 미션 수령은 별도 액션이 아닌, 미션 리스트 내 `claim` 동작으로 통합 권장 (단, 레거시 호환을 위해 `/claim-welcome` 유지 가능).

### 5.2. Redis Golden Channel Interaction
- 미션 달성 시 실시간 피드백을 위해 `golden:v2:mission:complete` 채널로 이벤트를 발행한다.
- **Format**: `{"user_id": 123, "mission_key": "start_first_win", "reward": {...}}`

---

## 5. 운영/검증 (QA)
- [ ] 신규 가입 후 72시간 카운트다운 정확성 검증.
- [ ] 텔레그램 미연동 상태에서 연동 시 실시간 미션 달성 처리 확인.
- [ ] 첫 충전 시 `M_START_04` 자동 달성 및 보상 지급 확인.

## 6. 변경 이력
- v1.0 (2026-01-19, Antigravity Agent): 신규 유저 미션 6종 SoT 최초 정의.
