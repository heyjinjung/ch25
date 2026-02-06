# Golden V2 Game Technical Policy & Standardization Master SoT

**문서 정보**
- **문서 타입**: 도메인 정책 및 표준화 통합 마스터 SoT (Policy & Standardization Master)
- **버전**: v1.0
- **최종 업데이트**: 2026-02-06
- **상태**: 🟢 완료
- **대상**: 개발팀, 기획팀, QA팀, 운영팀

---

## 1. 개요
본 문서는 Golden V2 게임 엔진의 액션 스키마, 표준화 설계, 기프티콘 네이밍 규칙, 골든아워 정책 및 미션 용어 사전을 하나로 통합한 마스터 가이드입니다. 6개의 개별 정책 및 표준화 SoT 문서를 기반으로 하며, 시스템의 일관된 동작과 데이터 정합성을 보장하기 위한 핵심 지침을 제공합니다.

---

## 2. 범용 게임 액션 계약 (Universal Game Action Contract)
*참조: [v2_game_action_schema_sot_ko.md](file:///c:/Users/JAVIS/ch/ch25/docs/SOT/game/v2_game_action_schema_sot_ko.md)*

Golden V2의 모든 미니게임(룰렛, 주사위, 복권)은 통일된 요청/응답 구조를 준수해야 합니다.

### 2.1 공통 응답 봉투 (Common Response Envelope)
모든 `PlayResponse`는 다음 필드를 포함하여 프론트엔드 파싱 경로를 일원화합니다.
- `result`: "WIN", "LOSE", "DRAW" 중 하나.
- `game_data`: 게임별 고유 결과 (예: 주사위 눈, 룰렛 세그먼트).
- `vault_earn`: 실제 적립된 금고 포인트.
- `retention_hooks`: `fever_gauge`, `next_action_available` (야수 모드 등).
- `growth_info`: `season_pass` (XP, 레벨업 여부), `streak_info`.

### 2.2 표준 에러 코드
비즈니스 로직 수준의 실패 시 `400 Bad Request`와 함께 다음 코드를 반환합니다.
- `NOT_ENOUGH_TOKENS`: 티켓 부족.
- `DAILY_LIMIT_REACHED`: 일일 플레이 제한 초과.
- `INVALID_BET`: 유효하지 않은 베팅값.
- `RATE_LIMITED`: Redis 기반 요청 제한.

---

## 3. 게임 엔진 표준화 및 운영 규칙 (Engine Standardization)
*참조: [v2_game_engine_sot_ko.md](file:///c:/Users/JAVIS/ch/ch25/docs/SOT/game/v2_game_engine_sot_ko.md), [v2_game_engine_standardization_design_ko.md](file:///c:/Users/JAVIS/ch/ch25/docs/SOT/game/v2_game_engine_standardization_design_ko.md)*

### 3.1 룰렛 운영 표준
- **유형**: 4종 표준 (기본, 고액-골드, 고액-다이아, 체험판).
- **세그먼트**: **8개 고정** (Index 0~7).
- **접근 제어**: `grade`(유저 등급) 기반 차단은 **폐기**됨. 오직 해당 티켓 보유 여부로만 검증.
- **Config 강제**: 활성 컨피그는 단일해야 하며, 스키마 불일치 시 즉시 실패(`InvalidConfig`) 처리.

### 3.2 원자적 게임 플로우 (Atomic Play Flow)
1. **자격 검증**: Feature 활성화, 토큰 소모 가능성, 금고 정책(입금 제한 등) 확인.
2. **컨피그 로딩**: 스키마 강제 적용 및 확률/보상 유효성 검사.
3. **결과 산출**: RNG 및 DDA 적용. 구조는 Action Schema 준수.
4. **보상 지급**: `RewardType` 표준 준수. 금고 경로(POINT/CC_POINT) 우선순위 적용.
5. **로깅**: 게임 로그와 이벤트를 기록하며, 팀배틀 반영 등 외부 연동은 **비차단(Non-blocking)** 방식으로 수행.

---

## 4. 자산 네이밍 및 골든아워 정책 (Assets & Boosting)
*참조: [v2_gifticon_naming_sot_ko.md](file:///c:/Users/JAVIS/ch/ch25/docs/SOT/game/v2_gifticon_naming_sot_ko.md), [v2_golden_hour_policy_sot_ko.md](file:///c:/Users/JAVIS/ch/ch25/docs/SOT/game/v2_golden_hour_policy_sot_ko.md)*

### 4.1 기프티콘 네이밍 규격
- **포맷**: `{BRAND}_GIFTICON_{AMOUNT}` (예: `STARBUCKS_GIFTICON_5000`).
- **AMOUNT**: 100원 단위 절사된 KRW 정수.
- **확장 규칙**: 브랜드명은 영문 대문자(공백 제외)를 사용하며, 신규 브랜드는 반드시 SoT 문서 등록 후 DB 연동 필수.

### 4.2 골든아워 (Golden Hour) 정책
- **효과**: `POINT` 및 `GAME_XP` 획득량에 배율(`Multiplier`, 기본 x2.0) 적용.
- **스케줄**: 매일 20:00 ~ 22:00 (KST) 자동 활성화.
- **우선순위**: 운영자의 `manual_override` (FORCE_ON/OFF)가 자동 스케줄보다 우선함.
- **UI**: 활성화 시 상단 전용 배너 노출 및 골드 테마 연출 적용.

---

## 5. 미션 및 인게이지먼트 프레임워크 (Missions)
*참조: [v2_mission_glossary_sot_ko.md](file:///c:/Users/JAVIS/ch/ch25/docs/SOT/game/v2_mission_glossary_sot_ko.md)*

### 5.1 미션 핵심 용어 및 SoT
- **Mission**: 운영 정책(보상, 목표, `logic_key`).
- **Progress**: 유저별 수행 상태. 지급 여부의 최종 기준은 `is_claimed` 필드임.
- **Approval**: 특정 미션의 경우 지급 전 관리자 승인 단계를 거침.

### 5.2 카테고리별 보상 제약
| 카테고리 | 주요 주기 | 허용 보상 타입 (Constraint) |
| :--- | :--- | :--- |
| **DAILY** | 일 단위 | `POINT`, `ROULETTE_TICKET`, `DICE_TICKET` |
| **WEEKLY** | 주 단위 | `DIAMOND`, `GOLD_KEY_TICKET`, `LOTTERY_TICKET` |
| **NEW_USER** | 가입 후 7일 | `BUNDLE` (Starter Pack), `GIFTICON_*` |
| **SPECIAL** | 기간 한정 | 제약 없음 (ALL) |

---

## 6. 고급 제작 로직: 퍼즐 시스템 (Puzzle Crafting)
*참조: [v2_game_engine_sot_ko.md](file:///c:/Users/JAVIS/ch/ch25/docs/SOT/game/v2_game_engine_sot_ko.md)*

### 6.1 퍼즐 합체 (Crafting)
- **대상**: 복권 게임에서 획득한 퍼즐 조각 4종 (`PUZZLE_C1`, `C2`, `J`, `M`).
- **레시피**: 각 조각 1개씩 소모 → **GOLD_KEY_TICKET 1개** 획득.
- **API**: `POST /api/v2/exchange/craft` (target: `GOLD_KEY_FROM_PUZZLE`).
- **트랜잭션**: 소모와 지급이 원자적으로 수행되어야 하며, 부족 시 `NOT_ENOUGH_TOKENS` 에러 반환.

---

## 7. 기술 검증 및 QA 가이드
- **스키마 준수**: 모든 API 응답이 `v2_game_action_schema`의 `game_data` 구조를 정확히 따르는가?
- **부스팅 확인**: 골든아워 배율이 `POINT`와 `XP`에만 적용되고, 티켓/아이템 보상에는 영향을 주지 않는가?
- **네이밍 정합성**: 인벤토리 `item_type`이 `{BRAND}_GIFTICON_{AMOUNT}` 포맷을 준수하는가?
- **원자성**: 퍼즐 제작 시 조각은 차감되었으나 티켓이 지급되지 않는 고립 현상이 없는가?
- **비차단 연동**: 팀배틀 서버 장애가 기본 게임 플레이 결과 반환에 영향을 주지 않는가?

---

*본 문서는 Golden V2의 게임 정책 및 엔진 표준화를 정의하는 최상위 SoT이며, 모든 신규 게임 개발 및 기존 로직 수정 시 본 마스터 가이드를 준수해야 합니다.*
