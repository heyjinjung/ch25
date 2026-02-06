# Learned Context Summary: Game Domain (Final Integrated)

## 1. 개요 (Overview)
이 문서는 게임 도메인과 관련된 SoT 문서, API 계약, 아키텍처 정의, 트러블슈팅 사례, **DB 스키마 및 운영 로직(Phase 3)**까지 모두 통합 요약한 문서입니다.
**키워드**: Roulette, Dice, Lottery, Team Battle, Golden V2, Ticket Zero

## 2. 도메인별 핵심 정책 및 아키텍처

### 2.1 Game Engine & Asset Management
- **게임 및 티켓 (Tokens)**
    - **지원 게임**: Roulette, Dice, Lottery (각 전용 엔진 및 Service 보유)
    - **표준 티켓 (GameTokenType)**: 
        - `ROULETTE_TICKET`, `DICE_TICKET`, `LOTTERY_TICKET` (기본 3종)
        - `GOLD_KEY_TICKET`, `DIAMOND_TICKET`, `TRIAL_TICKET` (특수/프리미엄)
        - **주의**: 레거시 코드(`*_COIN`, `*_TOKEN`)는 내부 매핑으로만 지원하며, 신규 개발/문서/API는 표준 명칭 필수 사용.
    - **저장소**: `UserGameWallet` (Fungible Token) - `v2_game_action_schema` 준수.

- **만능 티켓 변환 (Conversion)**
    - **정책**: 5종 티켓(Roulette, Dice, Lottery, Gold Key, Diamond) 간 상호 변환. **1:1 비율 고정**.
    - **DB**: `v2_ticket_conversion_policy` 테이블 (target_ticket_type, ratio=1/1, is_active).
    - **운영**: 어드민에서 `is_active` 토글 시 즉시 반영되어야 함.

- **보상 체계 (Reward System)**
    - **표준 RewardType**: `POINT`, `CC_POINT`, `GAME_XP`, `DIAMOND`, `TICKET`, `BUNDLE`, `NONE`.
    - **저장소 로직**:
        - `TICKET`, `DIAMOND` -> **Game Wallet**
        - `GIFTICON_*` -> **Inventory Item** (Non-fungible)
        - `VAULT` -> **User.vault_locked_balance**
    - **룰렛 특이사항**:
        - 8-segment 확장(0~7), Grade 필드(`grade`)는 DB에서 Deprecated(NULL/미사용).
        - DB Table: `v2_roulette_config`, `v2_roulette_segment`(Check Constraint `0~7`), `v2_roulette_log`.
        - UI Design: Figma 기준 **로컬 SVG 에셋**(`public/assets/roulette/*.svg`) 사용, 외부 URL 금지. 
        - 블렌드 모드: `12.svg`(multiply), `14/15.svg`(overlay) 필수 적용.

### 2.2 Golden V2 (Real-time Intervention)
- **Architecture**: Event-Driven Pub/Sub
    - **Publisher**: Game Engine (게임 결과 발행)
    - **Broker**: Redis (`golden:v2:events:game`)
    - **Consumer**: Analysis Worker (개입 결정 로직 수행)
    - **Notification**: WebSocket (`ws/golden`)
- **Safety Mechanisms (Ops Logic)**:
    - **Circuit Breaker**: 시간당 지급 총량 초과 시 자동 차단. 에러율 5% 초과 시 일시 정지.
    - **Manual Override**: 운영자가 `Emergency Stop` 실행 가능해야 함.
- **Logging**: `Ops Log Schema` 준수 (`action_type`, `trigger_id`, `payload`).
- **Standard Redis Keys (Prefix: `golden:v2:`)**:
    - 연패: `golden:v2:user:{id}:loss_streak` (1h TTL)
    - 심리: `golden:v2:user:{id}:psych_state` (24h TTL)

### 2.3 User Engagement
- **Mission & Streak**:
    - 통합 API: `GET /api/v2/mission/` 응답 내 `streak_info` 포함.
- **Ticket Zero (Bailout)**:
    - **조건**: 티켓/포인트 잔액 "완전 0", 미수령 보상 없음, 24시간 쿨다운.
    - **DB**: `v2_ticket_zero_log` (reason=`BAILOUT_GRANT`).
    - **보상**: `ROULETTE_TICKET` 1장 즉시 지급.

### 2.4 DB Schema Summary
| Table | Description | Key Columns |
| :--- | :--- | :--- |
| `v2_dice_config` | 주사위 설정 | `win/draw/lose_reward_type` & `amount` |
| `v2_lottery_prize` | 복권 등수/보상 | `label`, `weight`, `stock`(NULL=무제한) |
| `v2_roulette_segment` | 룰렛 칸 | `slot_index`(0~7), `is_jackpot` |
| `v2_ticket_conversion_policy` | 변환 규칙 | `ratio_numerator`(1), `ratio_denominator`(1) |

## 3. 주요 정합성 점검 포인트 (Alignment Checklist)

| 영역 | 점검 항목 | 기준 (SoT) | 리스크 / 확인 필요 |
| :--- | :--- | :--- | :--- |
| **Data** | **티켓 저장소** | `UserGameWallet` 테이블 | `UserInventoryItem` 혼용 적재 (상점 로직 등) |
| **Schema** | **룰렛 세그먼트** | 8개 (0~7) | DB Check Constraint와 UI 렌더링(8조각) 일치 여부 |
| **Logic** | **티켓 변환 비율** | 1:1 고정 | DB `v2_ticket_conversion_policy` 설정값 임의 변경 감지 |
| **Ops** | **서킷 브레이커** | Global Limit / Emergency Stop | 실제 구현체(`Vault2Service` 등) 존재 및 동작 여부 |
| **Enum** | **보상 타입 명칭** | Pydantic Alias(`rewardType`) | UI/API 케이스 불일치(camel vs snake) |
| **Design** | **룰렛 블렌드 모드** | Multiply/Overlay 필수 | CSS `mix-blend-mode` 적용 누락 시 시인성 저하 |

## 4. 트러블슈팅 히스토리 (History)
- **500 Error Fix (2026-01-25)**: 룰렛 8-segment DB Constraint(`0~5 -> 0~7`) 수정, Legacy User ID(FK) 불일치 해결.
- **UI Design Alignment**: 룰렛 Figma 가이드에 맞춰 로컬 SVG 에셋 교체 및 블렌드 모드 적용 필요.

## 5. 결론
Phase 3 학습을 통해 **DB 스키마의 제약조건(Check Constraints)**과 **운영 안전장치(Circuit Breaker)**, 그리고 **프론트엔드 디자인 구현 세부사항(SVG Blend Modes)**까지 파악했습니다. 게임 도메인은 이제 데이터-로직-UI 전반에 걸쳐 SoT가 명확하므로, 이를 바탕으로 정확한 매핑표 업데이트가 가능합니다.
