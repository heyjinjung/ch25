# Golden V2 Game Technical Master SoT (기술 수정 및 엔진 로직 통합)

**문서 정보**
- **문서 타입**: 기술 통합 마스터 SoT (Technical Master System of Truth)
- **버전**: v1.0
- **최종 업데이트**: 2026-02-06
- **상태**: 🟢 완료
- **대상**: 개발팀, QA팀, 어드민 운영자

---

## 1. 개요
본 문서는 Golden V2 게임 엔진의 기술적 수정 내역, 버그 조사 결과 및 고급 게임 로직(퍼즐 시스템, 레저 분리 등)을 하나로 통합한 기술 마스터 가이드입니다. 6개의 개별 기술 SoT 문서를 기반으로 하며, 시스템의 안정성과 데이터 정합성을 유지하기 위한 핵심 지침을 제공합니다.

---

## 2. 게임 엔진 UI 및 API 기술 표준
*참조: [20260127_dice_modal_vault_earn_display_fix.md](file:///c:/Users/JAVIS/ch/ch25/docs/SOT/game/20260127_dice_modal_vault_earn_display_fix.md), [20260127_lottery_prize_partial_update_fix.md](file:///c:/Users/JAVIS/ch/ch25/docs/SOT/game/20260127_lottery_prize_partial_update_fix.md)*

### 2.1 결과 모달 데이터 표시 로직 (Display Logic)
게임 결과 모달에서 사용자에게 보여줄 금액 정보는 정책에 따른 실제 적립액(`vault_earn`)과 게임 설정 보상액(`reward_amount`)을 명확히 구분하여 처리해야 합니다.

- **표시 우선순위 (Fallback)**: `vault_earn`이 0일 경우, 정책(금고 한도 초과 등)에 의해 적립되지 않은 것이므로 사용자 경험을 위해 `game_data.reward_amount`를 대신 표시함.
- **음수 및 색상 처리**: 
    - 패배 시 차감액: `Math.max(0, x)`를 사용하지 않고 실제 음수 값을 표시하며, `text-red-400` 색상을 적용함 (예: `-200P`).
    - 승리 시 적립액: `+` 접두사를 추가하여 시각적 인지도를 높임 (예: `+500P`).

### 2.2 어드민 API 부분 업데이트 (Partial Update)
리소스 전체 교체가 아닌 필요한 필드만 수정할 수 있도록 유연한 API 계약을 준수합니다.

- **백엔드**: Pydantic 스키마(`LotteryPrizeUpdateRequest`)의 모든 필드를 `Optional`로 선언하고, `None`이 아닌 데이터만 DB에 반영함.
- **프론트엔드**: `Partial<Dto>` 타입을 사용하여 변경된 필드만 추출하여 전송하되, `stock`과 같이 `0`이나 `null`이 의미를 갖는 필드는 명시적으로 처리함 (`stock ?? null`).

---

## 3. 로터리(복권) 시스템 정합성 표준
*참조: [20260127_lottery_ui_backend_tier_sync.md](file:///c:/Users/JAVIS/ch/ch25/docs/SOT/game/20260127_lottery_ui_backend_tier_sync.md), [20260131_복권_퍼즐조각_미지급_버그.md](file:///c:/Users/JAVIS/ch/ch25/docs/SOT/game/20260131_복권_퍼즐조각_미지급_버그.md)*

### 3.1 결과 티어(Tier) 분기 및 연출 표준
백엔드 보상 타입에 따라 UI 연출을 3단계로 엄격히 분리합니다.

| 티어 | 보상 타입 기준 | UI 연출 (Effect) |
| :--- | :--- | :--- |
| **BIG_WIN** | 2000P 이상 포인트, GOLD_KEY, DIAMOND | **Celestial Reveal** (콘페티, 테두리 Shine, EncryptedText) |
| **NORMAL** | 기프티콘, 바우처, 일반 티켓, 아이템/퍼즐 | **Stable Victory** (부드러운 글로우, 탄력 모션) |
| **FAIL** | 보상 없음 (`NONE`) | 일반 로직 |

### 3.2 상품 설정 및 지급 유효성 검사
- **Reward Amount**: 복권 상품 설정(`v2_lottery_prize`) 시 `reward_amount`가 0으로 설정되어 보상이 미지급되는 현상을 방지해야 함. (PUZZLE_C2 버그 사례: amount=0으로 설정되어 `reward_service`에서 Early Return 발생).
- **Early Return 주의**: `reward_amount == 0` 조건이 필요한 비즈니스 로직(예: 퍼즐 조각 1개 지급)을 차단하지 않는지 상시 확인.

---

## 4. 티켓 레저 및 토큰 관리 정책
*참조: [20260128_게임_티켓_레저_분리_테스트_실패_원인_및_핵심_수정_내역.md](file:///c:/Users/JAVIS/ch/ch25/docs/SOT/game/20260128_게임_티켓_레저_분리_테스트_실패_원인_및_핵심_수정_내역.md)*

### 4.1 V2/V1 토큰 우선순위 및 레저(Ledger) 분리
게임 플레이 시 사용되는 티켓 소비 로직은 V2 표준과 V1 레거시 간의 명확한 우선순위를 따릅니다.

- **소비 순서**: V2 표준 티켓 (`ROULETTE_TICKET` 등) 우선 소비 → 부족 시 V1 레거시 코인 (`ROULETTE_COIN` 등) Fallback 차감.
- **레저 기록 원칙**: 
    - 실제로 차감된 토큰 타입으로 **정확히 1건**의 레저(`UserGameWalletLedger`) 기록 보장.
    - Fallback 발생 시 기록이 누락되거나 중복(-1이 2건 기록 등)되지 않도록 `GameWalletService` 내에서 원자적 처리.

### 4.2 토큰 네이밍 및 별칭(Alias) 정책
- `GameTokenType` Enum 내에서 V2 표준명과 V1 별칭(Alias)을 엄격히 관리함.
- DB 컬럼명, 코드 내 Enum 명칭, 프론트엔드 `rewardType` 케이스가 1:1로 일치해야 장애를 방지할 수 있음.

---

## 5. 퍼즐 컬렉션 및 시스템 정규화 (Puzzle System)
*참조: [20260131_puzzle_collection_gold_key_craft.md](file:///c:/Users/JAVIS/ch/ch25/docs/SOT/game/20260131_puzzle_collection_gold_key_craft.md)*

### 5.1 퍼즐 토큰 규격화 및 Deprecation
- **Active Tokens**: `PUZZLE_C1`, `PUZZLE_C2`, `PUZZLE_J`, `PUZZLE_M` (4종)
- **Deprecated**: `PUZZLE_C` (레거시 코드 사용 금지, C1/C2로 분리됨).
- **마이그레이션**: 기존 유저의 `PUZZLE_C` 잔액은 배포 시 `PUZZLE_C1`으로 일괄 이전 처리함.

### 5.2 교환 레시피 (Craft Recipe)
- **재료**: C1(1) + C2(1) + J(1) + M(1)
- **결과물**: `GOLD_KEY_TICKET` (1개)
- **로직**: `V2ExchangeService.craft_puzzle_to_gold_key`를 통해 4종 퍼즐을 동시에 소비하고 열쇠를 지급하는 원자적 트랜잭션 수행.

---

## 6. 트러블슈팅 및 사후 분석 (RCA Summary)
과거 발생한 주요 장애의 근본 원인을 기록하여 재발을 방지합니다.

| 이슈 | 근본 원인 (Root Cause) | 해결책 |
| :--- | :--- | :--- |
| **주사위 모달 0P 표시** | `vault_earn` 필드만 참조하여 정책 차단 시 0P로 보임 | `reward_amount` Fallback 로직 도입 및 음수 표시 강화 |
| **복권 수정 400 에러** | Pydantic 필수 필드 제약 조건과 프론트엔드 부분 전송 불일치 | 스키마 Optional 전환 및 부분 업데이트 로직 구현 |
| **퍼즐 조각 미지급** | DB 설정 오류(amount=0) 및 레거시 토큰명(`PUZZLE_C`) 혼선 | DB 마이그레이션(0->1), 토큰명 정규화, 코드 내 조회 로직 통일 |
| **레저 기록 정합성 실패** | Fallback 차감 시 코인/티켓 중복 기록 또는 누락 | 소비 경로 일원화 및 원자적 레저 로깅 보장 |

---

## 7. 기술 검증 체크리스트 (Technical Verification)
모든 게임 패치 적용 시 아래 사항을 기술적으로 검증해야 합니다.

- **[ ] 데이터 흐름**: API 응답의 `vault_earn`과 `game_data`가 UI에서 의도대로 분기 노출되는가?
- **[ ] 레저 정합성**: 티켓 소비 시 `UserGameWalletLedger`에 정확히 1건의 `-1` 기록이 남는가?
- **[ ] 부분 업데이트**: 어드민에서 특정 필드만 수정했을 때 다른 필드가 초기화되지 않는가?
- **[ ] 토큰 정규화**: 새로 추가된 보상이 `GameTokenType` 및 `canonical_enums`와 일치하는가?
- **[ ] 예외 처리**: `reward_amount=0`인 항목이 비즈니스적으로 허용된 것인가, 아니면 Early Return에 의한 누락인가?

---

*본 문서는 Golden V2 게임 엔진의 기술적 깊이를 담은 SoT이며, 모든 엔진 코드 수정 및 API 설계 시 최우선 준거 문서로 사용됩니다.*
