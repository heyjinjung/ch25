# Golden V2 Game Engine & Economy Master SoT (도메인 핵심 인프라)

**문서 정보**
- **문서 타입**: 도메인 인프라 통합 마스터 SoT (Engine & Economy Master)
- **버전**: v1.0
- **최종 업데이트**: 2026-02-06
- **상태**: 🟢 완료
- **대상**: 개발팀, 디자인팀, 운영팀, 인프라팀

---

## 1. 개요
본 문서는 Golden V2의 게임 엔진 유형, 자산 관리 아키텍처, UI 시각 표준 및 경제 로그 시스템을 하나로 통합한 마스터 가이드입니다. 7개의 개별 엔진 및 경제 SoT 문서를 기반으로 하며, 도메인 전반의 기술적 준거와 운영 표준을 정의합니다.

---

## 2. 게임 엔진 및 토큰 아키텍처 (Game Engine & Tokens)
*참조: [learned_context_summary_game.md](file:///c:/Users/JAVIS/ch/ch25/docs/SOT/game/learned_context_summary_game.md)*

### 2.1 지원 게임 및 전용 엔진
Golden V2는 각 게임별로 독립적인 서비스 엔진을 보유하며, 전용 티켓을 소모합니다.
- **Roulette**: `ROULETTE_TICKET` (8-segment 기반 스핀 엔진)
- **Dice**: `DICE_TICKET` (승/무/패 보상 배율 엔진)
- **Lottery**: `LOTTERY_TICKET` (가중치 기반 당첨 및 퍼즐 드랍 엔진)
- **특수 티켓**: `GOLD_KEY_TICKET` (골드 룰렛용), `DIAMOND_TICKET` (프리미엄), `TRIAL_TICKET` (무료 체험용)

### 2.2 만능 티켓 변환 정책 (Ticket Conversion)
- **원칙**: 모든 표준 티켓(Roulette, Dice, Lottery, Gold Key, Diamond) 간의 상질의 변환을 지원함.
- **환율**: **1:1 비율 고정** (하드코딩 정책).
- **인프라**: `v2_ticket_conversion_policy` 테이블에서 `is_active`를 통해 변환 가능 여부 제어.

---

## 3. 보상 타입(RewardType) 통합 매핑표
*참조: [reward_type_sot_mapping_v2_fulltable.md](file:///c:/Users/JAVIS/ch/ch25/docs/SOT/game/reward_type_sot_mapping_v2_fulltable.md)*

시스템 전반에서 사용되는 `RewardType` Enum과 정책 명칭, DB 저장값의 매핑 기준입니다.

| SoT (Enum) | 정책/운영 명칭 | DB 저장값 | 저장소 (Storage) |
| :--- | :--- | :--- | :--- |
| **POINT** | 포인트 / VAULT | `POINT` | `user.vault_locked_balance` |
| **DIAMOND** | 다이아몬드 | `DIAMOND` | `UserGameWallet` |
| **GOLD_KEY** | 골드키 / 황금열쇠 | `GOLD_KEY` | `UserGameWallet` |
| **TICKET_ROULETTE** | 룰렛 티켓 | `TICKET_ROULETTE` | `UserGameWallet` |
| **GIFTICON_BAEMIN** | 배민 기프티콘 | `GIFTICON_BAEMIN` | `UserInventoryItem` |
| **PUZZLE_C1/C2/J/M**| 퍼즐 조각 (4종) | `PUZZLE_*` | `UserGameWallet` |
| **GAME_XP** | 경험치 / XP | `GAME_XP` | `user.experience` |
| **BUNDLE** | 보상 번들 | `BUNDLE` | (중첩 처리) |

---

## 4. 룰렛 UI 시각 표준 (Figma-to-SVG Manual)
*참조: [roulette_figma_svg_manual_v2_20260125.md](file:///c:/Users/JAVIS/ch/ch25/docs/SOT/game/roulette_figma_svg_manual_v2_20260125.md)*

룰렛 UI는 외부 URL을 배제하고 로컬 SVG 에셋만을 사용하여 Figma 디자인을 1:1 재현해야 합니다.

### 4.1 필수 블렌드 모드 (Blend Modes)
- **12.svg**: `mix-blend-multiply` (상단 질감/그림자)
- **14.svg / 15.svg**: `mix-blend-overlay` (광원 및 글로우 효과)
- **순서**: 12(하단) → Vector4~11(조각) → 14/15(상단) 순으로 배치해야 의도한 조명 효과가 나타남.

### 4.2 레이어 계층 및 배치
- **Container**: `aspect-[292/293]` 비율 고정.
- **Frame**: `Vector`, `Vector2` (고정 배경).
- **Wheel**: 회전 컨테이너 내부에 조각, 센터캡(`16.svg`), 오버레이를 통합.
- **Pointer**: `13.svg` (최상단 고정).

---

## 5. 어드민 게임 컨피그 스키마 (Admin Schema)
*참조: [v2_admin_game_config_schema_ko.md](file:///c:/Users/JAVIS/ch/ch25/docs/SOT/game/v2_admin_game_config_schema_ko.md)*

### 5.1 룰렛 컨피그 (`AdminRouletteConfig`)
- **슬롯**: 반드시 8개(Index 0~7)를 유지해야 하며, 부족하거나 초과할 경우 백엔드에서 보정(Padding/Clip) 처리함.
- **Grade Deprecation**: `grade` 필드는 더 이상 사용하지 않으며, `ticket_type`만으로 설정을 구분함.

### 5.2 복권 컨피그 (`AdminLotteryConfig`)
- **재고(Stock)**: `Optional[int]`로 설정하며, `None`일 경우 무제한으로 간주함.
- **유효성**: 활성 Prize가 1개 이상 존재해야 하며, 가중치(`weight`) 합이 0보다 커야 함.

---

## 6. 경제 자산 로그 및 라우터 (Economy Logs)
*참조: [v2_economy_asset_log_routes_ko_v1.0.md](file:///c:/Users/JAVIS/ch/ch25/docs/SOT/game/v2_economy_asset_log_routes_ko_v1.0.md)*

모든 유저 자산 변동은 `/api/v2/admin` 경로를 통해 추적 및 관리됩니다.

### 6.1 지갑 및 인벤토리 로그
- **조회**: `GET /inventory/logs` (티켓 및 아이템 변동 통합 조회).
- **지급**: `POST /inventory/tickets` (티켓), `POST /inventory/items` (아이템).

### 6.2 금고(Vault) 로그 및 조정
- **목록**: `GET /vault/users` (유저별 금고 현황).
- **상세**: `GET /vault/users/{user_id}/ledger` (금융권 수준의 입출금 원장 조회).
- **조정**: `POST /vault/force-edit` (어드민 강제 조정 권한).

---

## 7. 인게이지먼트 로직: 보상 및 스트릭 (Engagement)
*참조: [v2_attendance_streak_logic_sot_ko.md](file:///c:/Users/JAVIS/ch/ch25/docs/SOT/game/v2_attendance_streak_logic_sot_ko.md)*

### 7.1 연속 출석(Streak) 규칙
- **갱신 시간**: 매일 00:00 KST (KST 고정).
- **초기화**: 전일 미접속 시 1일차로 초기화됨.
- **루프(Loop)**: 7일차 보상 수령 후 다시 1일차로 순환함.

### 7.2 티켓 제로 (Ticket Zero - Bailout)
- **목적**: 자산이 전혀 없는 유저의 재기 기회 제공.
- **조건**: 티켓/포인트/미수령 보상이 모두 0인 상태에서 24시간 쿨다운 경과 시.
- **보상**: `ROULETTE_TICKET` 1장 자동 지급.

---

## 8. 최종 검증 로그 (Full-Stack Integration)
*참조: [v2_fullstack_integration_test_logs_game_20260124.md](file:///c:/Users/JAVIS/ch/ch25/docs/SOT/game/v2_fullstack_integration_test_logs_game_20260124.md)*

2026년 1월 24일 기준, 아래 핵심 로직에 대한 전 구간 통합 테스트가 완료되었습니다:
- **Dice**: `POST /api/v2/dice/play` (정상 보상 및 로그 확인).
- **Roulette**: `GET /status` 및 `POST /play` (8-segment 매핑 확인).
- **Lottery**: `GET /status` 및 `POST /play` (가중치 기반 당첨 확인).

---

*본 문서는 Golden V2의 도메인 핵심 인프라를 정의하는 SoT이며, 모든 엔진 구현 및 디자인 시스템 적용 시 본 가이드를 최우선으로 준수해야 합니다.*
