# Golden V2 핵심 경제체계 용어 (Core Economy Glossary)

<!-- PATCH_NOTE 2026-01-18: V2 전용 범위 표기 강화 및 공유용 주석 추가. -->
<!-- PATCH_NOTE 2026-01-18: 금고/지갑/보상/레거시 규칙 보강 및 용어 정리. -->

**문서 타입**: 용어집(Glossary) / V2 Core SoT
**버전**: v2.3 (V2 Init + Ops/Realtime Expansion)
**작성일**: 2026-01-18
**상태**: SoT (Source of Truth)
**프로젝트**: Golden V2

---

## 1. 목적 (Purpose)
- Golden V2 프로젝트의 핵심인 **적응형 리텐션 엔진(Adaptive Retention Engine)**과 **실시간 개입**을 지탱하는 경제 용어를 정의합니다.
- 기존 V1 용어를 계승하되, V2 아키텍처(Redis/Worker) 환경에서의 데이터 소유권(Ownership)을 명확히 합니다.

## 2. 핵심 자산/계정 (Economy Entities)

### 2.1 금고 (Vault) - The Core
V2에서도 금고는 현금성 자산의 유일한 저장소입니다.

| 용어 | 키워드 | SoT (DB.Field) | V2 Cache Policy (Redis) | 설명 |
| :--- | :--- | :--- | :--- | :--- |
| **금고포인트** | `Vault Locked` | `user.vault_locked_balance` | `user:{id}:vault:locked` | 포인트/현금성 보상이 최종 누적되는 곳. **DB SoT 우선, Redis는 캐시.** |
| **금고 사용** | `Vault Spent` | `user.vault_spent_total` | - | 상점/바이인에 사용한 누적액. |
| **활동 상태** | `Activity Status` | (Computed) | `user:{id}:status` | `ACTIVE`, `WARNING`, `INACTIVE` (Strict Policy 적용). |

### 2.2 지갑 (Game Wallet) - The Play Tokens
게임 플레이에 사용되는 재화입니다.

| 용어 | 타입(Enum) | SoT | 설명 |
| :--- | :--- | :--- | :--- |
| **룰렛티켓** | `ROULETTE_TICKET` | `user_game_wallet` | Roulette Ticket |
| **다이스티켓** | `DICE_TICKET` | `user_game_wallet` | Dice Ticket |
| **골드키티켓** | `GOLD_KEY_TICKET` | `user_game_wallet` | Gold Key Ticket |
| **다이아티켓** | `DIAMOND_TICKET` | `user_game_wallet` | Diamond Ticket |
| **복권티켓** | `LOTTERY_TICKET` | `user_game_wallet` | Lottery Ticket |

### 2.3 인벤토리 (Inventory)
보관형 아이템 및 교환권입니다.

| 용어 | 타입 접두어 | SoT | 설명 |
| :--- | :--- | :--- | :--- |
| **다이아** | `DIAMOND` | `user_inventory_item` | 상점 전용 결제 재화 (유료 구매). |
| **다이아포인트** | `DIAMOND_POINT` | `user_inventory_item` | 사용 시 **금고포인트**로 교환. |
| **기프티콘** | `GIFTICON_*` | `user_inventory_item` | 외부 교환 가능한 실물 경품 쿠폰. (브랜드별 네이밍 재확인 필요) |

---

## 3. 보상 및 성장 (Reward & Progression)

### 3.1 보상 타입 (Reward Types)
V2 게임 엔진이 반환하는 표준 보상 타입입니다.

- **`POINT`**: 금고포인트.
- **`GAME_XP`**: 레벨포인트.
- **`DIAMOND`**: 인벤토리 다이아.
- **`TICKET`**: 만능티켓(룰렛티켓/다이스티켓/골드키티켓/다이아티켓/복권티켓으로 변환 가능).
- **`NONE`**: 꽝.

#### 3.1.1 보상 타입 ↔ 지급 경로 매핑 (현행 고정표)
아래 표가 **현행 구현 기준** 단일 매핑입니다. 충돌 시 이 표를 우선합니다.

| reward_type | 지급 경로(SoT) | 구현 상태 | 비고 |
| :--- | :--- | :--- | :--- |
| POINT | 금고포인트 `user.vault_locked_balance` | 현행 | 기본 경로 |
| CC_POINT | 씨씨외부포인트 `user.vault_locked_balance` | 현행 | 외부 포인트 계열 |
| GAME_XP | 레벨포인트 `level_point` | 현행 | 레벨 전용 |
| DIAMOND | 인벤토리 `user_inventory_item` | 현행 | 인벤토리 지급 |
| TICKET | 인벤토리 `user_inventory_item` | 현행 | 만능티켓 지급 |
| BUNDLE | 복합(금고 + 인벤토리) | 현행 | 패키지 지급 |
| TICKET_BUNDLE | 인벤토리 `user_inventory_item` | 현행 | 티켓 묶음 |
| NONE | 없음 | 현행 | no-op |

### 3.2 레벨 (Level)
- **레벨포인트 SoT**: `level_point` (GAME_XP)
- **Rule**: 레벨포인트는 `GAME_XP` 보상 타입으로만 획득 가능. 금고포인트와 무관.

#### 3.2.1 확장 개념(신규)
- **룰렛레벨포인트**
- **주사위레벨포인트**
- **복권레벨포인트**
- **CC레벨포인트** (만능 레벨포인트 개념)

---

## 4. V2 아키텍처 특이사항 (Golden V2 Specifics)

