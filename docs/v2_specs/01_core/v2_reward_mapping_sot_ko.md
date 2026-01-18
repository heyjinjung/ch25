문서 타입: SoT
버전: v1.0
작성일: 2026-01-18
작성자: GitHub Copilot
대상: BE/FE/기획
상태: SoT

## 1. 목적 (Purpose)
V2 보상 타입 ↔ 지급 경로 매핑을 단일 기준으로 확정한다.

## 2. 범위 (Scope)
- reward_type과 지급 경로
- 번들 처리 기준
- **관련 문서**:
    - [금고 용어 SoT](v2_vault_glossary_sot_ko.md) (금고포인트 정의)
    - [강력한 금고 정책 SoT](v2_strict_vault_policy_sot_ko.md) (적립 제한 정책)
    - [RewardType 표준 SoT](v2_reward_type_standard_sot_ko.md)

## 3. 용어 정의 (Definitions)
- 지급 경로: 금고포인트/인벤토리

## 4. SoT: 보상 매핑표
| reward_type | 지급 경로(SoT) | 비고 |
| :--- | :--- | :--- |
| POINT | 금고포인트 user.vault_locked_balance | 기본 경로 ([Vault Glossary](v2_vault_glossary_sot_ko.md) 참조) |
| CC_POINT | 씨씨외부포인트 user.vault_locked_balance | 외부 포인트 |
| GAME_XP | 레벨포인트 level_point | 성장 포인트 |
| DIAMOND | 인벤토리 user_inventory_item | 다이아 |
| TICKET | 인벤토리 user_inventory_item | 만능티켓 |
| BUNDLE | 금고포인트 + 인벤토리 | 패키지 지급 |
| TICKET_BUNDLE | 인벤토리 user_inventory_item | 티켓 묶음 |
| NONE | 없음 | no-op |

## 5. 운영/검증 (QA)
- [ ] 매핑표 외 경로 금지
- [ ] 번들 지급 경로 일치 확인

## 6. 변경 이력
- v1.0 (2026-01-18, GitHub Copilot): 최초 작성
