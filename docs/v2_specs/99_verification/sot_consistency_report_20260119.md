# SoT 논리적 정합성 검증 리포트 (Logical Consistency Report)

**검증 일시**: 2026-01-19
**대상 문서**: `docs/v2_specs/01_core/*.md` (총 21개)

## 1. 검증 요약 (Summary)
**전반적인 논리적 정합성: 양호 (Pass)**
대부분의 문서가 V2의 핵심 철학(금고 SoT, 티켓 Enum, Shop 정책)을 일관되게 반영하고 있습니다. 일부 미세한 용어 불일치는 아래 수정 권고를 통해 해결 가능합니다.

## 2. 주요 정합성 확인 항목 (Key Alignment Checks)

### 2.1 CC 입금 및 금고 정책 (CC Deposit & Vault)
- **일치**: `v2_cc_deposit_sot_ko`의 "Deposit Delta" 로직과 `v2_strict_vault_policy_sot_ko`의 "당일 실질 입금" 정의가 정확히 일치합니다.
- **일치**: `v2_user_sot_ko`와 `v2_cc_deposit_sot_ko` 모두 `CC_id` (또는 `cc_id`)를 외부 식별자로 사용합니다.

### 2.2 보상 및 레벨 (Reward & Level)
- **일치**: `v2_progression_schema_ko`와 `v2_level_point_sot_ko` 모두 `GAME_XP`를 유일한 성장 재화로 정의합니다.
- **일치**: `v2_level_reward_table_sot_ko`의 티켓 보상(`룰렛티켓` 등)이 `v2_ticket_enum_sot_ko` 및 `v2_item_inventory_sot_ko`의 `_TICKET` 표준 명칭을 준수합니다.

### 2.3 상점 및 인벤토리 (Shop & Inventory)
- **일치**: `v2_shop_exchange_policy_sot_ko`에서 구형 키(`GOLD_KEY`)를 `GOLD_KEY_TICKET`으로 정의하여 `v2_ticket_enum_sot_ko`와 일치시켰습니다.

## 3. 수정 권고 사항 (Recommendations)

### 3.1 `CC_DEPOSIT`의 타입 정의 명확화
- **현상**: `v2_cc_deposit_sot_ko`는 `VaultEarnEvent`의 `Type`을 `CC_DEPOSIT`으로 정의하나, `v2_reward_type_standard_sot_ko`에는 `CC_DEPOSIT`이 포함되지 않음.
- **해석**: `CC_DEPOSIT`은 "보상(Reward)"이 아닌 "입금 원천(Source)"이므로 RewardType Enum에 없어도 무방함. 단, `VaultEarnEvent` 구현 시 `source` 필드에 기록하는 것을 권장.
- **조치**: 구현 시 `earn_type="POINT"`, `source="CC_DEPOSIT"` 패턴 적용 (별도 문서 수정 불필요).

### 3.2 레벨 보상 표기 통일
- **현상**: `v2_level_reward_table_sot_ko`에서 "배민 5000"으로 표기된 부분.
- **조치**: `v2_gifticon_naming_sot_ko`의 표준(`GIFTICON_BAEMIN_5000`)으로 명확히 매핑 규칙이 수립됨. 구현 시 해당 표준 Enum으로 변환 필수.

## 4. 결론 (Conclusion)
제공된 SoT 문서들은 서로 **유기적으로 모순 없이 연결**되어 있으며, **V2 구현을 위한 단일 진실 공급원(SoT)으로서 유효**합니다.

- **Vault Integration**: Ready
- **Core Economy**: Ready
- **Level System**: Ready
