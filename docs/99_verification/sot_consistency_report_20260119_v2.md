# SoT 논리적 정합성 2차 검증 리포트 (Core SoT)

**검증 일시**: 2026-01-19
**대상 문서**: `docs/v2_specs/01_core/*.md` (Core SoT)
**범위 제외**: Golden 전용 문서(현재 `docs/v2_specs/07_golden/`로 분리)

---

## 1. 검증 요약 (Summary)
**전반적인 논리적 정합성: 양호 (Pass)**
Core SoT 문서 간 핵심 정책(금고 SoT, RewardType, Ticket Enum, Level Point)이 일관되게 유지되고 있습니다.
단, 명명 규칙/문서 이동 중복 등 **경미한 정리 항목**이 남아 있습니다.

---

## 2. 정합성 체크 (Key Alignment Checks)

### 2.1 금고 SoT 및 입금/출금 정책
- **일치**: `vault_locked_balance` 단일 SoT가 [v2_user_sot_ko.md](../01_core/v2_user_sot_ko.md) / [v2_vault_glossary_sot_ko.md](../01_core/v2_vault_glossary_sot_ko.md) / [v2_strict_vault_policy_sot_ko.md](../01_core/v2_strict_vault_policy_sot_ko.md)에서 동일하게 유지됨.
- **일치**: `cc_deposit`(전일 대비 순증) 정의가 [v2_vault_glossary_sot_ko.md](../01_core/v2_vault_glossary_sot_ko.md)와 [v2_cc_deposit_sot_ko.md](../01_core/v2_cc_deposit_sot_ko.md)에서 일관됨.

### 2.2 RewardType ↔ 지급 경로
- **일치**: RewardType 표준([v2_reward_type_standard_sot_ko.md](../01_core/v2_reward_type_standard_sot_ko.md))과 지급 경로([v2_reward_mapping_sot_ko.md](../01_core/v2_reward_mapping_sot_ko.md))가 동일한 집합을 유지함.

### 2.3 Ticket Enum / 레거시 매핑
- **일치**: 표준 Enum([v2_ticket_enum_sot_ko.md](../01_core/v2_ticket_enum_sot_ko.md))과 코드 매핑([v2_ticket_enum_code_alignment_sot_ko.md](../01_core/v2_ticket_enum_code_alignment_sot_ko.md))이 일관됨.
- **일치**: 인벤토리/아이템 SoT([v2_item_inventory_sot_ko.md](../01_core/v2_item_inventory_sot_ko.md))에서 `_TICKET` 표준 명칭 사용.

### 2.4 레벨 포인트 체계
- **일치**: `GAME_XP` 단일 성장 포인트 정의가 [v2_level_point_sot_ko.md](../01_core/v2_level_point_sot_ko.md) / [v2_level_point_storage_sot_ko.md](../01_core/v2_level_point_storage_sot_ko.md) / [v2_progression_schema_ko.md](../01_core/v2_progression_schema_ko.md)에서 동일함.
- **일치**: CC 입금 기반 레벨 포인트 적립 규칙이 [v2_level_point_extension_sot_ko.md](../01_core/v2_level_point_extension_sot_ko.md)와 [v2_cc_deposit_sot_ko.md](../01_core/v2_cc_deposit_sot_ko.md)에서 합치됨.

### 2.5 Redis 키/채널 표준
- **일치**: Golden V2 prefix 표준(`golden:v2:`)이 [v2_redis_keys_channels_sot_ko.md](../01_core/v2_redis_keys_channels_sot_ko.md)에서 명확히 정의됨.

---

## 3. 이슈 및 수정 권고 (Issues & Recommendations)

1) **문서 꼬리 섹션 마커 제거 필요**
- 대상: [v2_vault_glossary_sot_ko.md](../01_core/v2_vault_glossary_sot_ko.md)
- 현상: 문서 말미에 불필요한 섹션 마커가 존재
- 조치: 제거 완료 (본 작업에서 반영)

2) **CC 식별자 표기 통일 권고**
- 대상: [v2_user_sot_ko.md](../01_core/v2_user_sot_ko.md), [v2_cc_deposit_sot_ko.md](../01_core/v2_cc_deposit_sot_ko.md)
- 현상: `CC_id` vs `cc_id` 표기 혼재
- 권고: 문서 표기 기준을 `cc_id` 또는 `external_id`로 단일화

3) **Golden 문서 중복 경로 정리 필요**
- 대상: [golden_v2_system_definition_ko.md](../01_core/golden_v2_system_definition_ko.md) (중복)
- 현상: Golden 전용 문서가 Core 폴더와 07_golden에 중복 존재
- 권고: Core 폴더 내 중복본 제거 또는 이동 공지로 전환

4) **레벨 보상 표기 ↔ 기프티콘 표준 매핑 주의**
- 대상: [v2_level_reward_table_sot_ko.md](../01_core/v2_level_reward_table_sot_ko.md), [v2_gifticon_naming_sot_ko.md](../01_core/v2_gifticon_naming_sot_ko.md)
- 현상: 보상표의 자연어 표기가 구현 시 표준 item_type으로 매핑 필요
- 권고: 구현 단계에서 `*_GIFTICON_5000` 표준으로 변환

---

## 4. 결론 (Conclusion)
Core SoT는 정책/용어/지급 경로 관점에서 **상호 충돌 없이 일관**되며,
경미한 문서 정리 항목만 처리하면 **2차 검증 기준 Pass** 상태입니다.
