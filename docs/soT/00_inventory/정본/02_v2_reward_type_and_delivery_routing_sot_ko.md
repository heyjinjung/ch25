문서 타입: SoT
버전: v1.0
작성일: 2026-02-07
작성자: GitHub Copilot
대상: BE/FE/기획/운영
상태: SoT

## 1. 목적 (Purpose)
V2 RewardType(입력 계약) 표준 집합과 “지급 라우팅(어디로 적립/저장되는가)” 규칙을 단일 기준으로 확정한다.

## 2. 범위 (Scope)
- RewardType 표준 집합
- RewardType → 실제 지급(금고/지갑/인벤토리) 라우팅
- 번들(BUNDLE/TICKET_BUNDLE) 해석 규칙

## 3. 상위 SoT (References)
- RewardType 표준: docs/SOT/inventory/변경로그/v2_reward_type_standard_sot_ko.md
- RewardType ↔ 지급 경로: docs/SOT/vault/변경로그/v2_reward_mapping_sot_ko.md
- 실제 구현: app/v2/services/reward_service.py
- 저장소 원칙: docs/SOT/inventory/정본/01_v2_economy_asset_storage_sot_ko.md

## 4. SoT: RewardType 표준 집합
- POINT
- CC_POINT
- GAME_XP
- DIAMOND
- TICKET
- BUNDLE
- TICKET_BUNDLE
- NONE

주의:
- RewardType은 “입력 계약”이다. 저장소에 그대로 쌓이는 값이 아니다.

## 5. SoT: RewardType → 지급 경로(라우팅)
아래는 “어디로 지급되는가”에 대한 단일 기준이다.

| RewardType | 지급 경로(SoT) | 실제 저장 | 구현 근거 |
| :--- | :--- | :--- | :--- |
| POINT | 금고포인트 | user.vault_locked_balance | V2RewardService.deliver: POINT → _grant_vault_locked |
| CC_POINT | 금고포인트 | user.vault_locked_balance | V2RewardService.deliver: CC_POINT → _grant_vault_locked |
| GAME_XP | 레벨/시즌 XP | (시즌패스/레벨 테이블) | V2RewardService.deliver: GAME_XP 분기 |
| DIAMOND | 지갑 토큰 | user_game_wallet(token_type=DIAMOND) | V2RewardService.deliver: DIAMOND → grant_ticket(DIAMOND) |
| TICKET | “만능 티켓(입력)” | 구현상 TICKET_BUNDLE로 정규화(티켓 묶음 지급) | mission_service: TICKET → TICKET_BUNDLE / reward_service: BUNDLE,TICKET_BUNDLE 처리 |
| BUNDLE | 복합 지급 | 금고 + 지갑 토큰 묶음 | reward_service: BUNDLE 분기 (vault + bundle_items) |
| TICKET_BUNDLE | 티켓 묶음 지급 | 지갑 토큰 묶음 | reward_service: TICKET_BUNDLE 분기 (bundle_items) |
| NONE | 무지급 | 없음 | no-op |

## 6. 번들 규칙(매우 중요)
- BUNDLE/TICKET_BUNDLE은 “단일 아이템”이 아니라 “다수 지급”을 의미한다.
- reward_amount는 번들 패키지의 ID/등급 역할로 사용될 수 있으며, 실제 지급 아이템 목록은 서버 구현(RewardService)에서 결정된다.
- 따라서 운영/기획에서 번들 의미를 바꿀 경우, 문서와 함께 서버 구현(RewardService)도 동기화되어야 한다.

## 7. 실무 체크리스트(드리프트 방지)
- FE에서 RewardType enum을 변경하면, BE schema(v2_constants/v2_admin_game_config)와 반드시 동기화한다.
- RewardType에 새 값을 추가하면, “지급 경로 표”에 먼저 추가하고, 그 다음 코드(RewardService) 분기를 추가한다.

## 8. 변경 이력
- v1.0 (2026-02-07, GitHub Copilot): 최종 정본 생성(RewardType/라우팅 단일화)