### 4.1 실시간 상태 (Real-time State)
Golden V2의 "실시간 개입"을 위한 **V2 전용 정책**이며, **DB SoT 우선, Redis는 캐시**입니다.

- **연패 카운트 (`current_loss_streak`)**: Redis `golden:v2:user:{user_id}:loss_streak`
- **세션 시작 잔액 (`session_start_balance`)**: Redis `golden:v2:user:{user_id}:session_start_balance`

### 4.2 데이터 흐름 원칙
1.  **적립(Earn)**: 게임 결과 -> Redis Pub -> Worker -> DB Write (Async)
2.  **조회(Read)**: Critical Path(게임 시작)는 Redis Cache 우선 조회 -> Miss 시 DB 조회.

## 5. 레거시/확장 라벨링 (Legacy & Extension)
이 섹션은 **현행 구현과 혼재되는 항목**을 명확히 분리합니다.

### 5.1 레거시/확장 항목
- **Legacy Enum 매핑**: ROULETTE_COIN→ROULETTE_TICKET, DICE_TOKEN→DICE_TICKET, GOLD_KEY→GOLD_KEY_TICKET, DIAMOND_KEY→DIAMOND_TICKET, LOTTERY_TICKET→LOTTERY_TICKET
- **GameTokenType.DIAMOND / VAULT / 키 조각(Fragment)**: 레거시/확장 혼재. 신규 표준 보상은 3.1.1 매핑표를 우선합니다.
- **문서의 Redis 키 네이밍(`user:{id}:...`)**: 개념 표기(레거시)이며, 현행 구현은 `golden:v2:user:{user_id}:...` prefix를 사용합니다.

### 5.2 사용 목적/제한
- 레거시/확장 항목은 **신규 기능 설계의 기준으로 사용하지 않습니다**.
- 운영/테스트에서 필요할 경우에만 사용하며, 신규 표준은 3.1.1 매핑표에 고정합니다.

### 5.3 폐기 예정 표기
- 폐기 예정 항목은 아래 형식으로 기록합니다.
	- **폐기 예정**: {항목명} / **버전**: {vX.Y} / **일자**: {YYYY-MM-DD}

---

## 6. SoT 값 확장 (2026-01-28)

### 6.1 골든아워(Golden Hour) 용어 및 키 매핑

| 용어 | 키워드 | SoT(내부/저장) | SoT(통신/이벤트) | 설명 |
| :--- | :--- | :--- | :--- | :--- |
| 골든아워 전역 활성 | `Golden Hour Active(Global)` | `golden_hour_config.enabled` | `GET /admin/api/vault/golden-hour` | 전역 골든아워 활성(시간창/강제 ON/OFF의 기반) |
| 수동제어 | `Manual Override` | `golden_hour_config.manual_override` | `POST /admin/api/vault/golden-hour` | `AUTO`/`FORCE_ON`/`FORCE_OFF` |
| 전역 배율 | `Multiplier(Global)` | `golden_hour_config.multiplier` | `GET /admin/api/vault/golden-hour` | 전역 배율(현재 V2 주사위 보상 배율 SoT는 아님) |
| 주사위 적용 게이트 | `Dice Golden Hour Enabled` | `V2DiceConfig.enable_golden_hour` | `GET /api/v2/admin/game/dice/config` | 주사위 게임에서 골든아워 적용 여부 SoT |
| 주사위 배율 | `Dice Golden Hour Multiplier` | `V2DiceConfig.golden_hour_multiplier` | `PUT /api/v2/admin/game/dice/config/{config_id}` | 주사위 보상 배율 SoT(골든아워 활성 시 적용) |
| OpsPlan 제어 | `OpsPlan GOLDEN_HOUR` | (DB Config 업데이트) | `payload.action` / `payload.multiplier` | `action=FORCE_ON|FORCE_OFF|MULTIPLIER_SET` |

### 6.2 운영/CRM 워크플로우 상태 용어 (Intervention Status)

| 상태 | 키워드 | 의미 |
| :--- | :--- | :--- |
| `PENDING_APPROVAL` | 승인 대기 | 트리거 감지 후 즉시 적재되며 운영자 승인 전까지 발송/지급 금지 |
| `APPROVED` | 승인됨 | 발송/지급 가능한 상태 |
| `REJECTED` | 거절됨 | 운영자 거절로 종료 |
| `SENT` | 발송완료 | 실제 지급/푸시까지 완료된 최종 상태 |

### 6.3 실시간 이벤트/관제 채널 용어

| 채널 | 키워드 | 설명 |
| :--- | :--- | :--- |
| `golden:v2:events:game` | Game Stream | 게임 이벤트 스트림 |
| `golden:v2:events:intervention` | Intervention Stream | 개입 이벤트 스트림 |

---

## 7. 변경 이력
- v2.3 (2026-01-28, GitHub Copilot): 주사위 게임 기준 골든아워/Redis 키 SoT 정합화(키 prefix, 페이로드/채널 정정).
- v2.2 (2026-01-28, GitHub Copilot): 골든아워/승인상태/실시간 채널 SoT 용어 확장 및 키 매핑 명시.
- v2.1 (2026-01-18, GitHub Copilot): 용어/매핑/레거시 규칙 보강.
- v2.0 (2026-01-18): Golden V2 프로젝트 출범에 맞춰 이관 및 아키텍처 컨텍스트 추가.
- v1.1 (2026-01-16): 기존 `2026_core_economy_glossary_ko.md`.
